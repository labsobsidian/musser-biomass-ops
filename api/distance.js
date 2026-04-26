// /api/distance.js
//
// ZIP-to-ZIP driving-mile estimator.
//
// Pipeline:
//   1. Look up centroid lat/lon for each ZIP via Zippopotam.us (free, no API key)
//   2. Compute great-circle (haversine) distance in miles
//   3. Multiply by 1.20 to estimate driving miles (well-established logistics rule of thumb)
//
// This is an ESTIMATE, not a routing-engine answer. Typical accuracy is within
// ~5% of Google Maps driving distance for most US-to-US shipping lanes.
// For precise mileage, swap to Google Distance Matrix API later.
//
// Request:  GET /api/distance?from=24368&to=13346
// Response: {
//   from: { zip, lat, lon, place },
//   to:   { zip, lat, lon, place },
//   greatCircleMiles: 480.7,
//   estimatedDrivingMiles: 577,    // rounded
//   method: "haversine_x_1.20",
//   cached: { from: false, to: true }
// }
//
// In-memory cache reduces external calls — most quotes are to the same
// destinations repeatedly. 24-hour TTL is safe; ZIP centroids basically never move.

const ZIP_CACHE = new Map(); // zip -> { lat, lon, place, fetchedAt }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DRIVING_MULTIPLIER = 1.20;

async function lookupZip(zip) {
  const now = Date.now();
  const cached = ZIP_CACHE.get(zip);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached, fromCache: true };
  }

  const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(`ZIP ${zip} not found`);
    }
    throw new Error(`Zippopotam returned ${resp.status} for ${zip}`);
  }
  const data = await resp.json();
  if (!data.places || data.places.length === 0) {
    throw new Error(`No place data for ZIP ${zip}`);
  }
  const place = data.places[0];
  const entry = {
    zip,
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude),
    place: `${place['place name']}, ${place['state abbreviation']}`,
    fetchedAt: now,
  };
  ZIP_CACHE.set(zip, entry);
  return { ...entry, fromCache: false };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function computeDistance({ from, to }) {
  if (!from || !to) throw new Error('Both from and to ZIPs are required');
  const fromZip = String(from).padStart(5, '0').slice(0, 5);
  const toZip = String(to).padStart(5, '0').slice(0, 5);

  if (!/^\d{5}$/.test(fromZip)) throw new Error(`Invalid from ZIP: ${from}`);
  if (!/^\d{5}$/.test(toZip)) throw new Error(`Invalid to ZIP: ${to}`);

  const [a, b] = await Promise.all([lookupZip(fromZip), lookupZip(toZip)]);
  const greatCircle = haversineMiles(a.lat, a.lon, b.lat, b.lon);
  const driving = Math.round(greatCircle * DRIVING_MULTIPLIER);

  return {
    from: { zip: a.zip, lat: a.lat, lon: a.lon, place: a.place },
    to: { zip: b.zip, lat: b.lat, lon: b.lon, place: b.place },
    greatCircleMiles: Math.round(greatCircle * 10) / 10,
    estimatedDrivingMiles: driving,
    method: `haversine_x_${DRIVING_MULTIPLIER}`,
    cached: { from: a.fromCache, to: b.fromCache },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const from = req.query?.from;
    const to = req.query?.to;
    const result = await computeDistance({ from, to });
    res.status(200).json(result);
  } catch (err) {
    const status = err.message.includes('not found') || err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
}

export { computeDistance, lookupZip, haversineMiles, DRIVING_MULTIPLIER };
