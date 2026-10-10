# Ověření verze 3.0 — 10. 10. 2026

## Úspěšně ověřeno lokálně

- 32 automatických testů: autentizace, původ požadavků, telemetrie, duplicitní a prošlé povely, offline zařízení, ukládání po restartu databáze, konflikty zápisků, opakovaný import, počasí a časovač.
- Hodiny: čistá rozhodovací logika 22:00–05:00 Europe/Prague, letní/zimní čas, přechody DST, minutové probuzení a ruční režim. V prohlížeči ruční zapnutí, návrat dotykem a zachování ručního režimu po obnovení.
- Časovač v prohlížeči: vlastní čas, spuštění, pauza, obnovení stránky, pokračování, zrušení a dokončení nad hodinami. Zvuk závisí na oprávnění a aktivitě prohlížeče; konkrétní Android je nutné ověřit.
- Poznámka a úkol uložené z rozhraní zůstaly po obnovení stránky. HTTP integrační test ověřil sdílení, odmítnutí konfliktu a import.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` a C++ testy `npm run test:firmware` úspěšné.
- HTTP integrační test proti lokálnímu produkčnímu Next.js: autorizovaná telemetrie, přihlášení, odmítnutí veřejného API, potvrzení obou relé, živý režim a domácnost.

## Tablet a snímky

Všech pět záložek má stránku přesně 1024 × 600 a 1280 × 800 CSS px. Žádný ovládací prvek hlavních obrazovek není mimo viewport. Na menším tabletu jsou nastavení rozdělena do dvou sloupců. Seznamy mohou mít vlastní vnitřní posouvání při větším počtu položek. Telefon posouvá stránku s pevnou spodní navigací.

Snímky v `screenshots/v3/`: všech pět záložek v obou tabletových rozlišeních, přehled 1920 × 1080, mobil 390 × 844, hodiny a upozornění časovače. `layout-checks.json` obsahuje naměřené rozměry. Snímky a lokální test používají **simulované ESP32**, nikoli skutečná domácí měření. Předpověď pochází z Open-Meteo. Chybějící venkovní DHT údaj je záměrně nedostupný.

## Firmware

Kompletní soukromý `.ino` byl zkompilován Arduino CLI pro `esp32:esp32:esp32`, core 3.3.8, běžné 4MB rozdělení s OTA:

- Flash 1 297 375 / 1 310 720 bajtů (98 %).
- Statická RAM 82 320 / 327 680 bajtů (25 %).
- Zbývá jen 13 345 bajtů flash; další větší funkce vyžadují kontrolu velikosti. Změna oddílů nebyla provedena.
- HTTPS certifikát aktuální Railway domény prošel ověřením s kořenovými CA použitými firmwarem z počítače.

## Co ještě vyžaduje skutečný hardware

Firmware nebyl nahrán do ESP32. Dosud nelze potvrdit skutečné měření DHT/INA219, dostatek dynamické paměti během TLS na desce, fyzické sepnutí relé, OTA aktualizaci ani výpadek Wi-Fi na reálném zařízení. GPIO potvrzení dokládá zápis výstupu; bez zpětného senzoru nepotvrzuje, že se spotřebič skutečně rozsvítil.

Postup ručního nahrání a provozní kontroly je v [návodu](V3_NASAZENI.md). Původní plný lokální panel zůstává ve firmware zachován.
