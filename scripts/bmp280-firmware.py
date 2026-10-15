"""Build WROOM-DA with indoor BMP280 and outdoor DHT22."""
from pathlib import Path
import argparse, gzip, re

parser = argparse.ArgumentParser()
parser.add_argument('--private', action='store_true')
options = parser.parse_args()

root = Path(__file__).resolve().parents[1]
source = (root/'firmware/arduino/HomeAssistant_ESP32_v3_0_0/HomeAssistant_ESP32_v3_0_0.ino').read_text(encoding='utf8')
source = source.replace('3.0.0-railway', '3.1.1-bmp280-dht22')
source = source.replace('#include <DHT.h>', '#include <DHT.h>\n#include <Adafruit_BMP280.h>')
source = source.replace('Button = 25', 'Button = 23') # GPIO25 belongs to the WROOM-DA antenna switch.
source = source.replace('ESP32 Dev Module, core Espressif', 'ESP32-WROOM-DA Module, core Espressif')
source = source.replace('float temperature = missing(), humidity = missing(), minimum = missing(),', 'bool pressureSensor = false;\n  float pressure = missing();\n  float temperature = missing(), humidity = missing(), minimum = missing(),')
source = source.replace('  void read(float t, float h, uint64_t now) {', '''  void readPressure(float t, float p, uint64_t now) {
    pressureSensor = true;
    valid = std::isfinite(t) && t >= -40 && t <= 85 &&
            std::isfinite(p) && p >= 300 && p <= 1100;
    humidity = missing();
    if (!valid) { temperature = pressure = missing(); ++errors; return; }
    temperature = t; pressure = p; lastSuccessMs = now;
    if (!std::isfinite(minimum) || t < minimum) minimum = t;
    if (!std::isfinite(maximum) || t > maximum) maximum = t;
  }
  void read(float t, float h, uint64_t now) {''')
source = source.replace('  jsonNumber(o["humidityPct"], valid ? c.humidity : missing());', '  o["sensorModel"] = c.pressureSensor ? "BMP280" : "DHT22";\n  jsonNumber(o["pressureHpa"], valid ? c.pressure : missing());\n  jsonNumber(o["humidityPct"], valid ? c.humidity : missing());')
source = source.replace('static DHT indoor(cfg::IndoorDht, DHT22), outdoor(cfg::OutdoorDht, DHT22);', '''static Adafruit_BMP280 indoor(&Wire);
static DHT outdoor(cfg::OutdoorDht, DHT22);
static bool indoorReady = false;
static bool beginBmp(Adafruit_BMP280 &bmp) {
  if (!bmp.begin(0x76) && !bmp.begin(0x77)) return false;
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);
  return true;
}''')
source = source.replace('  indoor.begin();\n', '')
source = source.replace('    in.read(indoor.readTemperature(), indoor.readHumidity(), now);\n    out.read(outdoor.readTemperature(), outdoor.readHumidity(), now);', '''    if (!indoorReady) indoorReady = beginBmp(indoor);
    in.readPressure(indoorReady ? indoor.readTemperature() : logic::missing(),
                    indoorReady ? indoor.readPressure()/100.0f : logic::missing(), now);
    out.read(outdoor.readTemperature(), outdoor.readHumidity(), now);
    indoorReady = in.valid;''')
# Keep binary field widths but use distinct archive filenames to avoid interpreting old humidity as pressure.
source = source.replace('s.indoor.humidity', 's.indoor.pressure')
source = source.replace('o["indoorHumidity"]', 'o["indoorPressure"]')
source = source.replace('/history0.bin', '/mixed-history0.bin').replace('/history1.bin', '/mixed-history1.bin')
source = source.replace('Vnitřní DHT22', 'Vnitřní BMP280').replace('vnitřního DHT22', 'vnitřního BMP280')
source = source.replace('DHT sensor library 1.4.7,', 'DHT sensor library 1.4.7, Adafruit BMP280 Library 2.6.8,')
source = source.replace('DHT22 uvnitr GPIO27, venku GPIO32; INA219 SDA21 / SCL22.', 'BMP280 uvnitr SDA21/SCL22; DHT22 venku DATA32; INA219 SDA21/SCL22.')
source = '/* ESP32-WROOM-DA: indoor BMP280 SDA21/SCL22; outdoor DHT22 DATA32.\nRelays: 26/33 active LOW. INA219 shares the BMP280 bus. Pressure is station pressure, hPa.\nSelect ESP32-WROOM-DA Module, 4MB, PSRAM disabled, OTA partition.\n*/\n' + source
match = re.search(r'const uint8_t TABLET_HTML_GZIP\[\] PROGMEM = \{(.*?)\};', source, re.S)
page = gzip.decompress(bytes(int(x,16) for x in re.findall(r'0x([a-fA-F0-9]{2})', match[1]))).decode()
for name in ['indoor']:
    page = page.replace(f'<small>Vlhkost</small><strong><span data-field="{name}-hum">—</span> %', f'<small>Tlak · BMP280</small><strong><span data-field="{name}-hum">—</span> hPa')
page = page.replace('nf(valid?v.humidityPct:null,0)', "nf(valid?(name==='indoor'?v.pressureHpa:v.humidityPct):null,name==='indoor'?1:0)")
packed = gzip.compress(page.encode(), compresslevel=9, mtime=0)
array = 'const uint8_t TABLET_HTML_GZIP[] PROGMEM = {\n' + '\n'.join('  '+','.join('0x%02x'%b for b in packed[i:i+20])+',' for i in range(0,len(packed),20))+'\n};'
source = source[:match.start()] + array + source[match.end():]
name = 'HomeAssistant_ESP32_WROOM_DA_BMP280_DHT22'
out = root/'firmware/arduino'/name
out.mkdir(exist_ok=True)
(out/(name+'.ino')).write_text(source, encoding='utf8')
# Preserve existing private installation settings locally, never in the public sketch.
if options.private:
    private = (root/'exports/HomeAssistant_ESP32_v3_0_0/HomeAssistant_ESP32_v3_0_0.ino').read_text(encoding='utf8')
    for key in ['HOME_WIFI_SSID','HOME_WIFI_PASSWORD','HOME_API_TOKEN','HOME_OTA_PASSWORD','HOME_CLOUD_TOKEN']:
        value = re.search(r'^#define '+key+r'\s+"[^"\n]*"', private, re.M)
        if value: source = re.sub(r'^#define '+key+r'\s+"[^"\n]*"', lambda _:value[0], source, flags=re.M)
    out = root/'exports'/name
    out.mkdir(exist_ok=True)
    (out/(name+'.ino')).write_text(source, encoding='utf8')
print('Complete BMP280 sketch generated.')
