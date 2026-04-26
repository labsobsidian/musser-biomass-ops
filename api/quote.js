// /api/quote.js
//
// Pricing calculator — the real functional tool.
// Takes line items (products + load count) + delivery miles, returns an itemized quote.
//
// CRITICAL: The pricing logic here is the SAME logic documented in PRICING.md.
// PRICING.md is what Lumber Buddy and the GHL Conversation AI read to answer
// pricing questions in natural language. If you change the math here, update
// PRICING.md in the same commit. They must stay in sync.
//
// Musser sells in whole truckloads. One load = one product, one truck.
// Quantity in the request body = number of loads (integer).
//
// Request body:
// {
//   "items": [
//     { "sku": "forest_fuel_pellets", "quantity": 1 }
//   ],
//   "deliveryMiles": 522,
//   "customerType": "retail" | "wholesale" | "commercial"
// }

// --- PRICE BOOK ---
// Mirror of PRICING.md. If you edit here, edit PRICING.md too.
const PRICE_BOOK = {
  forest_fuel_pellets: {
    label: 'Forest Fuel Heating Pellets',
    unit: 'load',
    unitDetail: '1,100 bags @ 40 lb',
    perUnit: 5.20,
    perUnitLabel: 'bag',
    unitsPerLoad: 1100,
    pricePerLoad: 5720.00,
  },
  forest_fuel_briquettes: {
    label: 'Forest Fuel Briquettes',
    unit: 'load',
    unitDetail: '2,112 6-packs',
    perUnit: 2.50,
    perUnitLabel: '6-pack',
    unitsPerLoad: 2112,
    pricePerLoad: 5280.00,
  },
  alpha_fiber: {
    label: 'Alpha Fiber',
    unit: 'load',
    unitDetail: '1,170 bales @ 25 lb',
    perUnit: 5.30,
    perUnitLabel: 'bale',
    unitsPerLoad: 1170,
    pricePerLoad: 6201.00,
  },
};

// Freight pricing
const FREIGHT = {
  perMileRate: 2.95,        // $2.95 per mile
  minimumFreight: 0,        // No minimum
  fuelSurcharge: 0,         // No fuel surcharge
  // Each load = one truck. Multi-load orders to same destination charged
  // freight × loads (each load is its own trip).
};

// Customer-type adjustments — reserved for future use, all 0% for now
const CUSTOMER_DISCOUNTS = {
  retail: 0,
  commercial: 0,
  wholesale: 0,
};

function computeQuote({ items = [], deliveryMiles = 0, customerType = 'retail' }) {
  const custDiscount = CUSTOMER_DISCOUNTS[customerType] ?? 0;
  const lines = [];
  let subtotal = 0;
  let totalLoads = 0;

  for (const item of items) {
    const priceEntry = PRICE_BOOK[item.sku];
    if (!priceEntry) {
      lines.push({
        sku: item.sku,
        label: `UNKNOWN SKU: ${item.sku}`,
        quantity: item.quantity,
        unit: '-',
        unitPrice: 0,
        extendedPrice: 0,
        discountApplied: 0,
        error: 'SKU not found in price book'
      });
      continue;
    }

    // Whole loads only — round up to integer, minimum 1
    const requestedQty = Number(item.quantity) || 0;
    const loads = Math.max(1, Math.ceil(requestedQty));

    const totalDiscount = custDiscount;
    const effectiveLoadPrice = priceEntry.pricePerLoad * (1 - totalDiscount);
    const extended = round2(effectiveLoadPrice * loads);
    subtotal += extended;
    totalLoads += loads;

    lines.push({
      sku: item.sku,
      label: priceEntry.label,
      quantity: loads,
      unit: priceEntry.unit,
      unitDetail: priceEntry.unitDetail,
      unitPrice: priceEntry.pricePerLoad,
      effectiveUnitPrice: round2(effectiveLoadPrice),
      perUnit: priceEntry.perUnit,
      perUnitLabel: priceEntry.perUnitLabel,
      unitsPerLoad: priceEntry.unitsPerLoad,
      totalUnits: loads * priceEntry.unitsPerLoad,
      extendedPrice: extended,
      discountApplied: totalDiscount,
    });
  }

  // Freight calc — per-load, since each load is one truck trip
  const miles = Number(deliveryMiles) || 0;
  let freight = { miles, perLoad: 0, loads: 0, total: 0, note: 'Pickup — no delivery' };
  if (miles > 0 && totalLoads > 0) {
    const perLoad = round2(miles * FREIGHT.perMileRate);
    const total = round2(perLoad * totalLoads);
    freight = {
      miles,
      perMileRate: FREIGHT.perMileRate,
      perLoad,
      loads: totalLoads,
      total,
      note: totalLoads === 1
        ? `${miles} mi × $${FREIGHT.perMileRate}/mi`
        : `${miles} mi × $${FREIGHT.perMileRate}/mi × ${totalLoads} loads`
    };
  }

  const total = round2(subtotal + freight.total);

  return {
    customerType,
    lines,
    subtotal: round2(subtotal),
    totalLoads,
    delivery: freight, // keep key name "delivery" for UI compatibility
    total,
    notes: [
      'Whole-load pricing. Each load = one truck.',
      'Quote valid 14 days. Delivery subject to scheduling availability.',
      'No minimum freight, no fuel surcharge, no deadhead.'
    ]
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

// --- HTTP handler ---
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return the price book for UI consumption
    return res.status(200).json({
      priceBook: PRICE_BOOK,
      freight: FREIGHT,
      delivery: FREIGHT, // alias for UI compatibility
      customerDiscounts: CUSTOMER_DISCOUNTS
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const quote = computeQuote(req.body || {});
    res.status(200).json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Exported for potential reuse by other routes (e.g. a /api/voice-quote
// endpoint for a future voice agent).
export { computeQuote, PRICE_BOOK, FREIGHT, CUSTOMER_DISCOUNTS };
