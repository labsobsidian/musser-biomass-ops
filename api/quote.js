// /api/quote.js
//
// Pricing calculator — the real functional tool.
// Takes line items + delivery miles, returns an itemized quote.
//
// CRITICAL: The pricing logic here is the SAME logic documented in PRICING.md.
// PRICING.md is what Lumber Buddy and the GHL Conversation AI read to answer
// pricing questions in natural language. If you change the math here, update
// PRICING.md in the same commit. They must stay in sync.
//
// This endpoint is called two ways:
//   1. Directly from the Lumber Buddy UI (Pricing tab calculator)
//   2. Could be called from GHL via an external action / n8n node
//
// Request body:
// {
//   "items": [
//     { "sku": "firewood_seasoned_oak", "quantity": 2 },
//     { "sku": "bundled_kiln_dried", "quantity": 40 }
//   ],
//   "deliveryMiles": 18,
//   "customerType": "retail" | "wholesale" | "commercial"
// }

// --- PRICE BOOK ---
// Mirror of PRICING.md. If you edit here, edit PRICING.md too.
// All placeholders — swap with real Musser numbers when provided.
const PRICE_BOOK = {
  // Firewood — sold by the cord (128 cu ft)
  firewood_seasoned_oak:       { label: 'Seasoned Oak Firewood',       unit: 'cord', price: 285.00 },
  firewood_seasoned_mixed:     { label: 'Seasoned Mixed Hardwood',     unit: 'cord', price: 245.00 },
  firewood_green_mixed:        { label: 'Green Mixed Hardwood',        unit: 'cord', price: 195.00 },
  firewood_kiln_dried_bulk:    { label: 'Kiln-Dried Firewood (bulk)',  unit: 'cord', price: 365.00 },

  // Bundled firewood — sold by the bundle (~0.75 cu ft)
  bundled_kiln_dried:          { label: 'Kiln-Dried Bundle (0.75 cu ft)', unit: 'bundle', price: 7.50 },
  bundled_camp_pack:           { label: 'Campground Pack (case of 12)',   unit: 'case',   price: 72.00 },

  // Mulch — sold by the cubic yard
  mulch_hardwood_double:       { label: 'Double-Ground Hardwood Mulch', unit: 'yard', price: 38.00 },
  mulch_dyed_black:            { label: 'Dyed Black Mulch',             unit: 'yard', price: 48.00 },
  mulch_dyed_brown:            { label: 'Dyed Brown Mulch',             unit: 'yard', price: 48.00 },
  mulch_playground:            { label: 'Certified Playground Mulch',   unit: 'yard', price: 58.00 },

  // Bark & landscape
  bark_nuggets:                { label: 'Pine Bark Nuggets',            unit: 'yard', price: 52.00 },
  bark_fines:                  { label: 'Pine Bark Fines',              unit: 'yard', price: 42.00 },

  // Byproducts & industrial
  sawdust_bulk:                { label: 'Bulk Sawdust',                 unit: 'yard', price: 22.00 },
  wood_chips_bulk:             { label: 'Bulk Wood Chips',              unit: 'yard', price: 28.00 },
};

// Delivery pricing
const DELIVERY = {
  freeRadiusMiles: 10,        // Free within 10 miles
  perMileRate: 4.50,          // $4.50 per mile beyond free radius
  minimumDeliveryFee: 35.00,  // Minimum once you're past the free radius
  loadingSurcharge: 25.00,    // One-time loading fee for any delivery
};

// Volume discounts by customer type
const CUSTOMER_DISCOUNTS = {
  retail: 0,          // No discount
  wholesale: 0.12,    // 12% off list
  commercial: 0.08,   // 8% off list
};

// Bulk thresholds (applied on top of customer discount)
// Firewood: 5+ cords = extra 5% off. Mulch: 10+ yards = extra 5% off.
function bulkDiscount(sku, qty) {
  if (sku.startsWith('firewood_') && qty >= 5) return 0.05;
  if (sku.startsWith('mulch_')    && qty >= 10) return 0.05;
  return 0;
}

function computeQuote({ items = [], deliveryMiles = 0, customerType = 'retail' }) {
  const custDiscount = CUSTOMER_DISCOUNTS[customerType] ?? 0;
  const lines = [];
  let subtotal = 0;

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
    const qty = Number(item.quantity) || 0;
    const bulk = bulkDiscount(item.sku, qty);
    const totalDiscount = custDiscount + bulk;
    const effectiveUnit = priceEntry.price * (1 - totalDiscount);
    const extended = round2(effectiveUnit * qty);
    subtotal += extended;

    lines.push({
      sku: item.sku,
      label: priceEntry.label,
      quantity: qty,
      unit: priceEntry.unit,
      unitPrice: priceEntry.price,
      effectiveUnitPrice: round2(effectiveUnit),
      extendedPrice: extended,
      discountApplied: totalDiscount,
      discountBreakdown: {
        customer: custDiscount,
        bulk: bulk
      }
    });
  }

  // Delivery calc
  const miles = Number(deliveryMiles) || 0;
  let delivery = { miles, base: 0, loading: 0, total: 0, note: 'Pickup — no delivery' };
  if (miles > 0) {
    const billableMiles = Math.max(0, miles - DELIVERY.freeRadiusMiles);
    const mileageFee = round2(billableMiles * DELIVERY.perMileRate);
    const base = billableMiles > 0 ? Math.max(mileageFee, DELIVERY.minimumDeliveryFee) : 0;
    delivery = {
      miles,
      freeRadiusMiles: DELIVERY.freeRadiusMiles,
      billableMiles,
      perMileRate: DELIVERY.perMileRate,
      base,
      loading: DELIVERY.loadingSurcharge,
      total: round2(base + DELIVERY.loadingSurcharge),
      note: billableMiles === 0
        ? `Within ${DELIVERY.freeRadiusMiles}-mile free delivery radius — loading fee only`
        : `${billableMiles} billable miles @ $${DELIVERY.perMileRate}/mi + $${DELIVERY.loadingSurcharge} loading`
    };
  }

  const total = round2(subtotal + delivery.total);

  return {
    customerType,
    lines,
    subtotal: round2(subtotal),
    delivery,
    total,
    notes: [
      'Placeholder pricing — confirm against PRICING.md before quoting to customer.',
      'Quote valid 14 days. Delivery subject to scheduling availability.'
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
      delivery: DELIVERY,
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
export { computeQuote, PRICE_BOOK, DELIVERY, CUSTOMER_DISCOUNTS };
