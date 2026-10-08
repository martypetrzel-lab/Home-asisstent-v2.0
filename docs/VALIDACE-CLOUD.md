# Ověření přenosu Railway

Ověřeno 8. 10. 2026, software bez připojeného fyzického ESP32:

- 24 webových testů: SQLite persistence, vlastní stáří čidel, odpojení, deduplikace push, odmítnutí staré relace, potvrzení/konflikty/expirace relé, autentizace a omezení velikosti zprávy; původní UI/auth/počasí/PWA testy zachované.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:firmware` úspěšně.
- Skutečné lokální HTTP spojení: testovací zařízení → produkční Next server → přihlášený klient → oba povely relé → odpovídající ACK. Reprodukovatelný klient je `scripts/test-cloud-e2e.ts`, záměrně omezený na localhost:3002. Používá testovací klíče, nikoli zařízení v domácnosti.
- Prohlížeč: živý režim, přihlášení, testovací teplota 23 °C, skutečné internetové počasí, čekání na ACK a potvrzené vypnutí testovacího relé. Po zastavení testovacího zařízení zmizela měření a ovládání se zamklo, počasí zůstalo dostupné.
- PlatformIO / Arduino core 2.0.17 s aktivním cloudovým kódem: flash 1 121 725 B, statická RAM 76 548 B, úspěšně.
- Arduino CLI / core 3.3.8, modulární firmware s aktivním cloudovým kódem: flash 1 262 460 B, statická RAM 80 720 B, úspěšně. Samostatný kompletní `.ino` po poslední úpravě potvrzení relé: flash 1 257 156 B (95 %), statická RAM 80 712 B (24 %), úspěšně. Wi-Fi hodnoty zatím prázdné; cloudový klíč při kompilaci vyplněný, takže se HTTPS kód skutečně linkoval.
- Certifikát skutečné veřejné domény Railway byl ověřen TLS spojením důvěřujícím pouze ISRG Root X1/X2 vloženým do firmwaru.
- Soukromý export obsahuje vygenerovaný klíč shodný s lokálním souborem hodnot pro Railway. ZIP byl ověřen proti přesným bajtům `.ino`. Soukromé soubory jsou ignorované Gitem.

Neověřeno: vložení soukromých proměnných a volume do Railway účtu uživatele, nahrání do jeho ESP32, fyzické senzory/relé, dlouhodobá spotřeba paměti při TLS a výpadcích domácí Wi-Fi. Tyto kroky vyžadují nastavení služby a skutečný hardware podle [návodu](RAILWAY.md). Veřejný dashboard při kontrole zobrazoval demo; není to důkaz přenosu ze skutečného ESP32.
