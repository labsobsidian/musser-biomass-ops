# DEMO_CONTEXT.md — Musser Biomass
_Rich operational narrative for demo mode. Delete this file once live data sync is wired._

This doc gives the Lumber Buddy brain plausible, specific detail to respond with during the demo. All names and numbers here are seeded/fictional. They match the seeded data in `index.html` so the brain and the UI tell the same story.

---

## The business, in one paragraph

Musser Biomass is a family-run biomass and landscape supply yard. They cut, kiln-dry, and sell firewood (bulk cords and bundled retail), grind mulch, sell bark products and wood chips, and move byproducts like bulk sawdust to commercial buyers. Typical customer mix is roughly 60% retail (homeowners, convenience-store firewood bundle accounts, landscape customers), 30% commercial (landscapers, nurseries, playgrounds), and 10% wholesale (garden centers, other resellers). They run a fleet of delivery trucks out of one yard and employ a small core crew plus seasonal help during firewood peak season (October–February).

## Today's snapshot (seed data)

- **Orders due today:** 7 (4 firewood, 2 mulch, 1 bark)
- **Trucks dispatched:** 3 of 4 routes filled, 1 pickup only
- **Inventory pulse:**
  - Seasoned oak firewood — 42 cords on hand (healthy)
  - Seasoned mixed hardwood — 18 cords (running low, splitter queue this week)
  - Kiln-dried bundles — ~2,800 units in retail stock (good)
  - Double-ground hardwood mulch — ~180 yards (healthy)
  - Dyed black mulch — ~40 yards (reorder trigger: 30)

## This week's deliveries (seed)

| Day | Customer | Product | Qty | Miles | Total |
|---|---|---|---|---|---|
| Mon | Bridgewater Landscaping | Double-ground mulch | 12 yd | 14 | $448.72 |
| Mon | R. Henderson | Seasoned oak | 2 cord | 22 | $631.00 |
| Tue | Shenandoah Nursery | Pine bark nuggets | 20 yd | 9 | $1,065.00 |
| Wed | Evergreen Landscapes | Dyed brown mulch | 15 yd | 18 | $718.08 |
| Wed | J. Ashworth | Kiln-dried bulk | 1 cord | 12 | $432.32 |
| Thu | Valley View HOA | Playground mulch | 28 yd | 26 | $1,730.92 |
| Fri | Pine Ridge Hardware (wholesale) | Kiln-dried bundles | 2 pallets (80 bundles) | 31 | $649.32 |

## Open quote queue

1. **Blue Ridge Stables** — 40 yards playground mulch, 33 miles. Awaiting CEO approval on wholesale pricing (large first-time order).
2. **Holston Creek Cabins** — 8 cords seasoned oak across 4 cabins, 48 miles. Standard retail — needs a scheduling slot.
3. **J. Parker** — 1 cord green mixed hardwood, 6 miles. Ready to send quote — hasn't been drafted.

## Pricing pain points (owner perspective)

The CEO is getting 10–15 pricing calls a day personally — half are existing customers who forgot their prices, half are new inbound from Google/Facebook. Every call is a 2–5 minute interruption. During peak firewood season (Nov–Dec) this hits 25+ calls/day and becomes the single biggest throughput limit on the business.

The goal of Lumber Buddy + GHL Conversation AI is to move 80%+ of those pricing conversations to self-serve chat + SMS, with the AI quoting from `PRICING.md` and booking callbacks only for custom/edge cases.

## Production & kiln (seed)

- Splitter runs Mon/Wed/Fri — averaging 4 cords/day output
- Kiln load cycles: ~72 hours, one load = 6 cords dried
- Current kiln status: Load 47 in progress, pulls Thursday morning
- Mulch grinder runs on-demand based on inventory + weather

## Fleet

- 4 delivery trucks (2 dump, 1 flatbed for pallets, 1 box truck for bundle delivery to retail accounts)
- Fleet utilization this week: 72% (slow — peak season will hit 95%+)

## Seasonal dynamics

- **Firewood:** Peak Oct–Feb. Mar–Aug is mostly bundle retail + commercial accounts. Pre-buy campaign in September drives 30% of annual firewood revenue.
- **Mulch:** Peak Mar–May (landscape season opener). Second wave Aug–Sep for fall refresh.
- **Bark:** Steadier — contractor-driven, follows commercial construction more than seasons.
- **Commercial sawdust/chips:** Flat year-round — contracted volume to industrial buyers.

## Marketing snapshot (seed)

- **Leads this month:** 44 (up 12% vs April '25)
- **Cost per lead:** $28
- **Best source:** Google Business Profile (38% of leads) — reviews are strong
- **Facebook:** 22% of leads, cheaper but lower converting
- **Repeat/referral:** 31% — strongest channel, 67% close rate

## Finance snapshot — April MTD (seed)

- Gross revenue: $94,800 (up 19% vs April '25)
- Product costs: −$31,500
- Labor: −$22,400
- Fuel + fleet: −$8,900
- Gross margin: $32,000 (34%)
- Outstanding invoices: $28,600 across 11 invoices

## Annual goals (seed)

- **Revenue target:** $1.4M (current pace $1.3M)
- **Firewood bundle accounts:** grow from 18 to 35 retail locations
- **Delivery radius optimization:** reduce average miles/order by 8% via better scheduling
- **Order intake through AI:** 60% of pricing inquiries handled without owner involvement (biggest KPI)

## Big bets in flight

1. **Pine Ridge Hardware chain** — 8 store locations interested in weekly bundle delivery. $180K/year if all sign.
2. **Second kiln** — capital project, would double kiln-dried capacity. Decision by Q3.
3. **Valley View HOA recurring contract** — 3-year mulch contract, refresh twice a year.

## What the system solves

1. Owner fielding 10–15 pricing calls a day → AI handles first-touch, books callback for custom
2. Quote consistency (retail vs. commercial vs. wholesale) → PRICING.md is the law, one source of truth
3. Dispatch done on whiteboard each morning → Lumber Buddy shows today's deliveries sorted optimally
4. Paper invoices chasing deliveries → automatic invoice on proof-of-delivery
5. Seasonal staffing surprises → dashboard shows production vs. order backlog, triggers hiring earlier
