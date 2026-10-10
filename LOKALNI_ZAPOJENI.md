# ESP32 pro váš lokální Home Assistant

Připraveno podle původního sketche v1.8.24 a API nového webu. Původní sketch nebyl změněn. Nová verze je samostatná složka Arduino projektu; nestačí zkopírovat jen `.ino`.

## Zapojení

| Funkce | Původní a nové zapojení |
| --- | --- |
| Relé 1 – světlo pod troubou | GPIO26 / IN1, ACTIVE LOW |
| Relé 2 – volné | GPIO33 / IN2, ACTIVE LOW |
| Vnitřní DHT22 | GPIO27 |
| Venkovní DHT22 | GPIO32 |
| INA219 | SDA21, SCL22, adresa 0x40 |

Obě relé startují vypnutá. Relé 2 nemá přiřazené kuchyňské osvětlení, automatiku ani plán; lze jej použít jako rezervní výstup přes API `/api/relays/2`. Web ovládá světlo pod troubou. Firmware neobsahuje garážový rozvaděč, garážovou LED, ventilátor, PIR, garážový Wi-Fi bridge ani odesílání na Railway.

## Nahrání ESP32

1. V Arduino IDE otevřete `C:\Users\marty\Documents\Arduino\HomeAssistant_ESP32_v2\HomeAssistant_ESP32_v2.ino`. Všechny soubory `.h`, `.cpp` a podsložku `src` ponechte pohromadě.
2. Nastavte **ESP32 Dev Module**, core Espressif **3.3.8**, 4 MB a oddíly s OTA (Default 4MB with spiffs). Jde o cíl sestavení; konkrétní desku nastavte podle svého ESP32. Knihovny: ArduinoJson 7.4.3, DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15, INA219 1.2.3, BusIO 1.17.4.
3. Soubor `secrets.h` již obsahuje Wi-Fi ze starého sketche a nové API/OTA přístupy. První nahrání této verze proveďte přes USB. Nic nebylo automaticky nahráno do desky.
4. V Serial Monitoru 115200 zjistěte řádek **LAN IP**. Tuto IP doporučuji rezervovat v routeru. OTA zůstává dostupné pod názvem `homeassistant-esp32` a novým heslem ze `secrets.h`.

## Web na lokální IP

Komunikace je **tablet → web na počítači → ESP32**. Do ESP32 se IP webu nezadává. Počítač s webem musí zůstat zapnutý a mít přístup k ESP32.

1. Otevřete `.env.local` ve složce tohoto webu. V `ESP32_API_URL` nahraďte výchozí `http://homeassistant-esp32.local/api` skutečnou adresou, například `http://192.168.1.50/api`. Příklad není zjištěná IP vašeho zařízení. API token už souhlasí s `secrets.h`.
2. `ESP32_TRANSPORT=local` ponechte. `NEXT_PUBLIC_ESP32_API_URL` i `DASHBOARD_ORIGIN` ponechte prázdné pro běžné lokální použití. Heslo pro přihlášení je v `DASHBOARD_PASSWORD`.
3. Spusťte `SPUSTIT_LOKALNE.cmd` v této složce. Web naslouchá na portu 3000. Pokud systém požádá o přístup aplikace k síti, povolte domácí privátní síť. Po změně `.env.local` web znovu spusťte.
4. Na tabletu otevřete `http://IP-POCITACE:3000`. V Nastavení nechte **Adresu API prázdnou**, přihlaste se heslem `DASHBOARD_PASSWORD` a zapněte **Živý režim**. Nepište IP ESP32 do adresního pole prohlížeče jako adresu nového webu.

Lokální HTTP je podporované pro ovládání, včetně tvorby identifikátoru relé bez `crypto.randomUUID`. Instalace PWA do tabletu může vyžadovat místní HTTPS; běžné otevření stránky přes HTTP IP ho nepotřebuje.

## Zachované měření a omezení

Oba DHT22 a INA219 zůstávají. Počasí nyní načítá web; pro něj a pro veřejné časové servery je potřeba internet. Lokální relé a aktuální měření internet nevyžadují.

Nový firmware nepoužívá absolutní hodnotu proudu jako původní sketch. `SolarDirectionConfirmed=false` ponechává denní/celkovou energii v Wh nedostupnou, dokud podle skutečného směru INA219 neověříte `SolarCurrentSign` a nenastavíte `SolarDirectionConfirmed=true` v `config.h`. Napětí, proud a výkon fungují i před tímto potvrzením. Neověřený směr nelze bezpečně převzít ze starého `abs(currentMa)`.

Trvalá historie má výchozí `InitializeHistoryOnFirstBoot=false`; bez připraveného LittleFS běží historie v RAM. Podrobnosti případné první inicializace jsou v `docs/FLASHING.md`. Čidla i ovládání relé tím nejsou blokované.

Soubor `.env.local` a `secrets.h` obsahují skutečné přístupové údaje. Uchovejte je soukromé. Nové soubory v repozitáři ani žádné změny nebyly odeslány na GitHub.
