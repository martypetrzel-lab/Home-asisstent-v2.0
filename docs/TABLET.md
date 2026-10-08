# Místní server a živý tablet

ESP32 provozuje REST API; Next.js běží na místním PC / Raspberry Pi / NAS s Node.js 22. Přihlášení a brána vyžadují runtime, proto tento návrh nepoužívá statický export na ESP32. Internet ani cloud nejsou pro lokální senzory a světlo potřeba. NTP lze nastavit místní; bez času fungují senzory/relé, časová historie a denní Wh čekají.

1. Na místním serveru spusťte `npm ci`. Zkopírujte `.env.example` do `.env.local`.
2. Nastavte ESP32_API_URL na `http://<LAN-IP-ESP32>/api` nebo mDNS. ESP32_API_TOKEN musí být shodný s HOME_API_TOKEN. Vyplňte DASHBOARD_PASSWORD (alespoň 16 znaků) a samostatné SESSION_SECRET (alespoň 32 náhodných znaků). Klíče nepatří do NEXT_PUBLIC proměnných ani úložiště browseru.
3. Spusťte `npm run build`, potom `npm start`. Ověřte `http://localhost:3000`. Server musí zůstat spuštěný; pro trvalý provoz nastavte systémovou službu s automatickým restartem. Firewall povolte jen pro domácí síť.
4. Tablet v téže LAN otevře `http://<LAN-IP-serveru>:3000`. Pro běžné ovládání HTTP v důvěryhodné LAN funguje; pro PWA a bezpečnější login použijte místní HTTPS proxy s certifikátem důvěryhodným i na tabletu. Například Caddy na serveru:

   ```caddyfile
   panel.home.arpa {
     tls internal
     reverse_proxy 127.0.0.1:3000
   }
   ```

   Nastavte lokální DNS panel.home.arpa na server, nainstalujte jeho místní CA na tablet a v .env.local nastavte DASHBOARD_ORIGIN=https://panel.home.arpa; restartujte Next. Nedůvěryhodný certifikát není hotová HTTPS instalace.
5. V Nastavení nechte **Adresu API prázdnou**, přihlaste se heslem dashboardu, zvolte Živý režim a potvrďte přechod. Relé používá původní ACTIVE LOW a startuje vypnuté. Po 12 h se přihlaste znovu. Ověřte hodnoty proti senzorům a GPIO povel bez zátěže. Fyzický stav lampy se bez zpětné vazby neměří.
6. Na HTTPS stránce použijte Chrome → Nainstalovat / Přidat na plochu. Nastavte tabletový režim, okraj 16 px, 100 %, tlačítka 52 px a Celou obrazovku. Orientaci nastavte i v Androidu.
7. Pro automatický start a uzamčení použijte podporovaný kiosk prohlížeč nebo správu Androidu. Nastavte Start URL, boot start, landscape, zapnutý displej a chráněný odchod. Web sám Android nezamyká. Ponechte posouvání vedlejších stránek. Tablet napájejte nezávisle ze sítě.

Živý stav se obnovuje nejpozději po 5 s a po příkazu relé; tablety se synchronizují dotazováním, karty stejného browseru i BroadcastChannel. Chyba nikdy nevkládá demo. Service worker uchovává shell, nikoli API/příkazy. Offline shell neovládá nedostupný server nebo ESP32. Open-Meteo dodává aktuální počasí a předpověď nezávisle na spojení ESP32. Keš je 10 min, při chybě nejvýše 60 min s označením stáří; místní DHT22 zůstává samostatný zdroj. Výchozí místo Nehvizdy lze změnit v Nastavení. Demo počasí je označené.
