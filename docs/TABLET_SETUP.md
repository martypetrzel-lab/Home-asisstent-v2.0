# Instalace živého tabletového rozhraní

Podrobnosti serveru, HTTPS a kiosku jsou v [TABLET](TABLET.md).

1. Ručně nahrajte Arduino sketch podle [FLASHING](FLASHING.md); poznamenejte LAN IP a nový API klíč.
2. Místní server s Node.js 22: npm ci; zkopírovat .env.example do .env.local; vyplnit ESP32_API_URL=http://<IP-ESP32>/api, shodný ESP32_API_TOKEN, samostatné DASHBOARD_PASSWORD a SESSION_SECRET.
3. npm run build, npm start. Tablet otevře http://<IP-serveru>:3000. Pro PWA nastavte důvěryhodné místní HTTPS podle TABLET.md.
4. Nastavení → prázdná Adresa API → přihlásit místní heslo → Živý režim. Ověřte senzory a **LED osvětlení nad troubou**. Potvrzuje se GPIO, nikoli fyzická lampa. Relé 2 je dostupné autentizovaným API.
5. Výchozí počasí Nehvizdy, jinou obec uložíte v Nastavení. Open-Meteo běží nezávisle na ESP32. Při výpadku WAN se nejvýše hodinu zobrazuje označená starší předpověď, poté Nedostupné. Lokální ovládání internet nevyžaduje.
6. Android na šířku, PWA nebo kiosk Start URL/boot start/fullscreen. Začněte okrajem 16 px, měřítkem 100 %, tlačítky 52 px. Tablet napájejte vlastním adaptérem mimo TPS2116.
