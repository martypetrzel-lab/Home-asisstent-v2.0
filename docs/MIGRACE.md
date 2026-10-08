# Migrace původního systému

Původní soubor nalezen mimo pracovní adresář na uvedené cestě: C:/Users/marty/Desktop/ESP/homeassistant/esp32_homeassistant_solar_relay_tablet_v1_8_4/esp32_homeassistant_solar_relay_tablet_v1_8_4.ino. Uvnitř je v1.8.10-relay2-gpio33. Byl pouze přečten, není kopírovaný ani změněný.

Prohlédnuta i předchozí Node/Express aplikace ESP/homeassistant/Nová složka/server.js (esp32-live-dashboard 0.1.0): push /api/update, RAM historie, read-only stav. Nový Next server používá přihlášenou bránu a čte ESP32 přímo. Starý server není třeba souběžně provozovat.

Zachováno: DHT27, relé26/33 ACTIVE LOW, I²C21/22, Nehvizdy, Wi-Fi/OTA a INA219. Přidáno: DHT17, volitelné ST32, autentizované POST povely, dostupnost/stáří/null, denní i kumulativní podepsaná energie, omezená historie a nové tabletové UI.

Odstraněné neautentizované GET povely /relay1/on, /relay1/off, /relay2/on, /relay2/off a /test/pin*/... nyní vracejí 404. /api/status se nepřenáší; použijte API v1. Embedded HTML nahrazuje stávající premium Next frontend.

Starý INA kód aplikoval abs() na proud/výkon; nový zachovává znaménko a ověření směru vyžaduje v konfiguraci. Neintegruje přes selhání, reboot ani dlouhé mezery. Min/max mají explicitní rozsah od bootu. Open-Meteo používá ověřované HTTPS na místním serveru, žádné setInsecure nebo blokující internetové požadavky ve smyčce ESP32.

Původní firmware a Node server obsahují přihlašovací údaje. **Změňte původní Wi-Fi heslo, OTA heslo a serverový klíč** a použijte nové nezávislé hodnoty v secrets.h / .env.local. Nové zdroje neobsahují jejich výchozí hodnoty, nevypisují je a neposílají API klíč do browseru.
