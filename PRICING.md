# PRICING.md — Musser Biomass
_Last updated: 2026-04-26_
_Authoritative pricing source. Used by: Lumber Buddy brain, `/api/quote` endpoint, and the GHL Conversation AI prompt._

---

## How to use this document

**For the team:** This is the single source of truth for product pricing. When prices change, change them here. The Lumber Buddy chat reads this doc automatically. The pricing calculator in `/api/quote.js` mirrors this table — **update both in the same commit** or the two will drift.

**For AI agents:** When a customer asks about pricing, quote from this table. Show your work (loads × unit price + freight = total). If a product or quantity isn't listed here, say "Let me get you a quote from the team" — do not invent numbers.

---

## Product price list

Everything Musser ships goes out as **full truckloads**. One load = one product, one truck.

| SKU | Product | Per-unit price | Units per load | Price per load |
|---|---|---|---|---|
| `forest_fuel_pellets` | Forest Fuel Heating Pellets (40 lb bag) | $5.20 / bag | 1,100 bags | $5,720.00 |
| `forest_fuel_briquettes` | Forest Fuel Briquettes (6-pack) | $2.50 / 6-pack | 2,112 packs | $5,280.00 |
| `alpha_fiber` | Alpha Fiber (25 lb bale) | $5.30 / bale | 1,170 bales | $6,201.00 |

**Quantity is sold in whole loads only.** A customer ordering "half a load" gets quoted for one full load (or referred to the team for a custom arrangement).

---

## Freight

- **Rate:** $2.95 per mile
- **No minimum freight charge**
- **No fuel surcharge**
- **No deadhead** (no charge for the return leg)
- Each load = one truck trip. Multi-load orders to the same destination are quoted with freight × number of loads (since each load is its own truck).

**Examples:**

- Hamilton, NY (~522 mi) → freight = 522 × $2.95 = **$1,540** per load
- Spartansburg, PA (~372 mi) → freight = 372 × $2.95 = **$1,097.40** per load

---

## Customer-type adjustments

Reserved for future use — currently every customer gets the same pricing.

| Customer type | Adjustment |
|---|---|
| Retail (default) | 0% |
| Commercial | 0% |
| Wholesale | 0% |

When Musser sets actual differentiated rates, update both this table and the corresponding values in `/api/quote.js`.

---

## Worked examples (matches real shipments)

**Example 1 — Town & Country Store (Hamilton, NY)**

- 1 load Forest Fuel Heating Pellets (1,100 bags @ $5.20)
- Distance: ~522 miles
- Product subtotal: 1,100 × $5.20 = $5,720.00
- Freight: 522 × $2.95 = $1,540.00 (1 load)
- **Total: $7,260.00**
- Effective delivered price: $6.60 per bag

**Example 2 — TJ Coal and Stove (Spartansburg, PA)**

- 1 load Forest Fuel Briquettes (2,112 packs @ $2.50)
- Distance: ~372 miles
- Product subtotal: 2,112 × $2.50 = $5,280.00
- Freight: 372 × $2.95 = $1,097.40 (1 load)
- **Total: $6,377.40**
- Effective delivered price: ~$3.02 per 6-pack

**Example 3 — Hypothetical multi-load order**

- 2 loads Alpha Fiber (2,340 bales @ $5.30) to a destination 200 miles away
- Product subtotal: 2 × $6,201.00 = $12,402.00
- Freight: 2 loads × 200 mi × $2.95 = $1,180.00
- **Total: $13,582.00**

---

## What to say when you don't know

If the request is partial-load, mixed-product on a single truck, ongoing contract pricing, an unusual destination (international, oversize permit territory), or anything outside the standard price list, the correct answer is always:

> "Let me get you a custom quote — I'll have someone from Musser Biomass call you within one business day with firm pricing."

Then create a lead in GHL with all the details and tag it `custom-quote-needed`.
