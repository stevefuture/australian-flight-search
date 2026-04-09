# Australian Flight Search

A web application to search for domestic flights from regional NSW airports (Newcastle, Port Macquarie, Coffs Harbour, and Ballina) to destinations across Australia.

## Features

- 🛫 Search flights from 4 regional NSW airports (NTL, PQQ, CFS, BNK)
- 🎯 Coverage of 12+ major Australian domestic destinations
- 🔄 One-way and round-trip flight searches
- 💰 Results sorted by price (cheapest first)
- 📅 Date picker for flexible travel planning
- ✈️ Automatic return flight search (return flights go back to origin)
- 📱 **iOS App Support** - Install as PWA on iPhone/iPad
- 🎭 Realistic mock data for demonstration and development

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Application

```bash
npm start
```

The app will run on http://localhost:3000 with realistic mock flight data.

### 3. Install on iOS (iPhone/iPad)

The app works as a Progressive Web App on iOS devices:

1. **Open in Safari** (must use Safari, not Chrome)
2. Tap the Share button (□↑)
3. Tap **"Add to Home Screen"**
4. Tap **"Add"**

The app will appear on your home screen like a native app! See [IOS_INSTALLATION.md](IOS_INSTALLATION.md) for detailed instructions.

### 3. Real Flight Data with SerpApi

**✅ Now Live:** The app uses **SerpApi** to fetch real flight data from Google Flights!

**Your SerpApi Status:**
- API Key: Configured and working
- Free Tier: 250 searches/month included
- Data Source: Google Flights (real-time prices and schedules)
- Coverage: All Australian domestic routes

**Pricing Plans:**
- **Free**: 250 searches/month (current)
- **Starter**: $25/month - 1,000 searches
- **Developer**: $75/month - 5,000 searches  
- **Production**: $150/month - 15,000 searches

The app automatically falls back to mock data if API limits are reached or if no flights are found for a route.

## Cost Optimization Features

**✅ Intelligent Response Caching:**
- Flight search results are cached for 10 minutes (configurable)
- **Typical savings: 60-80%** reduction in API calls for popular routes
- Example: 1,000 searches → ~200-400 API calls (saving ~$1.50-2.00)
- Cache hit rate visible at `/api/cache/stats`

**Configuration:**
- Adjust cache duration: Set `CACHE_TTL_MINUTES` in `.env` (default: 10 minutes)
- Flight prices update slowly, so 10-15 minute caching is safe
- Clear cache manually: `POST /api/cache/clear`

**Monitoring:**
```bash
# View cache performance
curl http://localhost:3000/api/cache/stats
```

## Regional Airports Covered

- **NTL** - Newcastle (Williamtown)
- **PQQ** - Port Macquarie
- **CFS** - Coffs Harbour
- **BNK** - Ballina Byron Gateway

## Destinations

Sydney, Melbourne, Brisbane, Perth, Adelaide, Cairns, Darwin, Hobart, Gold Coast, Sunshine Coast, Avalon, Canberra

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (no framework needed)
- **Data**: Mock flight data generator
- **Styling**: Custom CSS with responsive design

## Mock Flight Data

The application includes a sophisticated mock data generator that provides:
- Realistic Australian domestic flight schedules
- Major carriers: Qantas, Virgin Australia, Jetstar, Rex
- Price ranges matching typical Australian domestic fares
- Random flight times between 6 AM - 9 PM
- Duration calculations based on typical routes
- 3-7 flights per route search
- Results sorted by price (cheapest first)

The mock data is perfect for:
- Development and testing
- Demonstration purposes
- UI/UX prototyping
- Understanding the application flow without API costs

## Project Structure

```
/workshop
├── server.js           # Express server & API endpoints
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── public/
│   ├── index.html      # Main HTML page
│   ├── style.css       # Styling
│   └── app.js          # Frontend JavaScript
└── README.md           # This file
```

## API Endpoints

- `GET /api/airports` - Get list of available airports
- `POST /api/search` - Search for flights
  - Body: `{ origin, destination, date }`
- `GET /api/health` - Health check

## Development Notes

- Prices are displayed in AUD
- Results are automatically sorted from cheapest to most expensive
- The cheapest flight is highlighted with a green border
- Responsive design works on mobile and desktop

## Limitations

- Single passenger searches only
- Dates must be today or in the future
- Regional airports may have limited direct routes
- Return flights automatically go back to the original departure airport

## Future Enhancements

- Multi-passenger support
- Flight filtering (direct flights only, time of day, airline)
- Price alerts and tracking
- Integration with additional APIs for broader coverage
