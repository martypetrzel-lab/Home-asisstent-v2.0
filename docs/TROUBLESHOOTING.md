# Diagnostika

- **ESP32 není připojeno:** napájení, Wi-Fi, LAN IP, firewall a ESP32_API_URL včetně /api. Vyzkoušejte IP místo mDNS. Bez místního Next serveru brána nefunguje.
- **401:** přihlaste se v Nastavení; zkontrolujte shodu serverového klíče a HOME_API_TOKEN. **403:** ověřte DASHBOARD_ORIGIN a přesnou URL browseru. **503:** chybí konfigurace, je výslovně vypnutá polarita v konfiguraci nebo probíhá OTA.
- **409 relé:** jiný klient/tlačítko změnilo stav; znovu načtěte. Při timeoutu neopakujte slepě, povel mohl být aplikován později. GPIO potvrzení není měření lampy.
- **429 relé:** fronta je plná nebo by změna stavu přišla do 500 ms po předchozí změně stejného relé. Načtěte stav a vyčkejte.
- **Počasí nedostupné:** internet/DNS/TLS na místním serveru; zkontrolujte zvolené místo. Starší předpověď se označí a po 60 min skryje. Porucha počasí nezastavuje ESP32 ani místní relé.
- **DHT:** ověřte pull-up 3,3 V, piny, zem a kabel. Chyba je null, ne nula. Čtení po 5 s, stale po 15 s.
- **INA:** ověřte adresu, 3,3V odpory, bočník, sériové zapojení a směr. Záporný proud může být skutečný. Denní Wh potřebují potvrzený směr a čas.
- **Bez času:** nastavte místní NTP v config.h. Řízení běží dál, vzorky bez času se do grafu nevkládají.
- **storageReady=false:** pro Arduino IDE použijte výslovnou první inicializaci InitializeHistoryOnFirstBoot podle FLASHING; pro PlatformIO lze jednorázově uploadfs. Formátování smaže stará data. Výchozí firmware při chybě sám neformátuje.
- **UNKNOWN:** správně bez ST. LOW může být shutdown. Napětí/SOC baterie nejsou měřeny.

## Fyzický kontrolní seznam – dosud neproveden

1. Bez zátěže změřit oba neaktivní výstupy GPIO26 a GPIO33 při zapnutí, resetu a odpojení USB; ověřit polaritu a externí předpětí.
2. Porovnat DHT s referencí; odpojit jeden, ověřit null, chybu a obnovu bez ovlivnění relé.
3. INA porovnat multimetrem/známou zátěží, jednotky, bočník a znaménko. Wh přes půlnoc, reboot a výpadek času.
4. Přerušit Wi-Fi/internet: místní tlačítko a senzory pokračují; API se po návratu obnoví. S místním NTP testovat bez WAN.
5. Dva klienti a rychlé dotyky: čekání na potvrzení, 409, aktualizace druhého tabletu, timeout. Zamítnutí bez hesla/klíče.
6. Výpadek při checkpointu, CRC obnova, ztráta posledního intervalu a dlouhodobý provoz/flash.
7. OTA bez zátěže: vypnutí, zamčení povelů, úspěch/chyba/restart/watchdog. Startovní stav vypnuto.
8. Po instalaci TPS ověřit VIN1 prioritu, převodník, AGM ochrany a ST při zdrojích i shutdown. Žádné zpětné napájení přes USB. Tablet nezávislý.
9. Na Androidu ověřit boot kiosku, dotykové okraje rámečku, HTTPS, expiraci loginu, noční režim, síť a aktualizaci PWA.

Kompilace ani automatické testy nenahrazují elektrické a dlouhodobé testy.
