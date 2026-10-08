# Ověření tabletového rozhraní v2.1

Kontrola 8. října 2026, lokální produkční sestavení Next.js, prohlížeč Codex IAB. Snímky demo přehledu obsahují výhradně simulovaná data. Test čtecího API používal místní testovací server, nikoli fyzické ESP32.

## Automatické kontroly

- ESLint a TypeScript bez chyb.
- 14 testů prošlo: datové kontrakty, oddělení demo/live a budoucího hardwaru, potvrzované demo relé, chyby API, stáří měření, preference tabletu, pražský noční interval přes půlnoc, offline document fallback, nezachytávání API/RSC/zapisovacích požadavků, čištění pouze vlastních cache a generování spustitelného workeru.
- Produkční build úspěšný, šest aplikačních cest, manifest, PNG ikony a verzovaný offline shell.
- `npm audit --omit=dev`: žádné známé zranitelnosti produkčních závislostí.

## Kontrola skutečného rozložení v prohlížeči

Automatizace nastavila CSS viewport, odečetla rozměry dokumentu a karet, ověřila průniky obdélníků karet, přetečení obsahu a rozměry/hranice hlavních dotykových prvků. Nezakrýváme přetečení celé stránky pomocí `overflow:hidden`. Výsledky jsou v [responsive-results.json](responsive-results.json).

| CSS viewport | Rozměr dokumentu | Přehled                                                       | Snímek                                    |
| ------------ | ---------------- | ------------------------------------------------------------- | ----------------------------------------- |
| 1024 × 600   | 1024 × 600       | Bez posouvání, překryvů a přetečení karet                     | [Snímek](screenshots/kiosk-1024x600.jpg)  |
| 1280 × 800   | 1280 × 800       | Bez posouvání, překryvů a přetečení karet                     | [Snímek](screenshots/kiosk-1280x800.jpg)  |
| 1920 × 1200  | 1920 × 1200      | Bez posouvání, překryvů a přetečení karet                     | [Snímek](screenshots/kiosk-1920x1200.jpg) |
| 800 × 1280   | 785 × 1312       | Portrét, povolené svislé posouvání, bez vodorovného přetečení | [Snímek](screenshots/kiosk-800x1280.jpg)  |

U portrétu je šířka dokumentu menší o pruh posuvníku. Hlavní tlačítka přehledu mají ve výchozím nastavení nejméně 52 × 52 CSS px. Kontrolován přepínač světla, horní nastavení, detail energie a spodní navigace. Na šířku jsou uvnitř viewportu. Dále ověřeno prohozené rozložení při 1024 × 600, okraji 40 px, měřítku 115 % a tlačítkách 56 px; při malé dostupné výšce se doplňkové popisky zkracují. Chybový stav při této kombinaci rovněž nepřetékal: [snímek](screenshots/live-error-compact.jpg).

## Fullscreen, nečinnost a obnova

- Explicitní „Celá obrazovka“ přešlo do fullscreen a tlačítkem jej bylo možné ukončit. Pro odmítnutí/nepodporované API je implementováno vysvětlení; odmítnutí nebylo uměle vynuceno. Uzamčení orientace a systémových lišt Androidu tento desktopový test neověřuje.
- Automatický překryv se objevil po 30 sekundách nečinnosti. První dotyk jej odstranil a demo světlo zůstalo vypnuté: [snímek ztlumení](screenshots/idle-dim.jpg).
- Hodinový šetřič se objevil po dvou minutách, zobrazil čas a datum a šel probudit dotykem: [snímek šetřiče](screenshots/clock-screensaver.jpg). Ověřen noční interval zahrnující aktuální čas: i ze světlého vzhledu přešel na tmavé barvy a filtr `brightness(0.6)`. Zapnuté omezení animací nastavilo přechody na `0s`.
- Při zastaveném aplikačním serveru šlo obnovit přehled i otevřít Nastavení z uloženého shellu: [snímek](screenshots/offline-shell.jpg). Jde o výpadek serveru při dostupném síťovém rozhraní; stav skutečně vypnuté Wi-Fi je nutné ověřit na tabletu.
- Místní čtecí API vracelo čerstvý timestamp, teploty a chybějící venkovní vlhkost. UI zobrazilo dostupná měření a pro chybějící vlhkost „Nedostupné“. Baterie, počasí a živé ovládání zůstaly nepřipojené.
- Přepnutí testovacího API na HTTP 503 skrylo měření, ponechalo poslední úspěšný čas a zakázané relé. Čas zůstal zachován i po obnovení stránky. Po návratu API se data obnovila automaticky při periodickém dotazu, bez tlačítka pro opakování.

## Ověření na cílovém zařízení

Neproběhl test na fyzickém Android tabletu, v tištěném rámečku ani s ESP32. Před montáží ověřte instalaci PWA přes HTTPS, dostupný CSS viewport, bezpečné okraje prstem, start po bootu, kiosk PIN/ukončení, systémovou navigaci, orientaci, skutečný výpadek Wi-Fi, uspání/probuzení a dlouhodobé zahřívání/displej. Webový filtr jasu nemění hardwarový jas. Automatický start a plné uzamčení Androidu závisejí na jeho správě či kiosk aplikaci; PWA je sama nezajišťuje.

Snímky původní fáze 1 (`dark-tablet.jpg`, `light-tablet.jpg`, `mobile-overview.jpg`, `live-unavailable.jpg`) jsou historické a nepopisují aktuální jednoplošný přehled.
