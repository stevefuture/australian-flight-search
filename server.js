const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Regional airports configuration
const REGIONAL_AIRPORTS = {
  'NTL': { name: 'Newcastle (Williamtown)', city: 'Newcastle' },
  'PQQ': { name: 'Port Macquarie', city: 'Port Macquarie' },
  'CFS': { name: 'Coffs Harbour', city: 'Coffs Harbour' },
  'BNK': { name: 'Ballina Byron Gateway', city: 'Ballina' }
};

// Major Australian domestic destinations
const DESTINATIONS = [
  { code: 'SYD', name: 'Sydney', city: 'Sydney' },
  { code: 'MEL', name: 'Melbourne', city: 'Melbourne' },
  { code: 'BNE', name: 'Brisbane', city: 'Brisbane' },
  { code: 'PER', name: 'Perth', city: 'Perth' },
  { code: 'ADL', name: 'Adelaide', city: 'Adelaide' },
  { code: 'CNS', name: 'Cairns', city: 'Cairns' },
  { code: 'DRW', name: 'Darwin', city: 'Darwin' },
  { code: 'HBA', name: 'Hobart', city: 'Hobart' },
  { code: 'OOL', name: 'Gold Coast', city: 'Gold Coast' },
  { code: 'MCY', name: 'Sunshine Coast', city: 'Sunshine Coast' },
  { code: 'AVV', name: 'Avalon', city: 'Melbourne (Avalon)' },
  { code: 'CBR', name: 'Canberra', city: 'Canberra' }
];

// Flight API initialization - SerpApi for Google Flights data
const SerpApi = require('google-search-results-nodejs');
const serpApiKey = process.env.SERPAPI_KEY;
const search = serpApiKey ? new SerpApi.GoogleSearch(serpApiKey) : null;

if (serpApiKey) {
  console.log('✓ SerpApi initialized for real flight data via Google Flights');
} else {
  console.log('✓ Using mock flight data generator');
}

// Cache configuration
const CACHE_TTL_MINUTES = parseInt(process.env.CACHE_TTL_MINUTES || '10'); // Default 10 minutes
const flightCache = new Map();
const cacheStats = { hits: 0, misses: 0, apiCalls: 0 };

// Cache helper functions
function getCacheKey(origin, destination, date) {
  return `${origin}-${destination}-${date}`;
}

function getCachedFlights(origin, destination, date) {
  const key = getCacheKey(origin, destination, date);
  const cached = flightCache.get(key);

  if (!cached) {
    cacheStats.misses++;
    return null;
  }

  // Check if cache entry has expired
  const now = Date.now();
  if (now > cached.expiresAt) {
    flightCache.delete(key);
    cacheStats.misses++;
    return null;
  }

  cacheStats.hits++;
  console.log(`✓ Cache hit for ${key} (${cacheStats.hits} hits, ${cacheStats.misses} misses, ${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}% hit rate)`);
  return cached.data;
}

function setCachedFlights(origin, destination, date, flights) {
  const key = getCacheKey(origin, destination, date);
  const expiresAt = Date.now() + (CACHE_TTL_MINUTES * 60 * 1000);

  flightCache.set(key, {
    data: flights,
    expiresAt,
    cachedAt: Date.now()
  });

  console.log(`✓ Cached ${flights.length} flights for ${key} (expires in ${CACHE_TTL_MINUTES} min)`);
}

// Periodic cache cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of flightCache.entries()) {
    if (now > value.expiresAt) {
      flightCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`✓ Cleaned ${cleaned} expired cache entries`);
  }
}, 5 * 60 * 1000);

// Fetch flights from SerpApi (Google Flights)
function fetchSerpApiFlights(origin, destination, date) {
  return new Promise((resolve, reject) => {
    if (!search) {
      return resolve(null);
    }

    const params = {
      engine: 'google_flights',
      departure_id: origin,
      arrival_id: destination,
      outbound_date: date,
      type: '2', // 2 = one-way flight
      currency: 'AUD',
      hl: 'en'
    };

    search.json(params, (data) => {
      try {
        // Check for API errors
        if (data.error) {
          console.error('SerpApi error:', data.error);
          return resolve(null);
        }

        if (!data.best_flights && !data.other_flights) {
          return resolve(null);
        }

        // Combine best and other flights
        const allFlights = [
          ...(data.best_flights || []),
          ...(data.other_flights || [])
        ];

        if (allFlights.length === 0) {
          return resolve(null);
        }

        // Transform SerpApi response to our format
        const flights = allFlights.map((flight, index) => {
          const firstLeg = flight.flights[0];
          const lastLeg = flight.flights[flight.flights.length - 1];

          // Calculate duration in minutes
          const durationMinutes = flight.total_duration || 0;
          const hours = Math.floor(durationMinutes / 60);
          const mins = durationMinutes % 60;

          // Extract time from departure/arrival (format: "2026-04-20 07:05" or "6:00 AM")
          const extractTime = (timeString) => {
            if (!timeString) return '00:00';
            const str = timeString.trim();

            // Check if it contains a date (YYYY-MM-DD)
            if (str.includes('-') && str.includes(':')) {
              // Format: "2026-04-15 07:05" - extract time part
              const parts = str.split(' ');
              if (parts.length === 2) {
                return parts[1]; // Return just the time
              }
            }

            // Check if it's in AM/PM format
            if (str.includes('AM') || str.includes('PM')) {
              const parts = str.split(' ');
              if (parts.length >= 2) {
                // Last part is AM/PM, second-to-last is time
                const timePart = parts[parts.length - 2];
                const ampm = parts[parts.length - 1];
                return `${timePart} ${ampm}`;
              }
            }

            return str;
          };

          return {
            id: `${firstLeg.flight_number || index}-${date}`,
            airline: firstLeg.airline || 'Unknown',
            flightNumber: firstLeg.flight_number || `FL${index}`,
            origin: firstLeg.departure_airport.id,
            destination: lastLeg.arrival_airport.id,
            date: date,
            departureTime: extractTime(firstLeg.departure_airport.time),
            arrivalTime: extractTime(lastLeg.arrival_airport.time),
            duration: `${hours}h ${mins}m`,
            price: flight.price || 0,
            currency: 'AUD',
            stops: flight.flights.length - 1,
            available: true
          };
        });

        resolve(flights.sort((a, b) => a.price - b.price));
      } catch (error) {
        console.error('SerpApi parsing error:', error.message);
        resolve(null);
      }
    });
  });
}

// Generate mock flight data
function generateMockFlights(origin, destination, date) {
  const airlines = ['QF', 'VA', 'JQ', 'ZL']; // Qantas, Virgin, Jetstar, Rex
  const airlineNames = {
    'QF': 'Qantas',
    'VA': 'Virgin Australia',
    'JQ': 'Jetstar',
    'ZL': 'Rex'
  };

  const flights = [];
  const numFlights = Math.floor(Math.random() * 5) + 3; // 3-7 flights

  for (let i = 0; i < numFlights; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = `${airline}${Math.floor(Math.random() * 900) + 100}`;

    // Random departure time
    const hour = Math.floor(Math.random() * 15) + 6; // 6 AM - 9 PM
    const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    const departureTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // Random duration (1-4 hours)
    const durationMinutes = Math.floor(Math.random() * 180) + 60;
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;

    // Calculate arrival time
    const arrivalHour = (hour + durationHours + Math.floor((minute + durationMins) / 60)) % 24;
    const arrivalMinute = (minute + durationMins) % 60;
    const arrivalTime = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}`;

    // Random price based on airline (Qantas/Virgin more expensive)
    let basePrice = airline === 'QF' || airline === 'VA' ? 200 : 120;
    const price = Math.floor(basePrice + Math.random() * 150);

    flights.push({
      id: `${flightNumber}-${date}`,
      airline: airlineNames[airline],
      flightNumber: flightNumber,
      origin: origin,
      destination: destination,
      date: date,
      departureTime: departureTime,
      arrivalTime: arrivalTime,
      duration: `${durationHours}h ${durationMins}m`,
      price: price,
      currency: 'AUD',
      stops: 0,
      available: true
    });
  }

  // Sort by price
  return flights.sort((a, b) => a.price - b.price);
}

// Search flights endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { origin, destination, date } = req.body;

    // Validate inputs
    if (!origin || !destination || !date) {
      return res.status(400).json({
        error: 'Missing required fields: origin, destination, date'
      });
    }

    // Validate origin and destination are valid airport codes
    const allAirportCodes = [
      ...Object.keys(REGIONAL_AIRPORTS),
      ...DESTINATIONS.map(d => d.code)
    ];

    if (!allAirportCodes.includes(origin)) {
      return res.status(400).json({
        error: 'Invalid origin airport code'
      });
    }

    if (!allAirportCodes.includes(destination)) {
      return res.status(400).json({
        error: 'Invalid destination airport code'
      });
    }

    console.log(`Searching flights: ${origin} → ${destination} on ${date}`);

    // Check cache first
    const cachedFlights = getCachedFlights(origin, destination, date);
    if (cachedFlights) {
      return res.json({
        flights: cachedFlights,
        source: 'serpapi-cached',
        note: 'Real flight data from Google Flights (cached)'
      });
    }

    // Try SerpApi if available
    if (serpApiKey) {
      cacheStats.apiCalls++;
      const flights = await fetchSerpApiFlights(origin, destination, date);

      if (flights && flights.length > 0) {
        // Cache the results
        setCachedFlights(origin, destination, date, flights);

        return res.json({
          flights,
          source: 'serpapi',
          note: 'Real flight data from Google Flights via SerpApi'
        });
      } else {
        console.log('No flights found via SerpApi');
        return res.json({
          flights: [],
          source: 'serpapi',
          note: 'No flights available for this route and date. Try different dates or check for connecting flights.'
        });
      }
    }

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search flights' });
  }
});

// Get airport lists
app.get('/api/airports', (req, res) => {
  res.json({
    origins: REGIONAL_AIRPORTS,
    destinations: DESTINATIONS
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serpApiEnabled: !!serpApiKey,
    dataSource: serpApiKey ? 'serpapi' : 'mock',
    cacheEnabled: true,
    cacheTTL: `${CACHE_TTL_MINUTES} minutes`
  });
});

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests > 0 ? ((cacheStats.hits / totalRequests) * 100).toFixed(1) : 0;
  const apiCallsSaved = cacheStats.hits;
  const estimatedCostSavings = apiCallsSaved * 0.002; // Rough estimate at $0.002 per API call

  res.json({
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
    totalRequests,
    hitRate: `${hitRate}%`,
    apiCallsMade: cacheStats.apiCalls,
    apiCallsSaved,
    cachedRoutes: flightCache.size,
    cacheTTL: `${CACHE_TTL_MINUTES} minutes`,
    estimatedCostSavings: `$${estimatedCostSavings.toFixed(2)}`
  });
});

// Clear cache endpoint (for testing/admin)
app.post('/api/cache/clear', (req, res) => {
  const sizeBefore = flightCache.size;
  flightCache.clear();
  console.log(`✓ Cache cleared (${sizeBefore} entries removed)`);

  res.json({
    message: 'Cache cleared successfully',
    entriesRemoved: sizeBefore
  });
});

app.listen(PORT, () => {
  console.log(`🛫 Australian Flight Search running on http://localhost:${PORT}`);
  console.log(`📍 Regional airports: ${Object.keys(REGIONAL_AIRPORTS).join(', ')}`);
  console.log(`🎯 Destinations: ${DESTINATIONS.length} cities`);
});
