# Home Assistant 3.0

Český ovládací panel: ESP32 → ověřené HTTPS → Railway → tablet nebo telefon. Nový vzhled navržený modelem Astra, sdílené vzkazy, úkoly a nákupy, kuchyňský časovač, české svátky, Open-Meteo, energie, historie a noční spořič 22–5.

Původní plný lokální panel 2.2.3 zůstává ve firmwaru jako nouzový přístup. GPIO26/33 ACTIVE LOW, obě relé při startu vypnutá. Žádná garáž ani další domácí server.

- [Audit reference a architektura](docs/V3_AUDIT_A_ARCHITEKTURA.md)
- [Railway, Arduino a tablet — návod](docs/V3_NASAZENI.md)
- [Kompletní standalone Arduino sketch](firmware/arduino/HomeAssistant_ESP32_v3_0_0/HomeAssistant_ESP32_v3_0_0.ino)
- [Přesné výsledky ověření](docs/V3_OVERENI.md)

Kontroly: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:firmware`, `npm run build`. Produkce: `npm run start:railway`, Node 24 a připojený volume `/data`. Proměnné viz `.env.example`. Cloudový web vyžaduje přihlášení.

Firmware vzniká reprodukovatelně: `py -3 scripts/build-firmware-v3.py`. Soukromá kopie s konfigurací je pouze v ignorovaném `exports/`. Soubory 2.2.3 a starší modulární v2 slouží jako reference, nová verze je v3.

Fyzické nahrání ESP32 není součástí automatické přípravy. Softwarové testy a GPIO ACK nenahrazují ověření kontaktů relé a čidel na konkrétní desce. Výsledky rozlišují simulaci, kompilaci, Railway a hardware.
