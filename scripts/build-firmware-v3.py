"""Vytvoří jeden kompletní sketch z referenční 2.2.3 a cloudového transportu."""
from pathlib import Path
import argparse, gzip, re
root=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser()
args.add_argument('--private-reference',type=Path)
options=args.parse_args()
source=(root/'firmware/reference-v2.2.3/HomeAssistant_ESP32_tablet_primo.ino').read_text(encoding='utf-8')
source=source.replace('2.2.3-direct-tablet','3.0.0-railway')
source=source.replace('Bez garaze a Railway.','Bez garaze. Railway + plny lokalni panel.')
source=source.replace('Internet pouziva jen predpoved pocasi a synchronizace casu.','Cloud pouziva overene HTTPS; lokalni panel zustava dostupny bez internetu.')
source=source.replace('#include <Arduino.h>','#include <Arduino.h>\n#include <HTTPClient.h>\n#include <WiFiClientSecure.h>')
config='\n// Railway nastavení. Token musí souhlasit s DEVICE_TOKEN na serveru.\n#define HOME_CLOUD_ENABLED true\n#define HOME_CLOUD_TOKEN ""\n#define HOME_CLOUD_URL "https://home-asisstent-v20-production.up.railway.app/api/device/sync"\n#define HOME_CLOUD_INTERVAL_MS 2000\n'
source=source.replace('// Complete tablet dashboard stored in flash (gzip).',config+'\n// Complete tablet dashboard stored in flash (gzip).')
source=source.replace('namespace cfg {','namespace cfg {\nconstexpr const char *CloudUrl = HOME_CLOUD_URL;\nconstexpr uint32_t CloudIntervalMs = HOME_CLOUD_INTERVAL_MS;\nstatic_assert(CloudIntervalMs >= 1000 && CloudIntervalMs <= 10000, "Interval synchronizace musi byt 1 az 10 s");',1)
source=source.replace('bool ota = false, storageReady = false;','bool ota = false, storageReady = false;\n  uint64_t cloudLastSuccessMs = 0;\n  int cloudLastStatus = 0;')
source=source.replace('void firmwareSetup();','void cloudTask(void *);\nvoid firmwareSetup();',1)
# Hostname/time validation stays in WiFiClientSecure; certificate verification is never disabled.
ca=(root/'firmware/v3/cloud-ca.h').read_text(encoding='utf-8').replace('#pragma once','')
cloud=re.sub(r'^#include[^\n]*\n','',(root/'firmware/v3/cloud.cpp').read_text(encoding='utf-8'),flags=re.M)
cloud=cloud.replace('if (!HOME_CLOUD_ENABLED || strlen(HOME_CLOUD_TOKEN) < 32 ||','if (!HOME_CLOUD_ENABLED || strlen(HOME_CLOUD_TOKEN) < 32 || !String(cfg::CloudUrl).startsWith("https://") ||')
cloud=cloud.replace('    if (status != 200) {','    xSemaphoreTake(stateMutex, portMAX_DELAY);\n    state.cloudLastStatus = status;\n    if (status == 200) state.cloudLastSuccessMs = monotonicMs();\n    xSemaphoreGive(stateMutex);\n    if (status != 200) {')
cloud=cloud.replace('next = monotonicMs() + 2000;','next = monotonicMs() + cfg::CloudIntervalMs;')
source=source.replace('// ==================== app.cpp ====================',ca+'\n'+cloud+'\n// ==================== app.cpp ====================')
source=source.replace('  apiBegin();','  apiBegin();\n  configASSERT(xTaskCreatePinnedToCore(cloudTask, "cloud", 16384, nullptr, 1, nullptr, 0) == pdPASS);',1)
source=source.replace('  o["hostname"] = cfg::Hostname;','  o["hostname"] = cfg::Hostname;\n  o["cloudEnabled"] = HOME_CLOUD_ENABLED && strlen(HOME_CLOUD_TOKEN) >= 32;\n  o["cloudConnected"] = s.cloudLastSuccessMs && monotonicMs()-s.cloudLastSuccessMs < 15000;\n  o["cloudLastStatus"] = s.cloudLastStatus;\n  if (s.cloudLastSuccessMs) o["cloudLastSyncAgeMs"] = monotonicMs()-s.cloudLastSuccessMs;\n  else o["cloudLastSyncAgeMs"] = nullptr;')
# Serialize local and cloud relay command submission; they share the original GPIO queue.
source=source.replace('static QueueHandle_t commands;','static QueueHandle_t commands;\nstatic SemaphoreHandle_t relayCommandMutex;')
source=source.replace('void relayBegin() {','void relayBegin() {\n  relayCommandMutex=xSemaphoreCreateMutex();\n  configASSERT(relayCommandMutex);')
needle='  auto s = snapshot();\n  if (input["bootId"]'
replacement='  if (xSemaphoreTake(relayCommandMutex, pdMS_TO_TICKS(800)) != pdTRUE)\n    return reject(429, "busy", "Relé zpracovává jiný příkaz.");\n  struct CommandGuard { ~CommandGuard() { xSemaphoreGive(relayCommandMutex); } } guard;\n  auto s = snapshot();\n  if (input["bootId"]'
assert needle in source
source=source.replace(needle,replacement,1)
# Only local same-origin browsers may control the emergency dashboard; no Railway-to-LAN CORS.
source=re.sub(r'(#define HOME_ALLOWED_ORIGIN)\s+"[^"\n]*"',r'\1 ""',source)
match=re.search(r'const uint8_t TABLET_HTML_GZIP\[\] PROGMEM = \{(.*?)\};',source,re.S)
page=gzip.decompress(bytes(int(h,16) for h in re.findall(r'0x([a-fA-F0-9]{2})',match.group(1)))).decode('utf-8')
page=page.replace('<div class="setting"><div>Obnovit měření','<div class="setting"><div>Přenos zápisků na Railway<p>Stáhněte soubor a importujte ho na novém webu v Domácnosti.</p></div><button id="export-household">Export zápisků</button></div><div class="setting"><div>Railway<p id="local-cloud-status">Zjišťuji připojení…</p></div></div><div class="setting"><div>Obnovit měření')
page=page.replace("$('connection').classList.remove('error');", "$('local-cloud-status').textContent=sys.cloudConnected?'Připojeno':(sys.cloudEnabled?'Odpojeno · lokální panel funguje':'Cloud není nastaven');$('connection').classList.remove('error');")
page=page.replace('</script>','\ndocument.getElementById(\'export-household\').addEventListener(\'click\',()=>{try{let id=localStorage.getItem(\'esp32-household-import-id\');if(!id){id=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,\'0\')).join(\'\');localStorage.setItem(\'esp32-household-import-id\',id);}const value={format:\'home-assistant-household-v1\',importId:id,notes:JSON.parse(localStorage.getItem(\'esp32-house-notes\')||\'""\'),tasks:JSON.parse(localStorage.getItem(\'esp32-house-tasks\')||\'[]\'),shopping:[],timer:JSON.parse(localStorage.getItem(\'esp32-kitchen-timer\')||\'null\')};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:\'application/json\'})),link=document.createElement(\'a\');link.href=url;link.download=\'domacnost-zaloha.json\';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast(\'Export se nepodařil. Zkontrolujte dostupnost úložiště.\');}});\n</script>')
packed=gzip.compress(page.encode('utf-8'),compresslevel=9,mtime=0)
array='const uint8_t TABLET_HTML_GZIP[] PROGMEM = {\n'+ '\n'.join('  '+','.join('0x%02x'%b for b in packed[i:i+20])+',' for i in range(0,len(packed),20))+'\n};'
source=source[:match.start()]+array+source[match.end():]
out=root/'firmware/arduino/HomeAssistant_ESP32_v3_0_0';out.mkdir(exist_ok=True)
(out/'HomeAssistant_ESP32_v3_0_0.ino').write_text(source,encoding='utf-8')
if options.private_reference:
    private=options.private_reference.read_text(encoding='utf-8')
    for name in ['HOME_WIFI_SSID','HOME_WIFI_PASSWORD','HOME_API_TOKEN','HOME_OTA_PASSWORD']:
        line=re.search(r'^#define '+name+r'\s+"[^"\n]*"',private,re.M)
        if line:source=re.sub(r'^#define '+name+r'\s+"[^"\n]*"',lambda _:line.group(0),source,flags=re.M)
    values=dict(re.findall(r'^(\w+)=(.*)$',(root/'exports/RAILWAY_VARIABLES.env').read_text(encoding='utf-8'),re.M))
    source=source.replace('#define HOME_CLOUD_TOKEN ""','#define HOME_CLOUD_TOKEN "'+values['DEVICE_TOKEN']+'"')
    out=root/'exports/HomeAssistant_ESP32_v3_0_0';out.mkdir(exist_ok=True)
    (out/'HomeAssistant_ESP32_v3_0_0.ino').write_text(source,encoding='utf-8')
print('Kompletní firmware:',out/'HomeAssistant_ESP32_v3_0_0.ino')
