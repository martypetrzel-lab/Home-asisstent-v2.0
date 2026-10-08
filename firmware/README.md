# Firmware Home Assistant ESP32 v2

Otevřete [HomeAssistant_ESP32_v2.ino](arduino/HomeAssistant_ESP32_v2/HomeAssistant_ESP32_v2.ino) v Arduino IDE spolu s celou složkou. .ino volá společnou aplikaci v app.cpp; další moduly jsou senzory, dvě relé, API, síť/OTA a historie. PlatformIO používá tuto stejnou složku, žádnou druhou implementaci.

Cíle: Arduino IDE/CLI **ESP32 Dev Module, core 3.3.8**, WROOM 4 MB; PlatformIO esp32dev s core 2.0.17. Knihovny: ArduinoJson 7.4.3, Adafruit DHT 1.4.7, Unified Sensor 1.1.15, INA219 1.2.3, BusIO 1.17.4. WiFi/WebServer/Wire/Preferences/LittleFS/ArduinoOTA/ESPmDNS jsou součástí core.

Hardware nastavuje config.h. Wi-Fi, API klíč a OTA heslo patří do ignorovaného secrets.h, vzor je secrets.example.h. Původní DHT27, relé26/33 ACTIVE LOW a I²C21/22 jsou zachované. Nové DHT17 a ST32 ověřte. Relé startují vypnutá; obnova ON není výchozí povolena.

Postup Library Manageru, USB, LittleFS a OTA: [FLASHING](../docs/FLASHING.md). Zapojení: [GPIO](../docs/GPIO.md), [WIRING](../docs/WIRING.md). Kontrakt: [API](../docs/API.md). Původní systém a změny: [MIGRACE](../docs/MIGRACE.md).

Žádný fyzický test ani automatický upload nebyl proveden. Neověřený směr proudu blokuje energii; bateriová měření jsou null. Tablet je napájen nezávisle.

Pro úplný firmware v jediném souboru spusťte z kořene projektu `node scripts/export-firmware.mjs`. Vytvoří `exports/HomeAssistant_ESP32_v2_full/HomeAssistant_ESP32_v2_full.ino` se všemi moduly a prázdnými přístupovými údaji. Otevřete jej samostatně v Arduino IDE; nevkládejte do modulární složky, vznikly by duplicitní definice. Export je generovaný ze stejné implementace a nikdy nečte místní secrets.h. Vyplňte vlastní údaje v jeho úvodu. Složka exports je ignorovaná Gitem, aby se pozdější vyplněná hesla necommitovala.

## Railway cloud

Firmware supports outbound verified HTTPS sync and GPIO-confirmed relay commands. See [Railway setup](../docs/RAILWAY.md). Set HOME_CLOUD_TOKEN equal to Railway DEVICE_TOKEN. HOME_API_TOKEN is only needed for the optional local HTTP API.
