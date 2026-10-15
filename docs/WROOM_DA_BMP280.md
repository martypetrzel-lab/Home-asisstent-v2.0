# ESP32-WROOM-DA · BMP280 uvnitř a DHT22 venku

Aktuální varianta podle upřesnění z 15. 10. 2026: **uvnitř BMP280, venku ponechat původní DHT22**.

Kompletní soukromý sketch: `exports/HomeAssistant_ESP32_WROOM_DA_BMP280_DHT22/HomeAssistant_ESP32_WROOM_DA_BMP280_DHT22.ino`.
Má převzatou Wi-Fi, OTA a cloudový token z předchozího exportu. Správnost tokenu proti Railway byla ověřena bez vložení telemetrie či povelů. Heslo webu se do ESP nenahrává. Veřejná kopie ve `firmware/arduino/HomeAssistant_ESP32_WROOM_DA_BMP280_DHT22/` neobsahuje skutečná hesla.

## Zapojení

| Čidlo | Vývod | ESP32 |
|---|---|---|
| BMP280 uvnitř | VCC | 3V3 |
| BMP280 uvnitř | GND | GND |
| BMP280 uvnitř | SDA | GPIO21 |
| BMP280 uvnitř | SCL | GPIO22 |
| DHT22 venku | DATA | GPIO32 (původní pin) |
| DHT22 venku | VCC / GND | 3V3 / GND |

BMP280 na I²C zkouší adresy 0x76 i 0x77. INA219 zůstává na SDA21/SCL22, adresa 0x40. GPIO27 se pro čidla nepoužívá. U samostatného DHT22 bez modulu musí být mezi DATA a 3V3 pull-up 4,7–10 kΩ; původní funkční zapojení venkovního čidla lze zachovat.

Relé 1 (světlo pod troubou) GPIO26, relé 2 (volné) GPIO33. Obě aktivní LOW, při startu vypnutá. GPIO2 a GPIO25 používá WROOM-DA pro antény. Volitelné tlačítko je vypnuté, rezervovaný pin GPIO23.

## Arduino IDE

1. Balíček **esp32 by Espressif Systems 3.3.8**.
2. Deska **ESP32-WROOM-DA Module**, flash 4 MB, PSRAM vypnutá. Oddíly s OTA podle výsledku kompilace níže.
3. Knihovny: **Adafruit BMP280 Library 2.6.8**, **DHT sensor library 1.4.7**, **ArduinoJson 7.4.3**, **Adafruit INA219 1.2.3**, **Adafruit BusIO 1.17.4**, **Adafruit Unified Sensor 1.1.15**.
4. Otevřete kompletní `.ino` v jeho stejnojmenné složce. Žádné další `.h`, `.cpp` ani HTML nejsou potřeba.
5. Vyberte port a nahrajte ručně. Automatické nahrání do desky neproběhlo.

## Tablet a místní web

- Uvnitř: teplota °C/°F a tlak hPa z BMP280. BMP280 neměří vlhkost.
- Venku: teplota °C/°F a vlhkost % z DHT22. DHT22 neměří tlak.
- Historie: teplota obou čidel, tlak uvnitř, vlhkost venku, solární výkon a energie.
- Staré záznamy bez tlaku se nepřevádějí z vlhkosti. Místní historie má samostatné soubory, původní záznamy se nemažou.
- Tlak je naměřený v místě čidla, bez přepočtu na hladinu moře.
- Místní panel `http://IP-ESP32/` rovněž ukazuje uvnitř tlak a venku vlhkost. Railway používá samostatný vzhled verze 3.

Generátor: `python scripts/bmp280-firmware.py`; soukromý export přidáním `--private` (vyžaduje předchozí soukromý export v3). Původní DHT reference zůstává zachovaná.

## Ověření

33 testů, TypeScript, ESLint a produkční sestavení webu. Test ukládání ověřuje tlak BMP280 i venkovní vlhkost DHT22 a skrytí zastaralých hodnot. HTTP test používá simulovaná čidla a potvrzení obou relé. Snímky v `screenshots/bmp280/` používají simulovaná domácí data.

Skutečná čidla, relé, dynamická paměť při TLS, antény a OTA je nutné ověřit na fyzickém zařízení. Firmware nebyl do ESP32 nahrán.
