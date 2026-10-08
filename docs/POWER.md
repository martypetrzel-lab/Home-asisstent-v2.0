# Napájení a TPS2116

Plán: externí regulovaný síťový 5 V / 3 A adaptér → VIN1. AGM 12 V → jištění a ochrana proti podvybití → ověřený DC/DC 12→5 V → VIN2. VOUT → výrobcem povolený napájecí vstup ESP32. Tablet má samostatný síťový adaptér. Panel vede přes kompatibilní PWM regulátor do AGM. Převodník, ochrany a TPS nejsou potvrzeny jako instalované.

**12 V nesmí přijít na TPS2116 ani GPIO.** Model 3728 má vstupy 1,6–5,5 V a nejvýše 2,5 A za odpovídajících podmínek. USB VBUS je spojen s VIN1; nepřipojujte nezávislé zdroje paralelně přes USB a VIN1. Výchozí automatický režim vybírá vyšší napětí. Síťová priorita vyžaduje MODE HIGH a vhodný dělič PR1 sledující VIN1 podle výrobce; hodnoty závisejí na skutečných zdrojích. Firmware MODE/PR1 neovládá. [Oficiální dokumentace Pololu 3728](https://www.pololu.com/product/3728).

Volitelný ST na GPIO32 je open drain: vysoká impedance s pull-upem odpovídá VIN1; LOW znamená VIN2 nebo shutdown. Bez `TpsStatusInstalled=true` je zdroj UNKNOWN. LOW zůstává UNKNOWN, dokud `TpsLowIsVerifiedBackup` nepotvrdí fyzicky ověřený návrh VIN2, prioritního režimu a poruchových stavů. Samotné ST nikdy neměří zdraví zdroje. Debounce je 250 ms.

AGM vyžaduje vhodný nabíjecí profil, jištění u baterie a ochranu proti hlubokému vybití. Konkrétní prahy musí vycházet z baterie a zátěže, software je nenahrazuje. Solární priorita počká na samostatný návrh s bateriovým monitoringem. SOC se z jediného napětí neodhaduje.
