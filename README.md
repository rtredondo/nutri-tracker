# nutri-tracker

A responsive React nutrition tracking web app that syncs with a Google Sheets database via Google Apps Script. Log daily meals, track macronutrients, and view weekly trends.

## Features

- **Today View**: Track daily meals with searchable food picker and live nutrient computation
- **Week View**: Weekly summary with bar chart and day-by-day breakdown
- **Settings**: Configure daily targets, refresh food database, view API config
- **Smart null handling**: Properly distinguishes between unmeasured (null) and zero nutrients
- **Coverage indicators**: Shows what fraction of data is available for each nutrient
- **Offline support**: Caches base data and unsaved edits in localStorage
- **Mobile-first**: Responsive design for phone and desktop

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_API_TOKEN=your_shared_secret_token_here
```

- **VITE_API_URL**: The deployment URL of your Google Apps Script Web App
- **VITE_API_TOKEN**: A shared secret string for API authentication (must match the script's validation)

### 3. Development

```bash
npm run dev
```

Runs on `http://localhost:5173` with hot module replacement.

### 4. Tests

```bash
npm run test
```

Unit tests for nutrient maths, especially null handling and coverage calculation.

## API Contract

The app communicates with a Google Apps Script that provides three endpoints:

### GET `/exec?token={TOKEN}&action=base`

Returns base data:

```json
{
  "ok": true,
  "foods": [
    {
      "food_id": "F001",
      "food_name": "Café, infusão 10%",
      "category": "Bebida",
      "source": "TACO",
      "basis_qty": 100,
      "basis_unit": "ml",
      "kcal": 9,
      "protein_g": 1.3,
      "fat_g": 0,
      "sat_fat_g": null,
      "carbs_g": 1.3,
      "sugars_g": null,
      "fibre_g": null,
      "salt_g": null,
      "notes": "optional"
    }
  ],
  "cardapio": [
    {
      "meal": "1. Breakfast",
      "food_id": "F001",
      "food_name": "Café, infusão 10%",
      "qty": 80,
      "unit": "ml",
      "kcal": 7.2,
      "protein_g": 1.04,
      ...
    }
  ]
}
```

The app caches this data (24hr TTL) and uses the cached default menu if no log exists for a date.

### GET `/exec?token={TOKEN}&action=log&from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns logs for a date range:

```json
{
  "ok": true,
  "entries": [
    {
      "meal": "1. Breakfast",
      "food_id": "F001",
      "food_name": "Café, infusão 10%",
      "qty": 80,
      "unit": "ml",
      "kcal": 7.2,
      "protein_g": 1.04,
      "fat_g": 0,
      "sat_fat_g": null,
      "carbs_g": 1.04,
      "sugars_g": null,
      "fibre_g": null,
      "salt_g": null
    }
  ]
}
```

### POST `/exec?token={TOKEN}`

Saves a day's log (replaces the entire date):

```json
{
  "action": "saveDay",
  "date": "2026-01-15",
  "entries": [
    {
      "meal": "1. Breakfast",
      "food_id": "F001",
      "food_name": "Café, infusão 10%",
      "qty": 80,
      "unit": "ml",
      "kcal": 7.2,
      "protein_g": 1.04,
      "fat_g": 0,
      "sat_fat_g": null,
      "carbs_g": 1.04,
      "sugars_g": null,
      "fibre_g": null,
      "salt_g": null
    }
  ]
}
```

Response:

```json
{
  "ok": true,
  "date": "2026-01-15",
  "rows": 1
}
```

**IMPORTANT**: Send POST with `Content-Type: text/plain;charset=utf-8` to avoid CORS preflight. The server parses the raw JSON body.

## Null vs Zero

- **null** = unmeasured (not in database)
- **0** = genuine zero (e.g., fat-free item)

The app preserves this distinction:
- `null × quantity = null` (never 0)
- Totals sum only non-null values
- If all contributing values are null, the total displays as "—"
- Coverage indicator shows % of items with data for that nutrient

This prevents the silent reporting of unmeasured nutrients as zero.

## Nutrient Tracking

**Primary nutrients** (always visible):
- kcal
- protein_g
- fat_g
- carbs_g

**Secondary nutrients** (collapsed by default):
- sat_fat_g
- sugars_g
- fibre_g
- salt_g

**Meals** (in fixed order):
1. Breakfast
2. Almoço (Lunch)
3. Lanche Tarde (Afternoon Snack)
4. Jantar (Dinner)
5. Colação (Late Snack)

## Building for Production

```bash
npm run build
```

Outputs to `dist/`. Ready for static hosting.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit: nutri-tracker"
git remote add origin https://github.com/username/nutri-tracker.git
git push -u origin main
```

### 2. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New → Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite

### 3. Set Environment Variables

In Vercel project settings:

- **VITE_API_URL**: `https://script.google.com/macros/d/{SCRIPT_ID}/usercopy/exec`
- **VITE_API_TOKEN**: Your shared secret (use Vercel secrets feature for sensitive values)

### 4. Deploy

Vercel auto-deploys on push to main. Your app is live at `https://nutri-tracker.vercel.app`.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build and dev server
- **Tailwind CSS** for styling
- **Recharts** for charts
- **Vitest** for testing
- **localStorage** for caching (no backend database)

## Notes

- The app never edits the food database—food data is read-only and sourced from the spreadsheet
- Daily edits are cached in localStorage and synced to the spreadsheet on save
- The API token is required but not used for auth; it's a simple shared secret for script-to-app validation
- Mobile experience is optimized: quantity inputs use `inputMode="decimal"` and tap targets are comfortable
- Dark mode is supported via Tailwind's `dark:` classes

## License

MIT
