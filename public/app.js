// API base URL
const API_BASE = window.location.origin;

// DOM elements
const searchForm = document.getElementById('searchForm');
const originSelect = document.getElementById('origin');
const destinationSelect = document.getElementById('destination');
const departureDateInput = document.getElementById('departureDate');
const returnDateInput = document.getElementById('returnDate');
const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const resultsInfo = document.getElementById('resultsInfo');
const outboundFlightsDiv = document.getElementById('outboundFlights');
const outboundList = document.getElementById('outboundList');
const returnFlightsDiv = document.getElementById('returnFlights');
const returnList = document.getElementById('returnList');
const errorDiv = document.getElementById('error');

// Initialize app
async function init() {
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    departureDateInput.setAttribute('min', today);
    departureDateInput.value = today;
    returnDateInput.setAttribute('min', today);

    // Handle trip type change
    tripTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleTripTypeChange);
    });

    // Handle departure date change to update return date min
    departureDateInput.addEventListener('change', () => {
        returnDateInput.setAttribute('min', departureDateInput.value);
        if (returnDateInput.value && returnDateInput.value < departureDateInput.value) {
            returnDateInput.value = departureDateInput.value;
        }
    });

    // Load airports
    try {
        const response = await fetch(`${API_BASE}/api/airports`);
        const data = await response.json();

        // Populate origin dropdown
        Object.entries(data.origins).forEach(([code, info]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${info.name} (${code})`;
            originSelect.appendChild(option);
        });

        // Populate destination dropdown
        data.destinations.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest.code;
            option.textContent = `${dest.city} (${dest.code})`;
            destinationSelect.appendChild(option);
        });

        // Set default selections
        originSelect.value = 'NTL';
        destinationSelect.value = 'SYD';

    } catch (error) {
        showError('Failed to load airport data. Please refresh the page.');
        console.error('Init error:', error);
    }
}

// Handle trip type change
function handleTripTypeChange(e) {
    const isRoundTrip = e.target.value === 'round-trip';
    returnDateInput.disabled = !isRoundTrip;
    returnDateInput.required = isRoundTrip;

    if (isRoundTrip && !returnDateInput.value) {
        // Set return date to 7 days after departure
        const departureDate = new Date(departureDateInput.value);
        departureDate.setDate(departureDate.getDate() + 7);
        returnDateInput.value = departureDate.toISOString().split('T')[0];
    }
}

// Handle form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const origin = originSelect.value;
    const destination = destinationSelect.value;
    const departureDate = departureDateInput.value;
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const returnDate = tripType === 'round-trip' ? returnDateInput.value : null;

    if (!origin || !destination || !departureDate) {
        showError('Please fill in all required fields');
        return;
    }

    if (origin === destination) {
        showError('Departure and destination airports must be different');
        return;
    }

    if (tripType === 'round-trip' && !returnDate) {
        showError('Please select a return date');
        return;
    }

    if (returnDate && returnDate < departureDate) {
        showError('Return date must be on or after departure date');
        return;
    }

    await searchFlights(origin, destination, departureDate, returnDate);
});

// Search for flights
async function searchFlights(origin, destination, departureDate, returnDate) {
    // Hide previous results/errors
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    try {
        // Search outbound flights
        const outboundResponse = await fetch(`${API_BASE}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ origin, destination, date: departureDate })
        });

        if (!outboundResponse.ok) {
            const error = await outboundResponse.json();
            throw new Error(error.error || 'Search failed');
        }

        const outboundData = await outboundResponse.json();

        // Search return flights if round-trip
        let returnData = null;
        if (returnDate) {
            const returnResponse = await fetch(`${API_BASE}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: destination,  // Swap: return from destination to origin
                    destination: origin,
                    date: returnDate
                })
            });

            if (returnResponse.ok) {
                returnData = await returnResponse.json();
            }
        }

        displayResults(outboundData, returnData, origin, destination, departureDate, returnDate);

    } catch (error) {
        showError(error.message || 'Failed to search flights. Please try again.');
        console.error('Search error:', error);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display search results
function displayResults(outboundData, returnData, origin, destination, departureDate, returnDate) {
    const { flights: outboundFlights, note } = outboundData;

    if (!outboundFlights || outboundFlights.length === 0) {
        showError('No flights found for this route and date.');
        return;
    }

    // Clear previous results
    outboundList.innerHTML = '';
    returnList.innerHTML = '';

    // Update results info
    const originName = originSelect.options[originSelect.selectedIndex].text;
    const destName = destinationSelect.options[destinationSelect.selectedIndex].text;
    const formattedDepartureDate = new Date(departureDate + 'T00:00:00').toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let infoHTML = `Found ${outboundFlights.length} outbound flight${outboundFlights.length === 1 ? '' : 's'} from ${originName} to ${destName} on ${formattedDepartureDate}`;

    if (returnData && returnData.flights) {
        const formattedReturnDate = new Date(returnDate + 'T00:00:00').toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        infoHTML += ` and ${returnData.flights.length} return flight${returnData.flights.length === 1 ? '' : 's'} on ${formattedReturnDate}`;
    }

    if (note) {
        infoHTML += `<br><span style="color: #f57c00; font-weight: 600;">⚠ ${note}</span>`;
    }

    resultsInfo.innerHTML = infoHTML;

    // Display outbound flights
    outboundFlights.forEach((flight, index) => {
        const flightCard = createFlightCard(flight, index === 0);
        outboundList.appendChild(flightCard);
    });

    // Display return flights if available
    if (returnData && returnData.flights && returnData.flights.length > 0) {
        returnFlightsDiv.style.display = 'block';
        returnData.flights.forEach((flight, index) => {
            const flightCard = createFlightCard(flight, index === 0);
            returnList.appendChild(flightCard);
        });
    } else {
        returnFlightsDiv.style.display = 'none';
    }

    resultsDiv.style.display = 'block';
}

// Create flight card element
function createFlightCard(flight, isCheapest) {
    const card = document.createElement('div');
    card.className = `flight-card${isCheapest ? ' cheapest' : ''}`;

    card.innerHTML = `
        <div class="flight-airline">
            <div class="airline-name">${flight.airline}</div>
            <div class="flight-number">${flight.flightNumber}</div>
        </div>

        <div class="flight-details">
            <div class="time-info">
                <div class="time">${flight.departureTime}</div>
                <div class="airport">${flight.origin}</div>
            </div>

            <div class="flight-path">
                <div class="duration">${flight.duration}</div>
                <div class="arrow">✈️</div>
                ${flight.stops > 0 ? `<div class="duration">${flight.stops} stop${flight.stops > 1 ? 's' : ''}</div>` : '<div class="duration">Direct</div>'}
            </div>

            <div class="time-info">
                <div class="time">${flight.arrivalTime}</div>
                <div class="airport">${flight.destination}</div>
            </div>
        </div>

        <div class="flight-price">
            <div class="price">
                $${flight.price}
                <span class="currency">${flight.currency}</span>
            </div>
            ${isCheapest ? '<div class="best-price">✓ Best Price</div>' : ''}
        </div>
    `;

    return card;
}

// Show error message
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
}

// Initialize on page load
init();
