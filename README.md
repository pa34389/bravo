# Bravo - Australian Grocery Price Tracker

Compare Woolworths & Coles prices on 50 everyday staples. Mobile-first PWA — install it on your phone, no app store needed.

## Quick Start (5 minutes)

### 1. Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Run it to create all tables
4. Go to **Settings > API** and copy your **Project URL** and **anon/public key**

### 2. Configure environment

```bash
# Scraper config
cp .env.example scraper/.env
# Edit scraper/.env with your SUPABASE_URL and SUPABASE_SERVICE_KEY

# Frontend config
# Edit web/.env.local with your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Seed demo data

```bash
cd scraper
pip install -r requirements.txt
python -m scraper.main demo
```

This inserts 50 items with 31 days of realistic price history for development.

### 4. Run the frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same WiFi) or browser.

## Deployment (free)

### Frontend → Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Set root directory to `web`
4. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy — you get a URL like `bravo-xyz.vercel.app`

### Scraper → GitHub Actions

1. Go to your GitHub repo → Settings → Secrets
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. The scraper runs automatically at 6am AEST daily
4. You can also trigger manually: Actions → Daily Price Scrape → Run workflow

### Share with testers

Send them the Vercel URL. On iPhone: open in Safari → Share → "Add to Home Screen". It installs as a native-feeling app with the Bravo icon.

## Project Structure

```
bravo/
  scraper/          Python price scrapers + intelligence engine
  web/              Next.js PWA frontend
  supabase/         Database migrations
  .github/          GitHub Actions for daily scraping
```

## Tech Stack

- **Frontend**: Next.js 16, Tailwind CSS v4, Motion, Recharts, Zustand
- **Database**: Supabase (PostgreSQL)
- **Scraper**: Python (httpx)
- **Hosting**: Vercel (frontend) + GitHub Actions (scraper) — all free tier

## Commands

| Command | What it does |
|---|---|
| `python -m scraper.main seed` | Insert 50 items into DB |
| `python -m scraper.main scrape` | Scrape live prices from Woolworths & Coles |
| `python -m scraper.main demo` | Insert demo data (31 days of history) |
| `cd web && npm run dev` | Start frontend dev server |
| `cd web && npm run build` | Production build |
