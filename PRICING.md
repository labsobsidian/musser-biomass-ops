# PRICING.md — Musser Biomass
_Last updated: 2026-04-24_
_Authoritative pricing source. Used by: Lumber Buddy brain, `/api/quote` endpoint, and the GHL Conversation AI prompt._

---

## How to use this document

**For the team:** This is the single source of truth for product pricing. When prices change, change them here. The Lumber Buddy chat reads this doc automatically. The pricing calculator in `/api/quote.js` mirrors this table — **update both in the same commit** or the two will drift.

**For AI agents:** When a customer asks about pricing, quote from this table. Show your work (quantity × unit price, then delivery, then total). If a product or quantity isn't listed here, say "Let me get you a quote from the team" — do not invent numbers.

**All prices are placeholders pending Musser's real price sheet.**

---

## Product price list

### Firewood (sold by the cord — 128 cubic feet)

| SKU | Product | Unit price |
|---|---|---|
| `firewood_seasoned_oak` | Seasoned Oak Firewood | $285 / cord |
| `firewood_seasoned_mixed` | Seasoned Mixed Hardwood | $245 / cord |
| `firewood_green_mixed` | Green Mixed Hardwood | $195 / cord |
| `firewood_kiln_dried_bulk` | Kiln-Dried Firewood (bulk) | $365 / cord |

### Bundled firewood

| SKU | Product | Unit price |
|---|---|---|
| `bundled_kiln_dried` | Kiln-Dried Bundle (~0.75 cu ft) | $7.50 / bundle |
| `bundled_camp_pack` | Campground Pack (case of 12) | $72 / case |

### Mulch (sold by the cubic yard)

| SKU | Product | Unit price |
|---|---|---|
| `mulch_hardwood_double` | Double-Ground Hardwood Mulch | $38 / yard |
| `mulch_dyed_black` | Dyed Black Mulch | $48 / yard |
| `mulch_dyed_brown` | Dyed Brown Mulch | $48 / yard |
| `mulch_playground` | Certified Playground Mulch | $58 / yard |

### Bark & landscape (by the cubic yard)

| SKU | Product | Unit price |
|---|---|---|
| `bark_nuggets` | Pine Bark Nuggets | $52 / yard |
| `bark_fines` | Pine Bark Fines | $42 / yard |

### Byproducts & industrial (by the cubic yard)

| SKU | Product | Unit price |
|---|---|---|
| `sawdust_bulk` | Bulk Sawdust | $22 / yard |
| `wood_chips_bulk` | Bulk Wood Chips | $28 / yard |

---

## Delivery pricing

- **Free delivery radius:** 10 miles from the yard.
- **Per-mile rate beyond free radius:** $4.50 per billable mile (miles over 10).
- **Minimum delivery fee (once past free radius):** $35.
- **Loading surcharge:** $25 flat fee on every delivery (covers machine time loading the truck).

**Examples:**
- Delivery 8 miles away → loading surcharge only = **$25**
- Delivery 15 miles away → 5 billable miles × $4.50 = $22.50; below $35 minimum, so delivery = $35 + $25 loading = **$60**
- Delivery 30 miles away → 20 billable miles × $4.50 = $90 + $25 loading = **$115**

Customers outside a 50-mile radius should be flagged to Ops for a custom quote — we may or may not take the run depending on fleet schedule.

---

## Customer-type discounts

Applied as a percentage off the list price, before delivery.

| Customer type | Discount |
|---|---|
| Retail (default) | 0% |
| Commercial (landscapers, contractors) | 8% |
| Wholesale (resellers, garden centers) | 12% |

---

## Bulk discounts (stack on top of customer discount)

- **Firewood, 5+ cords** → additional 5% off firewood lines
- **Mulch, 10+ yards** → additional 5% off mulch lines

---

## Worked examples

**Example 1 — Retail homeowner, 2 cords seasoned oak, 18 miles away**

- 2 cords × $285 = $570
- Delivery: 8 billable miles × $4.50 = $36; above $35 minimum → $36 + $25 loading = $61
- **Total: $631**

**Example 2 — Commercial landscaper, 15 yards double-ground mulch, 12 miles away**

- 15 yards × $38 = $570
- Commercial discount 8% + bulk discount 5% = 13% off → $570 × 0.87 = $495.90
- Delivery: 2 billable miles × $4.50 = $9; below $35 minimum → $35 + $25 loading = $60
- **Total: $555.90**

**Example 3 — Pickup order, 1 pallet (40) kiln-dried bundles**

- 40 bundles × $7.50 = $300
- No delivery (pickup)
- **Total: $300**

---

## What to say when you don't know

If the product isn't listed, the quantity is unusual (a truckload, a bulk rail shipment, an annual contract), or the customer is outside the normal delivery range, the correct answer is always:

> "Let me get you a custom quote — I'll have someone from Musser Biomass call you within one business day with firm pricing."

Then create a lead in GHL with all the details and tag it `custom-quote-needed`.
