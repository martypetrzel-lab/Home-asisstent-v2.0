# Home Assistant ESP32 v2.0 — 2.2.0

Český tabletový dashboard a kompletní Arduino IDE sketch ESP32: dva DHT22, solární INA219, potvrzované řízení GPIO relé, místní API, přihlášení, diagnostika a omezená historie. Premium rozhraní a landscape kiosk zůstávají zachované. **Fyzické zařízení nebylo testováno ani flashováno.**

![Tabletový přehled](docs/screenshots/kiosk-1280x800.jpg)

## Začít

1. Ověřte [hardware](docs/HARDWARE.md), [GPIO](docs/GPIO.md), [zapojení](docs/WIRING.md) a [napájení](docs/POWER.md).
2. Nastavte konfiguraci a ručně nahrajte firmware podle [FLASHING](docs/FLASHING.md). Obě relé mají původní ACTIVE LOW logiku a při startu jsou vypnutá.
3. Nastavte .env.local, místní Next server a tablet podle [TABLET](docs/TABLET.md).
4. Kontrakt a export historie: [API](docs/API.md). Fyzické testy a řešení chyb: [TROUBLESHOOTING](docs/TROUBLESHOOTING.md).

Samotné demo: Node.js 22, `npm ci`, `npm run dev`, otevřít http://localhost:3000. Ve Windows lze použít npm.cmd. Produkce: `npm run build`, `npm start`.

## Chování

Demo je označená simulace. Živý režim nikdy nedoplňuje ukázkové hodnoty při chybě. Místní server schovává klíč ESP32; browser má dočasnou HttpOnly session. Světlo čeká na potvrzení konkrétního GPIO příkazu, řeší konflikty verzí a obnovuje stav mezi klienty. Fyzické kontakty/lampa nemají zpětnou vazbu.

Senzory a místní tlačítko běží nezávisle i bez Wi-Fi. Stáří nad 15 s měření zneplatní. Denní i celkové sledované Wh integrují skutečný čas platných vzorků až po ověření směru a času. LittleFS checkpoint po 30 min omezuje opotřebení; historie má nejvýše 288 vzorků a 48 událostí. Baterie/SOC jsou null, TPS výchozí neinstalovaný, zdroj UNKNOWN. Tablet má vlastní síťové napájení. Aktuální počasí, 24hodinovou a sedmidenní předpověď dodává Open-Meteo nezávisle na ESP32; keš 10 min, při výpadku nejvýše 60 min.

Povinný vstupní sketch: [HomeAssistant_ESP32_v2.ino](firmware/arduino/HomeAssistant_ESP32_v2/HomeAssistant_ESP32_v2.ino); Arduino IDE i PlatformIO sestavují stejné moduly. Původní firmware byl nalezen mimo repozitář a zůstal beze změn; [migrace a rotace přístupů](docs/MIGRACE.md).

## Struktura

- `firmware/arduino/HomeAssistant_ESP32_v2/config.h`: piny, schopnosti, intervaly a oddělená tajemství.
- `firmware/arduino/HomeAssistant_ESP32_v2/`: senzory, relé, síť/OTA, API, historie; `src/core/`: testovatelná logika a JSON.
- `src/services/esp32.ts`: živý adaptér; data.ts: demo; hooks/use-home.tsx: sdílený stav a synchronizace.
- `src/app/api/`: přihlášení a autentizovaná brána; src/components/: zachované české obrazovky.

## Kontroly

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `py -3 -m platformio run -d firmware`, `py -3 -m platformio run -d firmware -t buildfs`, `npm run test:firmware`.

Hostitelské firmware testy potřebují g++ na Linuxu nebo Python ziglang 0.16.0 na Windows, po stažení ArduinoJson sestavením PlatformIO. CI kontroluje web i firmware. Starší vizuální kontroly [VALIDACE](docs/VALIDACE.md) se vztahují k tabletové vrstvě.

## Režim tabletu

Přehled na šířku má pevnou výšku dostupného viewportu a tři oblasti CSS Grid. Ostatní stránky mohou posouvat obsah. V nastavení je samostatný „Tabletový režim“: okraj 0–40 px (výchozí 16), měřítko 90–115 %, tlačítka 48/52/56 px, prohození levé a pravé strany, preference orientace, fullscreen, noční plán, ztlumení a hodinový šetřič. Preference se ukládají místně v prohlížeči. Při malé dostupné výšce se zkrátí doplňkové popisky; časovač světla je nadále na stránce Domácnost.

Noční plán používá časovou zónu Europe/Prague, podporuje interval přes půlnoc a přepne na tmavé ztlumené barvy. Stejný začátek a konec plán vypne. Automatické ztlumení má volitelnou prodlevu 30 s / 1 / 2 / 5 min; hodinový šetřič 2 / 5 / 10 min. První dotyk nebo klávesa probudí panel a neaktivuje ovládání pod překryvem. Omezení animací vypne i pohyb hodin. Ztlumení je pouze vzhled stránky; nemění hardwarový jas a nezaručuje ochranu proti vypálení.

## Instalace na tablet do 3D tištěného rámečku

1. Spusťte produkční sestavení na trvale dostupném serveru (`npm run build`, `npm start`). Na tabletu otevřete jeho **HTTPS adresu s platným certifikátem**. `localhost` je výjimka pro testování na stejném zařízení; HTTP adresa počítače v domácí síti není pro PWA rovnocenná localhostu. Použijte aktuální Chrome nebo kompatibilní Android prohlížeč.
2. Nechte první načtení dokončit při dostupné síti. Nabídkou prohlížeče „Nainstalovat aplikaci“ / „Přidat na plochu“ nainstalujte PWA a spusťte ji z ikony. Manifest má režim `standalone`, orientaci `landscape`, barvu motivu a ikony 192/512 px včetně maskovatelné. Dostupnost instalace závisí na prohlížeči; viz [podmínky instalovatelnosti PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
3. V Nastavení → Tabletový režim začněte s okrajem **16 CSS px**, měřítkem 100 % a tlačítky 52 px. Nasaďte rámeček a ověřte prstem horní nastavení, spodní navigaci i světlo. Podle skutečného překrytí zvětšete okraj; systémové safe-area insets se přičítají. Rozhodují dostupné CSS pixely, nikoli fyzické rozlišení displeje. Změna systémové velikosti zobrazení může změnit dostupný prostor.
4. Klepnutím na „Celá obrazovka“ nebo „Režim tabletu“ vyvolejte Fullscreen API. Orientaci se aplikace pokusí zamknout jen při této akci. Při odmítnutí zobrazí vysvětlení a zůstane funkční. Orientaci nastavte také v Androidu nebo kiosk aplikaci. Fullscreen je dočasný a po znovuotevření může vyžadovat další dotyk.

**PWA sama Android nezamyká a nezajišťuje automatický start po restartu.** Pro trvalý panel použijte kiosk prohlížeč, například [Fully Kiosk Browser a jeho oficiální návod](https://www.fully-kiosk.com/en/). Nastavte adresu této aplikace jako Start URL, spuštění po bootu, orientaci na šířku, skrytí adresního řádku a podporovaných systémových lišt, zákaz přepínání aplikací a vlastní způsob ukončení kiosku s PIN. Nastavte zachování zapnutého displeje a obnovu stránky při návratu sítě nebo chybě načtení. Konkrétní volby, oprávnění a případná placená licence závisí na zařízení a verzi kiosk softwaru. Globální zákaz posouvání nezapínejte: vedlejší stránky jej potřebují. Automatické mazání webového úložiště/cache by odstranilo preference a offline shell.

Pro spravovaný tablet lze použít podporované řešení **Android Enterprise device owner** s povolenou kiosk aplikací a **lock task mode**. Správce nastavuje povolené aplikace, systémové ovládání a spuštění kiosku; obyčejné připnutí obrazovky neposkytuje stejnou ochranu. Postup správy a dostupné systémové funkce popisuje [Android lock task mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode). Provisioning může vyžadovat přípravu či reset zařízení; tento frontend správu Androidu neprovádí.

V Androidu nastavte přiměřený **hardwarový jas**, dobu zhasnutí obrazovky a podle podporovaných možností výjimku pro úsporu energie kiosk aplikace. Ověřte probuzení po restartu i po přerušení napájení. Webová vrstva neslibuje spolehlivé zabránění uspání na každém Androidu; fyzicky zhasnutý displej samotný webový dotykový překryv neprobudí. Zvolte jeden hlavní plán uspávání/probouzení v Androidu nebo kiosku a sladěte jej s nočním plánem aplikace.

**Offline a obnova spojení:** service worker ukládá stránky a jejich místní statické soubory, nikoli ESP32 API, živá měření ani zapisovací požadavky. Po prvním úspěšném načtení může zobrazit rozhraní i při výpadku serveru. Browser offline stav nebo chyba/stáří API skryje živé hodnoty. Uloží se pouze čas posledního úspěšného spojení, odděleně pro režim a endpoint; přežije obnovení stránky. Dotazy se opakují ve zvoleném intervalu a při návratu připojení. Demo zůstává viditelně označenou simulací i offline. Cache může Android/prohlížeč odstranit, proto ji nepovažujte za náhradu spolehlivého serveru.

Po nové verzi se offline shell uloží do nové cache; čekající service worker se aktivuje po zavření všech oken této aplikace. Pro aktualizaci ukončete její PWA/kiosk okna a znovu otevřete stránku online. Před montáží prakticky vyzkoušejte restart tabletu, ztrátu Wi-Fi, obnovení stránky bez serveru, návrat API, noční plán a první dotyk po ztlumení. Automatický start, systémové lišty a dlouhodobý provoz je nutné ověřit na konkrétním tabletu.
# Připojení přes Railway

Pro ESP32, které samo odesílá měření na veřejný web a přijímá povely relé, postupujte podle [návodu Railway → tablet](docs/RAILWAY.md). Podporováno je ověřené HTTPS, autentizovaný příjem, historie na persistentním volume a potvrzené povely obou relé. Původní LAN brána zůstává dostupná přes `ESP32_TRANSPORT=local`.
