# Arduino IDE: první USB upload a OTA

Jediná implementace je ve složce firmware/arduino/HomeAssistant_ESP32_v2. PlatformIO sestavuje stejný .ino a stejné .cpp/.h. Původní soubor mimo repozitář zůstal nezměněný. Nic se automaticky neflashovalo.

## Příprava Arduino IDE

1. Arduino IDE 2: [oficiální instalace](https://www.arduino.cc/en/software/). Do Additional Boards Manager URLs přidejte https://espressif.github.io/arduino-esp32/package_esp32_index.json.
2. Board Manager → **esp32 by Espressif Systems 3.3.8**. Cíl **ESP32 Dev Module**, WROOM, 4 MB flash, PSRAM Disabled, partition Default 4MB with spiffs (OTA oddíly), monitor 115200. Název schématu obsahuje spiffs, aplikace však datový oddíl připojuje jako LittleFS. Přesnou desku a flash ověřte před uploadem.
3. Library Manager: **ArduinoJson 7.4.3**, **DHT sensor library by Adafruit 1.4.7**, **Adafruit Unified Sensor 1.1.15**, **Adafruit INA219 1.2.3**, **Adafruit BusIO 1.17.4**. WiFi, WebServer, Wire, Preferences, LittleFS, ESPmDNS a ArduinoOTA jsou součástí core.
4. Otevřete firmware/arduino/HomeAssistant_ESP32_v2/HomeAssistant_ESP32_v2.ino. Zachovejte všechny podpůrné soubory a podsložku src/core.
5. Zkopírujte secrets.example.h do **téže složky jako secrets.h**. Vyplňte HOME_WIFI_SSID, HOME_WIFI_PASSWORD a nový náhodný HOME_API_TOKEN nejméně 32 znaků. Git soubor ignoruje. Staré Wi-Fi/OTA/serverové klíče změňte; nepřebírejte zveřejněné hodnoty. Nové klíče lze jednotlivě generovat: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
6. V config.h zkontrolujte piny 27/26/33/21/22 a ACTIVE LOW. Nové DHT17/ST32 ověřte fyzicky. TPS příznaky nechte false, není-li zapojen. Ověřte externí neaktivní předpětí relé, zátěž nejprve odpojte. SolarLocation, kalibraci a směr nastavte podle skutečného měření; bez ověření směru jsou Wh null.
7. Pro **první prázdný LittleFS bez doplňku IDE** nastavte InitializeHistoryOnFirstBoot=true. Jde o výslovné povolení formátování nepřipojitelného filesystemu, pokud dosud není NVS značka inicializace. Po prvním úspěchu se značka uloží a další boot neformátuje. Při dalších aktualizacích vraťte false. Pokud chcete zachránit stará data, volbu nezapínejte, nejprve je exportujte. Bez inicializace fungují senzory/relé i RAM historie, trvalá historie má storageReady=false.

## První nahrání přes USB

1. Připojte USB datovým kabelem bez konfliktu externích napájecích zdrojů. Tools → Port → skutečný port ESP32.
2. Klepněte **Verify / Ověřit**. Teprve po ověření zapojení **Upload / Nahrát**. Pokud deska potřebuje BOOT, postupujte podle výrobce. Běžně ponechte Erase All Flash vypnuté; smazalo by historii/NVS.
3. Serial Monitor 115200 → LAN IP a stav připojení. IP rezervujte v routeru. Ověřte API, čidla a oba GPIO povely nejprve bez zátěže. Tablet připravte podle [TABLET_SETUP](TABLET_SETUP.md).

## OTA v Arduino IDE

V secrets.h nastavte HOME_OTA_ENABLED=true a samostatné HOME_OTA_PASSWORD nejméně 16 znaků; první takovou verzi nahrajte USB. RelayRestoreOnBoot musí zůstat false. IDE → síťový port homeassistant-esp32 → Upload → vlastní OTA heslo. PC a ESP musí být ve stejné důvěryhodné LAN, mDNS/firewall povolovat detekci i přenos. ArduinoOTA autentizuje, nešifruje. Před zápisem vypne obě relé a zamkne povely. Po chybě zůstanou vypnutá do restartu. Boot i OTA vyžadují fyzické ověření.

## Kontroly bez flashování

```sh
arduino-cli compile --fqbn esp32:esp32:esp32 --jobs 4 firmware/arduino/HomeAssistant_ESP32_v2
py -3 -m platformio run -d firmware
npm run test:firmware
```

CLI používá stejný core/knihovny jako IDE. PlatformIO 6.1.19, platform espressif32 7.1.3 používá Arduino 2.0.17; společný zdroj podporuje obě watchdog API. Compile/run nenahrává zařízení. Hostitelské C++ testy potřebují g++ (Linux) nebo ziglang 0.16.0 (Windows).

Alternativa ručního prvního filesystemu: `py -3 -m platformio run -d firmware -t uploadfs --upload-port COM5`, firmware: `py -3 -m platformio run -d firmware -t upload --upload-port COM5`. COM5 nahraďte skutečným portem. **uploadfs smaže historii**, při běžné aktualizaci vynechte.
