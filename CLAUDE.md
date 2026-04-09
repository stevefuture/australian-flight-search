# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Australian domestic flight search application for regional NSW airports (Newcastle, Port Macquarie, Coffs Harbour, Ballina) to all major Australian destinations. Supports both one-way and round-trip searches. Built with Node.js/Express backend and vanilla JavaScript frontend. **Installable as Progressive Web App (PWA) on iOS and Android devices.**

## Key Architecture

**Backend (server.js)**
- Express server with REST API endpoints
- Dual-mode operation: SerpApi (real Google Flights data) or mock data generator
- SerpApi integration fetches live pricing and schedules from Google Flights
- Mock data generates realistic flights with Australian carriers (QF, VA, JQ, ZL) as fallback
- All responses sorted by price (cheapest first)

**Frontend (public/)**
- Single-page application with no framework dependencies
- `app.js` handles API calls and DOM manipulation
- Responsive CSS grid layout in `style.css`
- PWA-enabled with manifest.json and service worker
- iOS-optimized with safe area support and touch targets

**Data Flow**
1. User selects trip type (one-way or round-trip), origin, destination, departure date, and optionally return date
2. Frontend makes one or two POST requests to `/api/search`:
   - Outbound: origin → destination on departure date
   - Return (if round-trip): destination → origin on return date
3. Server validates both origin and destination are valid airport codes (regional or major)
4. Server calls SerpApi to fetch real Google Flights data (if API key present)
5. If SerpApi succeeds, returns real flight data; otherwise falls back to mock data
6. Returns flights array sorted by price ascending with source indicator (serpapi/mock)
7. Frontend renders separate sections for outbound and return flights, each with cheapest highlighted

## Cost Optimization

**Response Caching (Implemented)**
- In-memory cache with configurable TTL (default: 10 minutes)
- Cache key: `origin-destination-date`
- Automatic expiration and cleanup every 5 minutes
- Typical API call reduction: 60-80% for popular routes
- Cache statistics tracked: hits, misses, hit rate, API calls saved

**Cache Configuration:**
- `CACHE_TTL_MINUTES` in `.env` controls cache duration
- Shorter TTL = fresher data, more API calls
- Longer TTL = more savings, slightly stale prices
- 10-15 minutes recommended for flight data

**Monitoring Endpoints:**
- `GET /api/cache/stats` - View cache performance metrics
- `POST /api/cache/clear` - Manually clear cache (for testing)

## Development Commands

**Install dependencies:**
```bash
npm install
```

**Start server (mock data mode):**
```bash
npm start
# or
node server.js
```
Server runs on http://localhost:3000

**Test API endpoints:**
```bash
# Health check
curl http://localhost:3000/api/health

# Search flights
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"origin":"NTL","destination":"SYD","date":"2026-04-15"}'

# Get airport lists
curl http://localhost:3000/api/airports

# View cache statistics
curl http://localhost:3000/api/cache/stats

# Clear cache (for testing)
curl -X POST http://localhost:3000/api/cache/clear
```

**Using real flight data (SerpApi):**
- API key already configured in `.env`
- SerpApi provides 250 free searches/month
- Fetches live data from Google Flights
- Automatic fallback to mock data if API limit reached
- To change API key: Update `SERPAPI_KEY` in `.env` file

## Airport Codes

**Regional Origins (hardcoded):**
- NTL = Newcastle (Williamtown)
- PQQ = Port Macquarie  
- CFS = Coffs Harbour
- BNK = Ballina Byron Gateway

**Destinations:** SYD, MEL, BNE, PER, ADL, CNS, DRW, HBA, OOL, MCY, AVV, CBR

## API Contract

### POST /api/search
**Request:**
```json
{
  "origin": "NTL",
  "destination": "SYD", 
  "date": "2026-04-15"
}
```

**Response:**
```json
{
  "flights": [
    {
      "id": "QF123-2026-04-15",
      "airline": "Qantas",
      "flightNumber": "QF123",
      "origin": "NTL",
      "destination": "SYD",
      "date": "2026-04-15",
      "departureTime": "08:30",
      "arrivalTime": "09:45",
      "duration": "1h 15m",
      "price": 150,
      "currency": "AUD",
      "stops": 0,
      "available": true
    }
  ],
  "source": "mock|serpapi|serpapi-cached",
  "note": "Optional warning/info message"
}
```

**Note:** `source` values:
- `serpapi` - Fresh data from Google Flights API (counted against quota)
- `serpapi-cached` - Cached data (no API call, saves quota)
- `mock` - Generated sample data (fallback)

## Important Implementation Details

- Mock data generator in `generateMockFlights()` creates 3-7 flights per search
- Qantas/Virgin have higher base prices ($200) vs Jetstar/Rex ($120)
- Flight times randomized between 6 AM - 9 PM
- All prices in AUD
- Frontend expects flights pre-sorted by price
- First flight in each direction automatically gets "Best Price" badge
- Date inputs constrained to today or future dates
- Return date must be on or after departure date
- Trip type radio buttons control return date field (disabled for one-way)
- Server accepts any valid airport code (regional or destination) as origin/destination
- Round-trip searches make two separate API calls (outbound + return)

## PWA Support (iOS/Android)

**Files:**
- `manifest.json` - PWA configuration, app name, icons, theme
- `service-worker.js` - Offline caching, network-first strategy
- `generate-icons.html` - Tool to create custom app icons
- iOS meta tags in index.html for Apple-specific features

**Installation:**
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Install App
- See IOS_INSTALLATION.md for detailed guide

**Features:**
- Standalone mode (no browser UI)
- Offline support for previously viewed pages
- Home screen icon
- iOS safe area support (notch/home indicator)
- 44px minimum touch targets for iOS

## File Locations

- Server logic: `/workshop/server.js`
- HTML: `/workshop/public/index.html`
- Styles: `/workshop/public/style.css`
- Frontend JS: `/workshop/public/app.js`
- PWA Manifest: `/workshop/public/manifest.json`
- Service Worker: `/workshop/public/service-worker.js`
- Config: `/workshop/.env` (create from `.env.example`)
