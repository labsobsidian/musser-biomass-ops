# DEMO_CONTEXT.md — Musser Biomass
_Rich operational narrative for demo mode. Delete this file once live data sync is wired._

This doc gives the Lumber Buddy brain plausible, specific detail to respond with during the demo. All names and numbers here are seeded — except where noted as **real** (Town & Country, TJ Coal, Mick's pricing, the plant ZIP). The seed data here matches the seeded data in `index.html` so the brain and the UI tell the same story.

---

## The business, in one paragraph

Musser Biomass is a Sugar Grove, VA (ZIP 24368) manufacturer of wood-fiber heating products and animal-bedding fiber. They produce three SKUs, all sold by the **whole truckload**: **Forest Fuel Heating Pellets** (40 lb bags, 1,100 bags/load), **Forest Fuel Briquettes** (6-packs, 2,112 packs/load), and **Alpha Fiber** (25 lb bales, 1,170 bales/load). Customers are stove shops, coal & stove dealers, and feed/farm-supply stores across the Mid-Atlantic and Northeast — primarily NY, PA, OH, TN, VA, and WV. Musser owns the trucks and freight is billed at $2.95/mile with no fuel surcharge or deadhead. The team is small: Eric Wood (CEO), Becky Chance (CFO), Mick on sales, plus production and drivers. NAICS code 321900, founded November 2020.

## Plant origin

- **Ship-from ZIP:** 24368 (Sugar Grove, VA)
- **All freight quotes** anchor to this ZIP. The pricing calculator looks up centroid lat/lon for both ZIPs (origin + destination), computes great-circle distance, and multiplies by 1.20 for driving miles.
- Override path: if the driver's actual route differs (mountain detours, weather reroutes), enter miles directly and the calc uses that instead.

## Today's snapshot (seed)

- **Loads scheduled this week:** 9 (5 pellets, 3 briquettes, 1 fiber)
- **Trucks committed:** 9 of 12 (3 open slots — room for spot loads)
- **Production rate:** 2.1 loads/day average (pellet line running, briquette press up)
- **Finished goods:**
  - Forest Fuel pellets — 4 loads ready (healthy)
  - Forest Fuel briquettes — 2 loads ready (low; press queued for Wed)
  - Alpha Fiber — 3 loads ready (healthy)
  - Raw fiber inventory — 11 days runway (reorder window opening)

## This week's loads (seed)

| Day | Customer | Product | Loads | Destination | Miles | Net |
|---|---|---|---|---|---|---|
| Tue | Town & Country Store **(real)** | Forest Fuel pellets | 1 | Hamilton NY 13346 | 522 | $7,259.90 |
| Wed | TJ Coal & Stove **(real)** | Forest Fuel briquettes | 1 | Spartansburg PA 16434 | 372 | $6,377.40 |
| Thu | Town & Country Store | Alpha Fiber | 1 | Hamilton NY 13346 | 522 | $7,740.90 |
| Fri | TJ Coal & Stove | Forest Fuel briquettes | 2 | Spartansburg PA 16434 | 372 | $12,754.80 |
| Fri | Town & Country Store | Forest Fuel pellets | 1 | Hamilton NY 13346 | 522 | $7,259.90 |

**Real customer addresses on file:**
- **Town & Country Store** — 2433 Route 12B, Hamilton NY 13346 (long-running pellet account)
- **TJ Coal & Stove** — 45193 Farrington Road, Spartansburg PA 16434 (briquette account)

## Open quote queue (seed)

1. **Northeast Stove Supply** (new wholesale, NY) — 2-load opener, Forest Fuel pellets to Binghamton NY area. Awaiting CEO approval. $13,178 quote (incl. freight). $220k/yr potential if it goes well.
2. **Appalachian Coal & Stove** (returning, TN) — 1 load briquettes to Bristol TN. Awaiting CEO approval on slightly compressed timing. $5,861 quote (incl. freight).
3. **Hudson Valley Hearth** — sample order, 1 load pellets to Kingston NY area. Quote sent 3 days ago, awaiting reply.

## Pricing pain points (owner perspective)

Eric is fielding 10–15 pricing calls a day personally — wholesale dealers asking "what's your price to my ZIP?" and existing customers checking on next month's prices. Every call is a 2–5 minute interruption (look up the customer, check the freight to their city, do the math, quote it back). During pre-heating-season pre-buy season (Aug–Oct) this hits 25+ calls/day and becomes the single biggest throughput limit on the business.

The goal of Lumber Buddy + GHL Conversation AI is to move 80%+ of those pricing conversations to self-serve chat + SMS, with the AI quoting from `PRICING.md` (with ZIP-based freight built in) and booking callbacks only for custom/edge cases (multi-load pricing, contract terms, unusual lanes).

## Production (seed)

- **Pellet line:** runs 5 days/week, ~1.2 loads/day finished output
- **Briquette press:** runs to demand, ~0.6 loads/day when fed; press cycle is the bottleneck
- **Alpha Fiber baler:** runs 3 days/week, plenty of headroom
- **Raw fiber sourcing:** local hardwood byproduct + dedicated supplier contracts; 11-day inventory typical

## Fleet

- ~12 trucks committed-or-available across the week (mix of company trucks + dedicated carriers)
- Per-load freight model = each load is its own trip. No multi-stop / LTL freight on these products.

## Seasonal dynamics

- **Forest Fuel pellets:** Peak Sep–Feb (heating season). Pre-buy campaign Aug–Oct drives ~35% of annual pellet revenue. Wholesale dealers stock-up before retail customers start asking.
- **Forest Fuel briquettes:** Same seasonality as pellets, but slightly later peak (briquettes are more of a supplement/convenience product).
- **Alpha Fiber:** Year-round demand — animal bedding doesn't follow heating-season pattern. Push into expanded bedding markets is the strategic upside.

## Marketing snapshot (seed)

- **Leads this month:** 44 (up 12% vs April '25)
- **Cost per lead:** $28
- **Best source:** Google Business Profile (38% of leads) — reviews are strong
- **Facebook:** 22% of leads, cheaper but lower converting
- **Repeat / dealer referral:** 31% — strongest channel, 67% close rate

## Finance snapshot — April MTD (seed)

- Gross revenue: $112,400 (up 22% vs April '25)
- Raw fiber + materials: −$42,300
- Labor: −$23,800
- Energy + plant: −$11,500
- Gross margin: $34,800 (31%)
- Outstanding invoices: $36,200 across 6 invoices

## Annual goals (seed)

- **Revenue target:** $1.6M (current pace $1.5M)
- **Wholesale dealer accounts:** grow from 12 to 24
- **AI-handled inquiries:** 60% of pricing inquiries handled without owner involvement (biggest KPI)
- **Avg load freight:** ~$1,275 across ~432 mi avg lane — opportunity to expand within drivable radius without growing fleet

## Big bets in flight

1. **Northeast Stove Supply (NY chain)** — multi-store wholesale dealer, 2-load trial opener. $220K/year potential.
2. **Second pellet line** — capital project, would roughly double pellet capacity. Decision by Q3.
3. **Alpha Fiber bedding-market push** — sample loads to dedicated bedding distributors; opens a non-seasonal revenue line.
4. **Pre-heating-season pellet pre-buy** (Aug–Oct campaign) — historically 35% of annual pellet revenue.

## What the system solves

1. Owner fielding 10–15 pricing calls a day → AI handles first-touch, quotes from PRICING.md with ZIP-based freight, books callback only for custom
2. Quote consistency across phone / SMS / chat / web → one source of truth (PRICING.md), same math everywhere (the calculator and the chat AI both call /api/quote)
3. Load scheduling done on whiteboard each morning → Lumber Buddy shows this week's loads, production status, and customer commitments side-by-side
4. Paper invoices chasing deliveries → automatic invoice on BOL signature
5. Spot-load opportunities missed because the team can't price them fast → ZIP-to-ZIP calculator means any inbound dealer can get a real number in seconds
