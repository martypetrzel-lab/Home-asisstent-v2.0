# Nasazení a aktualizace Home Assistant 3.0

## Railway

Používá se existující služba `Home-asisstent-v2.0` projektu `friendly-balance` a adresa https://home-asisstent-v20-production.up.railway.app. Build: `npm run build`. Start: `npm run start:railway`. Healthcheck: `/api/health`. Node 24. Jedna replika, vypnuté uspávání služby. Připojený volume `/data` se nemaže ani neformátuje; aplikace přidává tabulky do stávající databáze.

Proměnné: `ESP32_TRANSPORT=cloud`, `DEVICE_ID=homeassistant-esp32`, `DEVICE_TOKEN` (alespoň 32 znaků), `DASHBOARD_PASSWORD` (alespoň 16), `SESSION_SECRET` (alespoň 32, odlišný), `DASHBOARD_ORIGIN=https://home-asisstent-v20-production.up.railway.app`, `CLOUD_DATA_DIR=/data`, `RAILPACK_NODE_VERSION=24`, `NEXT_PUBLIC_ESP32_API_URL` prázdné. Start odmítne neúplnou konfiguraci nebo chybějící Railway volume. Šablona je `.env.example`. Skutečné hodnoty jsou pouze v Railway a ignorovaném `exports/RAILWAY_VARIABLES.env`.

Trvalý volume uchovává historii a zápisky přes nasazení: [Railway Volumes](https://docs.railway.com/volumes/reference). U služby s volume není více replik a nasazení může krátce přerušit web; lokální ESP32 běží nezávisle.

## Jeden Arduino soubor

Veřejný kompletní firmware bez tajemství: `firmware/arduino/HomeAssistant_ESP32_v3_0_0/HomeAssistant_ESP32_v3_0_0.ino`.

Soukromá připravená kopie se zachovanou Wi-Fi a OTA a aktuálním cloudovým klíčem: `exports/HomeAssistant_ESP32_v3_0_0/HomeAssistant_ESP32_v3_0_0.ino`. Tuto kopii otevřete v Arduino IDE. Původní 2.2.3 zůstává nedotčená mimo repozitář. Všechny vlastní moduly i HTML jsou v jediném souboru.

Deska ESP32 Dev Module/WROOM, Espressif core 3.3.8, 4 MB Default oddíly s OTA, PSRAM vypnutá. Knihovny: ArduinoJson 7.4.3, DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15, INA219 1.2.3, BusIO 1.17.4. GPIO26 světlo pod troubou, GPIO33 rezerva, DHT27/32, SDA21/SCL22. Obě relé ACTIVE LOW, start OFF. Nezapínejte RelayRestoreOnBoot.

Nahrání provede uživatel ručně. Poté v Serial Monitoru 115200 zkontroluje LAN IP, na lokálním panelu v Nastavení stav Railway a na Railway aktuální firmware 3.0.0. Při 401 nesouhlasí DEVICE_TOKEN; záporný stav bývá TLS/síť. Bez NTP času cloud nezačne. Certifikát se nikdy neobchází přes setInsecure.

## Přesun poznámek

Po ručním nahrání v3 otevřete na stejném tabletu původní adresu ESP32 ve stejném prohlížeči. Nastavení → Export zápisků stáhne JSON včetně poznámek, úkolů a uloženého časovače. Import na Railway v Nastavení doplní sdílená data. Opakování stejného importId nepřidá duplicity. Původní browser data se nemažou. Export uchovejte jako zálohu. Pokud se IP změnila, nejprve zachraňte úložiště na původní adrese; prohlížeče data mezi adresami nesdílejí.

## Tablet

Otevřete Railway HTTPS, přihlaste se heslem panelu a zapněte celou obrazovku. Primární rozlišení 1280 × 800 a 1024 × 600 jsou CSS rozměry dostupného viewportu. Telefon může posouvat stránku. Hodiny: ručně Hodiny, automaticky 22–5 Europe/Prague, dotyk vrátí panel a po 60 s nečinnosti v noci znovu hodiny. Automatický režim skončí 5:00, ruční do dotyku. Web nedokáže probudit tablet uspaný Androidem; pro budík/časovač nechte stránku otevřenou a tablet vzhůru.

## Ověření po ručním nahrání

1. Po restartu jsou obě relé vypnutá; čidla ukazují skutečné hodnoty.
2. Railway přijímá měření a zobrazuje nový firmware a čerstvou synchronizaci.
3. Každé relé vyzkoušejte z tabletu, počkejte na GPIO potvrzení a fyzicky zkontrolujte připojené zařízení.
4. Při výpadku internetu cloud ovládání znepřístupní, lokální panel a měření pokračují; po návratu se staré povely nevykonají.
5. Ověřte restart Railway: zápisky a historie zůstanou. Zkontrolujte noční hodiny na konkrétním Androidu.
6. Směr INA219 potvrďte teprve podle skutečného zapojení. Do té doby je Wh neověřené; záporný proud se neskrývá.
