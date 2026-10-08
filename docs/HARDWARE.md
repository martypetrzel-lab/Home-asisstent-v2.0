# Hardware a předpoklady

Cíl je **ESP32-WROOM, esp32dev, 4 MB flash**. Přesná deska a zapojení nejsou fyzicky ověřeny. [Definice cíle PlatformIO](https://docs.platformio.org/en/latest/boards/espressif32/esp32dev.html).

Sestava: dva DHT22, INA219 na solární větvi, existující relé kuchyňských LED, přibližně 10W panel, PWM regulátor, EMOS AGM 12 V / 7 Ah. Napětí světla není známo. TPS2116 3728 je objednaný; převodník 12→5 V, AGM ochrana a jištění nejsou potvrzené.

Původní firmware potvrzuje GPIO27/26/33, I2C21/22 a ACTIVE LOW obou relé; druhé relé zůstává podporované pro kompatibilitu. Externí adaptér 5 V / 3 A je určen pro větev ESP32. Před připojením zátěže ověřte přesnou desku, elektrické chování relé, logiku 3,3 V, bezpečné předpětí vstupu během resetu a parametry kontaktů. U INA219 ověřte adresu, bočník, polohu a směr proudu. Kalibrace knihovny 32V/2A předpokládá 0,1Ω bočník; **nepovoluje překročit 26 V na sběrnici INA219**, ani naprázdno. Tablet má vlastní síťový adaptér.

Bez bateriového měření zůstávají napětí, proud, SOC a nabíjení `null`. Pokračujte přes [GPIO](GPIO.md), [zapojení](WIRING.md), [napájení](POWER.md) a [fyzické testy](TROUBLESHOOTING.md).
