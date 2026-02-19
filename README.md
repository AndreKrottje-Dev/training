# Andre Coach (PWA)

Een simpele offline PWA (iOS-achtige look) om per dag je **training** en **voedingsschema** af te vinken, plus een sectie voor **InBody metingen** en trendoverzicht.

## Starten (lokaal)

Service workers werken het best op `localhost`.

1. Start een server:

```bash
python3 -m http.server 5173
```

2. Open in je browser:

`http://localhost:5173`

## Installeren op iPhone (PWA)

1. Open de URL in **Safari** op iOS
2. Tik op **Deel**
3. Kies **Zet op beginscherm**

## Data

- Geen login, alles staat lokaal in `localStorage`.
- Backup/export en import vind je onder **Profiel**.

## Import

Deze eerste versie ondersteunt **CSV** import (Excel kan exporteren naar CSV).

Verwachte kolommen:

- `datum` (of `date`) in `YYYY-MM-DD` of `DD-MM-YYYY`
- `titel` (of `title`)
- `details` (optioneel)

Als je jouw **Excel (.xlsx)** uploadt, kan ik een importer bouwen die jouw exacte format leest.

