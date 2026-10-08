# REST API v1

ESP32: `http://homeassistant-esp32.local/api` nebo rezervovaná LAN IP. Všechny GET i POST vyžadují `Authorization: Bearer <HOME_API_TOKEN>` (nejméně 32 znaků). Bez konfigurace 503, bez klíče 401; odpovědi `Cache-Control: no-store`. HTTP používejte v důvěryhodné oddělené LAN bez portů přístupných z internetu; tento úsek token nešifruje.

| Metoda a cesta | Obsah |
|---|---|
|GET /api/state|celý stav|
|GET /api/climate|indoor/outdoor DHT22|
|GET /api/solar|INA219, denní i celková sledovaná energie|
|GET /api/relays|relays.1 a relays.2|
|POST /api/relays/1|LED osvětlení nad troubou, GPIO26|
|POST /api/relays/2|kompatibilní relé, GPIO33|
|GET /api/power|MAINS/BATTERY/UNKNOWN, bateriová pole null|
|GET /api/system|Wi-Fi, paměť, uptime, důvod restartu, verze|
|GET /api/health|status, sensorDegraded, storageReady|
|GET /api/version|API a firmware verze|
|GET /api/history?limit=288|1–288 vzorků a nejvýše 48 událostí, export JSON|

`GET /api/relay` a autentizovaný `POST /api/relay` jsou aliasy kanálu 1. Staré GET příkazy a testovací GPIO endpointy byly odstraněny (404); `/api/status` se nepřenáší. Podrobnosti [migrace](MIGRACE.md).

Stavový obal: `apiVersion:1`, `deviceId`, `bootId`, `timestamp` (UTC ISO nebo null bez NTP), `uptimeSeconds`. Přesný kontrakt: `firmware/arduino/HomeAssistant_ESP32_v2/api.cpp` a `relay.cpp`.

Klima: temperatureC, humidityPct, available, stale, ageMs, readingTimestamp, min/maxTemperatureC, min/maxHumidityPct, errors a extremaScope=since_boot. Selhání/NaN jsou null. Stáří nad 15 s zneplatní měření; poslední úspěch a počet chyb zůstávají diagnostikou.

Solar: voltageV je bus voltage; shuntVoltageMv, rawCurrentMa jsou surové podepsané hodnoty. currentMa/currentA respektují SolarCurrentSign. powerW=(busV+shuntMv/1000)×currentMa/1000. minPowerW/maxPowerW platí od restartu. energyTodayWh i energyTotalWh vznikají podepsanou trapezoidní integrací platných vzorků s odstupem nejvýše 15 s až po potvrzení směru a času. Celková hodnota znamená součet skutečně sledovaných úseků od instalace, nikoli odhad celé historie panelu; zpětný tok ji může snížit. Den se mění v Europe/Prague. Reboot/chyba/skok času zpět nepřemosťují chybějící úseky. energyPartial=true označuje neúplný den. Po rebootu se obnoví checkpoint; ztráta posledních až 30 min je možná.

Příklad příkazu: `{"state":true}`. Dashboard přidává expectedVersion, bootId a requestId (1–40 znaků písmena/číslice/-/_). Neznámá pole, null či jiné typy: 400. Neshoda verze/bootu: 409; nejdřív načtěte nový stav. Fronta má dvě položky, změny téhož relé musejí být alespoň 500 ms od sebe, jinak 429. Posledních osm requestId v RAM omezuje duplicity a kontroluje i kanál; po restartu neplatí. Opakovaný stejný stav nepřepíná relé ani nezvyšuje verzi.

Potvrzení 200: apiVersion, channel (1/2), applied=true, requestedState, appliedVersion, requestId, bootId a relays.<kanál>; kanál 1 navíc lighting.kitchenLed. Znamená aplikovaný GPIO příkaz, nikoli ověření lampy. feedbackAvailable=false, physicalOn=null. Timeout 504 může znamenat pozdější aplikaci; neopakujte slepě. Výslovně deaktivovaná polarita nebo OTA zámek vrací 503. Oba ACTIVE LOW výstupy se inicializují vypnuté; obnova uloženého ON je výchozí zakázaná.

Historie: 288 vzorků po 5 min, 48 událostí restart/senzory/relé/zdroj/síť/OTA. Střídavé CRC LittleFS soubory po 30 min. Bez NTP je epochSeconds=null, zůstávají bootId a uptimeSeconds; web takové body nevymýšlí do grafu. Výchozí firmware neformátuje při chybě. První inicializace je výslovná volba podle [FLASHING](FLASHING.md); jinak funguje RAM historie s storageReady=false.

Prohlížeč používá `/api/esp32/*`, `/api/session`, podepsanou HttpOnly SameSite=Strict cookie (12 h) a kontrolu Origin při zápisu. API token zůstává na serveru. Login omezuje chybné pokusy. CORS firmware je výchozí vypnuté; serverová brána je nepotřebuje. Volitelný HOME_ALLOWED_ORIGIN povoluje jen přesný původ. Přímá adresa v UI je pouze čtecí režim pro samostatně řešenou autentizovanou bránu.

## Internetové počasí na místním Next serveru

`GET /api/weather?location=Nehvizdy` je oddělený veřejný čtecí endpoint bez klíče ESP32. Vrací weather, hourly (24), forecast (7), fetchedAt, location, stale. Server volá pevné HTTPS adresy Open-Meteo s ověřením TLS, timeoutem a omezenou paměťovou keší (16 míst, 8 souběžných obnov). Nehvizdy zachovávají původní souřadnice; jiná místa se vyhledají geokódováním, zobrazuje se nalezený název. Při shodných názvech upřesněte místo v Nastavení.

Keš 10 min; při chybě se označí starší data do 60 min, poté 503 a Nedostupné. Obnova po chybě nejdříve za 60 s. Síťová chyba počasí neblokuje lokální ESP32, relé ani DHT22. Demo používá výslovně označenou simulaci. [Open-Meteo API a jednotky](https://open-meteo.com/en/docs), [geokódování](https://open-meteo.com/en/docs/geocoding-api).

## Cloud transport v1

Set ESP32_TRANSPORT=cloud. POST /api/device/sync requires Authorization: Bearer DEVICE_TOKEN and a JSON body <=24576 bytes:
`{protocolVersion:1,sequence:1,state:<complete API v1 state>,ack:null}`.
The sequence increases per push within one bootId. Duplicate sequence numbers do not refresh device freshness. A retired bootId cannot replace a newer session. One configured DEVICE_ID is accepted. Response: `{protocolVersion:1,accepted:true,serverTime:<epoch milliseconds>,command:null|{channel,state,expectedVersion,bootId,requestId,expiresAtMs,validForMs}}`.

An executed command is returned on the next push as `ack:{requestId,channel,status,result:<existing GPIO ACK or error>}`. The device retains its ACK until a successful sync. A command expires after 10 seconds and is bound to bootId/version; the web request waits 6 seconds for the ACK, otherwise returns 504 and asks to refresh state. GPIO ACK confirms the applied output command only.

Authenticated dashboard routes /api/esp32/state and /api/esp32/history use the SQLite volume. Existing session and Origin checks protect both relay command routes. GET /api/config exposes only transport and initial display mode. Cloud state includes receivedAt and transport; sensor ages include transit and time since receipt. After 15 seconds without a new sequence, state returns 503. /api/esp32/version and /health return cloud gateway status, while device firmware diagnostics remain in state.system. SQLite requires one Railway replica and a persistent /data volume. See RAILWAY.md.
