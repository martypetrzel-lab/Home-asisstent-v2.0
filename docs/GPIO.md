# GPIO – zachované zapojení v1.8.10

Jediná konfigurace: `firmware/arduino/HomeAssistant_ESP32_v2/config.h`.

| GPIO | Funkce | Původ / výchozí stav |
|---|---|---|
|27|Vnitřní DHT22 DATA|původní čidlo, zachováno|
|17|Venkovní DHT22 DATA|nové, ověřit fyzicky|
|26|Relé 1 – LED osvětlení nad troubou|původní, ACTIVE LOW|
|33|Relé 2 – druhý kanál|původní, ACTIVE LOW|
|21|INA219 SDA|původní, zachováno|
|22|INA219 SCL|původní, zachováno|
|32|Volitelné TPS2116 ST|nové, TpsStatusInstalled=false|
|25|Volitelné tlačítko pro relé 1|neinstalované, ButtonInstalled=false|

GPIO17 a GPIO32 jsou vyvedené I/O modulu WROOM podle [datasheetu Espressif](https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html). Dostupnost na konkrétní vývojové desce a nepřítomnost jiné periferie musí být ověřena fyzicky. U variant s PSRAM nelze automaticky převzít GPIO16/17. Původní čidlo ani relé se nepřepojují. GPIO33 není pro TPS.

`RelayActiveLevel=0` zachovává ACTIVE LOW původního zdroje. Oba výstupy dostanou HIGH před pinMode OUTPUT a po něm. -1 volitelně zakazuje řízení, 1 je pouze pro ověřený ACTIVE HIGH modul. Během resetu před spuštěním firmware bezpečný stav zajišťuje externí neaktivní předpětí.

Obě relé startují vypnutá. RelayRestoreOnBoot=false a RelaySafetyConfirmed=false brání obnovení uloženého ON bez ověření. Obnova vyžaduje potvrzené elektrické chování, nelze ji kombinovat s OTA. NVS ukládá stabilní stav každého kanálu po 30 s. Časovač ve webu je pouze demo.

Kompilace hlídá kolize pinů a kritické bootovací piny relé. Nepoužívejte pro relé GPIO0/2/5/12/15, vstupní 34–39 ani flash 6–11. DHT interval 5 s, debounce tlačítka 50 ms, ST 250 ms.
