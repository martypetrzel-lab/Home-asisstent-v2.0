# ESP32 → Railway → tablet

ESP32 se samo připojuje přes Wi-Fi k internetu a přibližně každé 2 sekundy posílá stav na:

`https://home-asisstent-v20-production.up.railway.app/api/device/sync`

Tablet otevírá [váš dashboard](https://home-asisstent-v20-production.up.railway.app/). Domácí počítač nemusí běžet a v routeru není třeba otevírat porty. ESP32 potřebuje internet a dostupný NTP pro správný čas a ověření HTTPS.

## 1. Nastavení služby Railway

Ve službě připojené k tomuto GitHub repozitáři použijte větev `main`, kořen projektu a jednu repliku. Build je `npm run build`, start `npm start`. Vypněte uspávání služby (Serverless), aby první připojení po nečinnosti nečekalo na start serveru.

Připojte ke službě **Volume**, mount path **`/data`**. Uchovává databázi `home.sqlite` včetně historie a stavů příkazů přes restart/nasazení. Bez volume data při novém nasazení zaniknou. SQLite je určeno pro jednu repliku. [Oficiální návod Railway k volumes](https://docs.railway.com/volumes).

Do **Variables → RAW Editor** vložte soukromé hodnoty ze souboru `exports/RAILWAY_VARIABLES.env`, pokud byl připraven pro toto zařízení. Obecná podoba:

```dotenv
ESP32_TRANSPORT=cloud
DEVICE_ID=homeassistant-esp32
DEVICE_TOKEN=VLASTNI_NAHODNY_KLIC_ALESPON_32_ZNAKU
CLOUD_DATA_DIR=/data
DASHBOARD_PASSWORD=VLASTNI_HESLO_ALESPON_16_ZNAKU
SESSION_SECRET=JINE_NAHODNE_TAJEMSTVI_ALESPON_32_ZNAKU
DASHBOARD_ORIGIN=https://home-asisstent-v20-production.up.railway.app
RAILPACK_NODE_VERSION=24
NEXT_PUBLIC_ESP32_API_URL=
```

`DEVICE_TOKEN` musí přesně souhlasit s `HOME_CLOUD_TOKEN` v ESP32. `DASHBOARD_PASSWORD` slouží pro přihlášení na tabletu, `SESSION_SECRET` jen pro podpis přihlášení. Tyto tři hodnoty jsou odlišné. Nepřidávejte je do GitHubu. `ESP32_API_URL` a `ESP32_API_TOKEN` se v cloudovém režimu nepoužívají. Po změnách proveďte deploy.

## 2. Nahrání ESP32

Samostatný kompletní soubor je `exports/HomeAssistant_ESP32_v2_full/HomeAssistant_ESP32_v2_full.ino`. Na začátku vyplňte `HOME_WIFI_SSID` a `HOME_WIFI_PASSWORD`. `HOME_CLOUD_ENABLED` ponechte `true`, cloudový token nastavte shodně s Railway. V připravené soukromé kopii už token může být vyplněný. Adresa Railway je v `cfg::CloudUrl` již nastavena.

Deska: **ESP32 Dev Module**, ESP32 core **3.3.8**, WROOM 4 MB, PSRAM Disabled, Default 4MB with spiffs. Knihovny: ArduinoJson 7.4.3, DHT sensor library 1.4.7, Adafruit INA219 1.2.3, Adafruit Unified Sensor 1.1.15, Adafruit BusIO 1.17.4. Otevřete celý export, vyberte USB port, ověřte a nahrajte. [Podrobnosti a piny](FLASHING.md).

Pro cloud může `HOME_API_TOKEN` zůstat prázdný; místní HTTP API pak zůstane zamčené. Pro samostatný přístup z LAN nastavte jiný lokální token. Obě relé po startu zůstávají vypnutá. Ověřte zapojení před připojením zátěže. OTA, tlačítko a TPS jsou ve výchozím stavu vypnuté.

## 3. Tablet

Otevřete **https://home-asisstent-v20-production.up.railway.app/**. V **Nastavení** zvolte **Živý režim**, adresu ESP32 API ponechte **prázdnou**, uložte připojení a přihlaste se heslem `DASHBOARD_PASSWORD`. Nový prohlížeč se při `ESP32_TRANSPORT=cloud` přepne do živého režimu automaticky; dříve uložená volba režimu se zachovává.

Zapněte **Režim tabletu**, otočte tablet na šířku a případně přidejte stránku na domovskou obrazovku. Kiosk a uspávání displeje nastavte podle [tabletového návodu](TABLET_SETUP.md). Tablet může být i v jiné síti než ESP32, pokud oba mají internet. Přihlášení platí 12 hodin, potom je potřeba znovu zadat heslo.

## Chování a ověření

- HTTPS ověřuje certifikát serveru pomocí ISRG Root X1/X2. Firmware nepoužívá `setInsecure`. Při změně certifikační autority domény je třeba aktualizovat trust anchors ve firmwaru.
- Po 15 sekundách bez nového push je zařízení nedostupné. Každý senzor má navíc vlastní stáří, takže pravidelný push nezmění staré měření na čerstvé.
- Historie na Railway ukládá jeden skutečný vzorek za 5 minut, maximálně 288 vzorků a 48 událostí. Mezery při odpojení se nedoplňují; data LittleFS se zpětně nesynchronizují. Události používají čas přijetí serverem, měření čas ESP32.
- Povel relé má platnost nejvýše 10 sekund, patří konkrétnímu startu ESP32 a očekávané verzi relé. Úspěch se vrací po GPIO ACK. Po 6 sekundách bez potvrzení web upozorní na nejistý výsledek; načtěte nový stav. GPIO potvrzení neověřuje kontakty ani skutečný svit lampy.
- HTTP příjem je chráněn klíčem zařízení, pro čtení a ovládání z tabletu je nutné přihlášení. Klíč zařízení se do prohlížeče neposílá.
- Cloudový úkol běží odděleně od měření a GPIO. Při síťové chybě opakuje spojení s prodlevou až 60 sekund. V Serial Monitoru 115200 se při chybě zobrazí HTTP/TLS kód, nikoli klíče: 401 znamená neshodu tokenu, 503 nenastavený cloud na serveru, záporný kód obvykle síť/TLS.

Software byl ověřen lokálními testy a kompilací. Fyzické měření a přenos z vašeho ESP32 ověříte až po nastavení Railway a nahrání firmwaru. Veřejná stránka sama o sobě neprokazuje přítomnost fyzického zařízení.
