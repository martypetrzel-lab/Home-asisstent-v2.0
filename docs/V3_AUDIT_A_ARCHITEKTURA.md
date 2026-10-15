# Home Assistant 3.0 — audit a architektura

Autoritativní reference je soubor 2.2.3-direct-tablet nalezený v `C:/Users/marty/Desktop/aaa/esp32-tablet-direct/HomeAssistant_ESP32_tablet_primo/HomeAssistant_ESP32_tablet_primo.ino`. SHA256 původních bajtů: `f6892cfdc655fef04dbf7824d9edcfe5c7586103bb1702cbb5cc556b062d1e36`. Nedotčená soukromá záloha je v `C:/Users/marty/Desktop/aaa/esp32-v3-reference-backup/`. Do repozitáře patří pouze očištěná reference ve `firmware/reference-v2.2.3/` bez přístupových údajů.

Reference byla načtena celá, gzip HTML rozbaleno a zkontrolováno. Obsahuje lokální WebServer bez přihlášení, API v1, oddělené FreeRTOS úkoly pro GPIO, senzory a historii, NTP Europe/Prague, ArduinoOTA s heslem, obě ACTIVE LOW relé vypnutá po startu, DHT27/32 a INA21/22. Wh je podmíněno ověřením směru proudu, LittleFS se automaticky neformátuje. Panel má pět záložek, kalendář, Open-Meteo, noční hodiny, vaření a localStorage zápisky.

Starší GitHub měl cloudový protokol, ale původní firmware moduly byly předchozími úpravami přepnuté do lokálního režimu a web postrádal nové zápisky, časovač a svátek. Nová v3 vzniká přímo ze standalone 2.2.3, nikoli návratem ke staré GitHub verzi. Původní lokální dashboard zůstává kompletní. Přidán je export zápisků a stav Railway.

## Protokol

ESP32 jednou za přibližně 2 sekundy odesílá HTTPS POST `/api/device/sync`, bearer DEVICE_TOKEN, `{protocolVersion:1,sequence,state,ack?}`. Klíč je pouze na zařízení a serveru. TLS ověřuje hostname, platnost certifikátu a ISRG Root X1/X2. Bez synchronizovaného času se cloud nepřipojí. Síťový úkol běží zvlášť, s časovými limity a opakováním 2–60 s. Místní čidla, WebServer a GPIO běží dál.

Odpověď může obsahovat jeden povel s requestId, channel, state, expectedVersion, bootId a expirací nejvýše 10 s. ESP32 ověří stáří, start zařízení a verzi relé; stejná GPIO fronta obsluhuje lokální i cloudové požadavky. Vstupní mutex serializuje oba zdroje. ACK vzniká až po provedení digitalWrite v GPIO úkolu. Není to čidlo kontaktů ani svitu lampy. Server nevrací úspěch před odpovídajícím ACK. Po 6 s bez ACK vrátí nejistý výsledek, stav se znovu načítá, povel se automaticky neopakuje. Po restartu staré bootId neplatí.

## Data a přístup

Next.js/Node24 běží na jedné Railway replice se SQLite WAL na připojeném `/data` volume. Cloudové měření se ukládá po 5 min, retence 30 dní, nejvýše 8640 vzorků. Grafy vracejí nejvýše 288 vybraných skutečných bodů. Chybějící měření se nedoplňují. Událostí je nejvýše 512; uživatelský výpis má posledních 48. Bez času ESP32 je epochSeconds null. Místní historie se automaticky zpětně nedoplňuje do cloudu.

Webové čtení i povely vyžadují HttpOnly SameSite Strict session, na produkčním HTTPS Secure. Zápisy vyžadují přesný Origin. Device token nikdy nejde do frontend JavaScriptu. Web používá serverovou bránu. Zastaralá měření jsou null a odpojené zařízení nelze ovládat. Přihlášení je omezené počtem pokusů. Chyby databáze neodhalují cesty ani tajemství.

Domácnost má revision a atomický PATCH s optimistickým zamykáním; konflikt 409 neznamená úspěšné uložení. Poznámky mají nejvýše 6000 znaků, seznamy 100 položek a text položky 200 znaků. Import je idempotentní podle importId, existující data doplňuje. Pro přechod HTTP IP → Railway HTTPS je nutný explicitní soubor, protože prohlížeč odděluje localStorage podle originu. Vaření zůstává na konkrétním tabletu, odpočet vychází z deadline a obnoví se po reloadu.

## Omezení fyzického ověření

Kompilace a simulovaný end-to-end test nejsou ověření skutečného kontaktu relé, výpadku napájení, RF spojení ani spotřeby TLS heapu na konkrétní desce. Uživatel zakázal automatické flashování. Nový firmware není v rámci přípravy nahráván. Tyto testy následují po ručním nahrání.
