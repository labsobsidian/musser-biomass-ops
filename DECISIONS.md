# DECISIONS.md — Musser Biomass
_Append-only log. One entry per material decision. Newest at the bottom._

---

## 2026-04-24 — Fork from Atlas (Hardesty) pattern

**Decision:** Build the Musser Biomass ops app as a fork of the Atlas pattern established with Hardesty, rebranded as "Lumber Buddy by Obsidian Labs."

**Context:** Atlas worked well for Hardesty — single-file app, streaming chat from a Claude backend that reads the repo's living docs. Same pattern fits Musser: owner-operator business with siloed tools, an owner bottleneck on pricing, and a need for operational visibility.

**Alternatives considered:**
- Build something custom for Musser (rejected: slower, no reuse)
- Generic multi-tenant dashboard (rejected: too early, overfits to imagined requirements)

**Consequences:**
- Fast build (same scaffolding)
- Reusable for future clients (skills library compounds)
- Must maintain brand separation — "Lumber Buddy" is distinctly Musser's, not a rename of Atlas

---

## 2026-04-24 — Two real functional tools in the demo

**Decision:** Ship the first demo with two real, working tools: (1) pricing calculator (`/api/quote`), and (2) send-email-to-CEO (`/api/send-email` via Resend). Everything else is placeholder demo data.

**Context:** A fully-seeded-demo builds credibility, but buyers want to see *something* actually do work. Pricing is Musser's #1 pain point (owner fielding pricing questions all day) and email is the easiest "AI does a thing and sends it" moment.

**Alternatives considered:**
- Demo everything as seeded data (rejected: doesn't prove anything)
- Try to wire five live things (rejected: one of them always breaks on demo day)

**Consequences:**
- Those two endpoints must work reliably before demo day — test both end-to-end
- `PRICING.md` and `/api/quote.js` must stay in sync
- Resend domain verification is a prereq — don't leave until morning-of

---

## 2026-04-24 — Pricing source of truth = PRICING.md

**Decision:** `PRICING.md` is the single authoritative document for all product pricing, delivery rules, and discount logic. It's read by three systems: (1) Lumber Buddy brain (via `/api/context`), (2) pricing calculator (mirrored in `/api/quote.js`), and (3) GHL Conversation AI (pasted into its system prompt).

**Context:** When pricing lives in multiple places, the three systems will drift. Drift means the chat agent quotes one number, the calculator quotes another, and the team has no idea which is right.

**Alternatives considered:**
- Keep prices in a database (rejected: overkill pre-launch, adds a dependency)
- Hardcode in JS only (rejected: brain and chat agent can't read JS)

**Consequences:**
- Price changes require editing `PRICING.md` + `api/quote.js` in the same commit
- Whenever GHL Conversation AI is updated, re-paste the current `PRICING.md`
- At some point we may generate `quote.js` price book from `PRICING.md` at build time — revisit if drift bites us

---

## 2026-04-26 — Real Musser pricing wired (replaces placeholders)

**Decision:** Replaced placeholder firewood/mulch/bark price book with Musser's actual product line per Mick: three SKUs (`forest_fuel_pellets`, `forest_fuel_briquettes`, `alpha_fiber`) sold as whole truckloads, with per-mile freight at $2.95/mi (no minimum, no fuel surcharge, no deadhead).

**Context:** Initial scaffold used invented firewood/mulch products as plausible defaults for demo purposes. Real Musser business is wood byproducts (heating pellets, briquettes, fiber bales) shipped as whole loads to commercial accounts in NY/PA/etc.

**Math validation:**
- Town & Country (Hamilton, NY) shipment: calculator returns $7,259.90 vs. Mick's reported $7,260 (10¢ rounding in Mick's number — 522 mi × $2.95 = $1,539.90 exact)
- TJ Coal (Spartansburg, PA) shipment: calculator returns $6,377.40 — exact match

**Changes:**
- `PRICING.md` rewritten end-to-end to reflect three-SKU whole-load model
- `api/quote.js` `PRICE_BOOK` and freight logic rewritten to match
- `index.html` Pricing tab: dropdown now shows price-per-load with unit detail (e.g. "1,100 bags @ 40 lb"); qty input is integer-only (whole loads); default seed = 1 load of pellets; default freight miles bumped from 18 to 250 (realistic for cross-state shipping); customer-type labels stripped of (-8%/-12%) suffixes since all currently 0%; "Delivery" relabeled to "Freight" to match Mick's terminology
- Customer-type discounts kept in code (retail/commercial/wholesale) but all set to 0% — reserved for future use when Musser sets differentiated rates

**Open items:**
- Per-load freight assumption: each load = one truck trip, so multi-load orders charge freight × loads. Not explicit in Mick's messages but consistent with "no deadhead" and full-truckload model. Confirm with Mick.
- DEMO_CONTEXT.md still references firewood/mulch (Shenandoah Valley narrative). Leave as-is for now since it's seeded demo color, not customer-facing — replace when we have real Musser narrative content.
- Existing customers (Town & Country, TJ Coal) are documented in PROJECT_STATE? No — currently only in PRICING.md examples. Consider adding to a CUSTOMERS.md if list grows.
