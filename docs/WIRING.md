# Zapojení – návrh k ověření

Zapojovat bez napájení. Původní GPIO27/26/33 a I2C21/22 se nemění. Nové GPIO17/32 a volitelné tlačítko GPIO25 vyžadují fyzické potvrzení; volitelné funkce jsou vypnuté. Elektrické provedení nebylo ověřeno.

| Modul | Připojení ESP32 |
|---|---|
|DHT22 uvnitř|VCC 3,3 V, GND, DATA GPIO27|
|DHT22 venku|VCC 3,3 V, GND, DATA GPIO17|
|INA219 logika|VCC 3,3 V, GND, SDA21, SCL22|
|Relé 1 — LED osvětlení nad troubou|GPIO26 přes kompatibilní vstup/budič; napájení dle konkrétního modulu|
|Relé 2 — kompatibilita|GPIO33, ACTIVE LOW stejně jako relé 1|
|Volitelné tlačítko|GPIO25 ↔ tlačítko ↔ GND, vnitřní pull-up|
|Volitelný TPS ST|GPIO32, externí přibližně 10kΩ pull-up **do 3,3 V**|

Každý holý DHT22 DATA potřebuje pull-up přibližně 4,7–10 kΩ do 3,3 V; u modulu ověřte osazené odpory. Přidejte odrušení napájení. Dlouhé venkovní vedení vyžaduje fyzické ověření a ochrany.

INA219 SDA/SCL nesmějí být taženy do 5 V. IN+/IN− zapojte sériově do ověřené solární větve, nikdy napříč panelem jako zkrat. Skutečné místo zapište do `SolarLocation`. Bus voltage není automaticky napětí panelu naprázdno. Ověřte bočník a směr známou zátěží, pak nastavte `SolarCurrentSign` (+1/-1) a `SolarDirectionConfirmed=true`. Do té doby se výkon zobrazuje se znaménkem, Wh zůstávají nedostupné.

GPIO nesmí napájet cívku relé. Ověřte vstupní napětí, zem nebo oddělení podle modulu, ochranu cívky, externí neaktivní předpětí a kontakty COM/NO. Napětí světla se nepředpokládá. Síťová zátěž vyžaduje odpovídající izolaci, krytí a kvalifikované provedení. Nejprve testujte bez zátěže.
