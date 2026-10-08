# Ověření fáze 1

Kontrola provedena 8. října 2026 na lokální produkční verzi Next.js.

## Automatické kontroly

- Instalace závislostí proběhla úspěšně.
- ESLint bez chyb a upozornění.
- TypeScript bez chyb.
- Osm testů datové vrstvy prošlo.
- Produkční sestavení úspěšné, šest aplikačních cest předgenerováno.
- `npm audit --omit=dev`: žádné známé zranitelnosti produkčních závislostí.
- Úplný audit hlásí pět souvisejících upozornění v řetězci vývojového ESLint nástroje (`braces` → `micromatch` → `fast-glob` → Next ESLint). V době kontroly nebyla dostupná opravená verze `braces` nad 3.0.3. Nebyl proveden nucený downgrade Next.js. Před aktualizací vývojových závislostí znovu ověřte audit.

## Prohlížeč

- 1280 × 800: kontrola šesti stránek, přehled vyžaduje pouze krátké posunutí spodní části, bez vodorovného přetékání.
- 1920 × 1200 a 768 × 1024: kontrola přehledu bez vodorovného přetékání.
- 390 × 844: všech šest stránek bez vodorovného přetékání, mobilní navigace a dotykové ovládání.
- Ověřeno čekání na potvrzení demo světla, následný potvrzený stav a zákaz dalších příkazů během čekání.
- Ověřen minutový časovač, zachování při změně stránky a skutečné automatické vypnutí simulovaného stavu.
- Ověřeno potvrzení přechodu demo → live, chybové hlášení bez připojení, skrytí demo teploty a zakázané relé.
- Ověřen světlý a tmavý vzhled, přepočet °F a správný přepočet rozdílu teplot bez absolutního offsetu.
- Ověřen vstup a výstup z režimu tabletu.
- Ověřeny filtry historie a prázdný stav budoucího měření baterie.
- Uloženy snímky v `docs/screenshots/`.

## Hranice ověření

Neproběhl test s fyzickým ESP32, sítěmi domácnosti ani Android tabletem. Zabezpečené ovládání, počasí, skutečná historie a budoucí napájecí hardware nejsou implementovány. Automatické testy simulují odpověď čtecího API a chybu sítě; nejde o ověření existujícího zařízení. Dvouminutový šetřič má implementovaný časovač a ovládání, ale jeho dlouhodobý běh a ochrana displeje vyžadují ověření na cílovém tabletu.
