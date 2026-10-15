# ESP32-WROOM-DA · dvě čidla BMP280

Kompletní sketch: `exports/HomeAssistant_ESP32_WROOM_DA_BMP280/HomeAssistant_ESP32_WROOM_DA_BMP280.ino`.
Soukromá kopie má převzatou Wi-Fi, OTA a cloudový token z předchozího exportu. Pokud se token od té doby změnil, musí HOME_CLOUD_TOKEN souhlasit s aktuálním DEVICE_TOKEN na Railway. Heslo webu se do ESP nenahrává.
Veřejná kopie ve `firmware/arduino/HomeAssistant_ESP32_WROOM_DA_BMP280/` nemá skutečná hesla.

## Zapojení

Při vypnutém napájení přepojte původní DHT22 na BMP280 podle tabulky. Nejde o stejné zapojení jako u DHT.

| Vývod čidla | BMP280 uvnitř | BMP280 venku |
|---|---|---|
| VCC | 3V3 | 3V3 |
| GND | GND | GND |
| SDA | GPIO21 | GPIO32 |
| SCL | GPIO22 | GPIO27 |

INA219 může zůstat na GPIO21/22, adresa 0x40. Relé 1 (světlo pod troubou) GPIO26, relé 2 (volné) GPIO33. Obě relé jsou aktivní LOW a při startu vypnutá. GPIO2 a GPIO25 používá WROOM-DA pro přepínání antén; nepřipojujte na ně další zařízení. Volitelné tlačítko je vypnuté.

Čidla používají dvě oddělené I²C sběrnice a mohou mít stejnou adresu. Firmware na každé zkouší 0x76 i 0x77. Čtyřpinové moduly napájejte z 3,3 V, aby sběrnice měla 3,3V logiku. I²C je určené pro krátká propojení; spolehlivost dlouhého vedení k venkovnímu čidlu je nutné ověřit v místě instalace.

## Arduino IDE

1. Nainstalujte balíček **esp32 by Espressif Systems 3.3.8**.
2. Vyberte **ESP32-WROOM-DA Module**, 4 MB flash, PSRAM vypnutá a oddíly **Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)** s OTA.
3. Knihovny: **Adafruit BMP280 Library 2.6.8**, **ArduinoJson 7.4.3**, **Adafruit INA219 1.2.3**, **Adafruit BusIO 1.17.4**, **Adafruit Unified Sensor 1.1.15**.
4. Otevřete pouze kompletní `.ino` v jeho stejnojmenné složce. Žádné další `.h` ani `.cpp` nejsou potřeba.
5. Vyberte port a nahrajte. Nahrání do skutečného ESP provádí uživatel.

## Tablet

- Přehled ukazuje teplotu a **tlak v hPa** uvnitř i venku.
- Historie nabízí teplotu, tlak, solární výkon a energii. Staré záznamy bez tlaku zůstávají bez hodnoty; stará vlhkost se nepřevádí na tlak.
- BMP280 neměří vlhkost. Vlhkost z internetové předpovědi může zůstat v sekci počasí.
- Tlak je skutečně naměřený v nadmořské výšce čidla, nikoli přepočtený na hladinu moře. Nemusí se rovnat předpovědi počasí.
- Místní web na `http://IP-ESP32/` také zobrazuje tlak. Jeho vzhled je zachovaný z místního panelu; Railway používá samostatný vzhled verze 3.
- Místní historie BMP280 používá samostatné soubory, aby se předchozí vlhkost nemohla zaměnit za tlak. Původní záznamy se nemažou.

Generátor: `python scripts/bmp280-firmware.py`; soukromý export: přidejte `--private` (vyžaduje předchozí soukromý export v3). Původní DHT reference zůstává zachovaná.

## Ověření 15. 10. 2026

Web: 33 testů, TypeScript, ESLint a produkční sestavení úspěšné. HTTP test na izolovaném serveru ověřil příjem BMP280 dat a potvrzování obou relé. Nový test ověřuje uchování tlaku v cloudu/historii a skrytí neplatného nebo zastaralého tlaku. Tabletový přehled i historie tlaku byly zkontrolované v 1024 × 600; bez posouvání celé stránky. Snímky v `screenshots/bmp280/` používají simulovaná čidla, nikoli skutečné domácí údaje.

Firmware prošel kompilací pro `esp32:esp32:esp32da`, core 3.3.8. Zabírá přibližně 99 % běžného oddílu programu; před dalším rozšiřováním je nutné ověřit velikost. Do skutečné desky nebyl nahrán. Měření, relé, antény, OTA a délku venkovního kabelu je nutné ověřit na konkrétní instalaci.
