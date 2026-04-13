# OPIS — On-Chain Predator Intelligence System

Production-grade monitoring backend + live dashboard built on AVE Data API.

## What Runs Continuously
- 30s ingestion cycle for watchlist analysis.
- 5m watchlist auto-refresh from live trending tokens.
- 10s frontend refresh for dashboard and signal feed.
- Optional SSE stream endpoint: `GET /api/monitoring/stream`.

## Quant Modules (Live)
- `Cabal Fingerprinter`
- `DEV Drain Velocity`
- `Smart Money Conviction Stack`
- `Cross-Chain Narrative Radar`
- `DCA Accumulation Engine` (new)

## Composite Strategy Output
Each token snapshot includes:
- `TOS score` (weighted composite)
- `strategy.mode` (`DEFENSIVE_EXIT`, `OPPORTUNITY_ENTRY`, `DCA_ACCUMULATION`, `MONITOR`)
- `strategy.confidence`

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env
```

3. Set your AVE key in `.env`:
```bash
AVE_DATA_API_KEY=YOUR_REAL_KEY
```

## Run
1. Start backend monitoring engine:
```bash
npm run server:dev
```

2. Start frontend:
```bash
npm run dev
```

Frontend: `http://localhost:8080`
Backend health: `http://localhost:4090/health`

## Validate
- Backend typecheck:
```bash
npm run typecheck:backend
```
- Frontend build:
```bash
npm run build
```
