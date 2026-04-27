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

---

## 2026-04-26 — ZIP-to-ZIP freight calculator + Musser demo narrative

**Decision:** Replace the manual "freight miles" input on the Pricing tab with a ZIP-to-ZIP lookup. Origin ZIP locked to **24368** (Musser's plant in Sugar Grove, VA). Customer enters their destination ZIP; the system computes driving miles and feeds them into the existing freight math. At the same time, rewrite all seeded demo data across the app (Operations, Sales, Finance, Strategy, My Route tabs and chat greetings) to reflect Musser's actual world — pellets/briquettes/fiber, real customers (Town & Country in Hamilton NY, TJ Coal in Spartansburg PA), full-truckload mentality, NY/PA/TN destinations.

**Context:** Mick / Eric field constant "what's your price to my ZIP?" calls. The manual miles input forced anyone using the calculator to know mileage already, which defeats the point of an AI quoting tool. With ZIP-to-ZIP, a dealer can ask a chat or SMS bot "1 load of pellets to 13346" and get a real number including freight, instantly — same math the team uses. The seeded firewood/mulch narrative inherited from the Hardesty fork was confusing in demos because it didn't match anything Musser actually sells.

**Implementation:**

- **New endpoint:** `/api/distance.js` — accepts `?from=24368&to=13346`, looks up centroid lat/lon for both ZIPs via the free public **Zippopotam.us** API (no API key required, CORS-enabled, GeoNames-sourced data). Computes great-circle (haversine) distance in miles and multiplies by **1.20** to estimate driving miles. 24-hour in-memory cache so repeat lookups don't hit the upstream API. Exports `computeDistance`, `lookupZip`, `haversineMiles` for reuse.
- **`/api/quote.js`:** now imports `computeDistance` and accepts either `deliveryMiles` (legacy/manual) or `originZip` + `destinationZip`. If both, manual miles wins. Default origin ZIP = `24368` if not specified. Response now includes a `distanceInfo` block (`{from, to, estimatedDrivingMiles, greatCircleMiles, method}`) so the UI / chat AI can show "Sugar Grove, VA → Hamilton, NY · 577 driving miles" instead of just a number.
- **Pricing tab UI:** the single miles field is replaced with two ZIP fields. Origin is locked (read-only, value 24368) with a tooltip explaining why. Destination is a 5-digit numeric input that triggers a recalculation as soon as the user types the fifth digit. A small info row below the inputs shows the resolved place names + estimated driving miles; on lookup error it shows the error message in red so the user can fall back to manual entry.
- **PRICING.md:** new "How miles are computed" subsection under Freight, documenting the ZIP-based pipeline + the 1.20 multiplier + the manual override. Examples updated to mention origin ZIP 24368 and destination ZIPs 13346 / 16434 explicitly so the GHL Conversation AI quotes consistently.
- **DEMO_CONTEXT.md:** rewritten end-to-end. No more firewood, mulch, cords, kiln, splitter, Shenandoah Valley narrative, Pine Ridge Hardware, Bridgewater Landscaping, Henderson, Ashworth, Valley View HOA. Replaced with Musser's actual world: three SKUs, two real customer accounts (Town & Country, TJ Coal), Northeast Stove Supply as the speculative big bet, pellet line / briquette press / Alpha Fiber baler as the production narrative.
- **`index.html` seeded data:** Operations tab now shows "this week's loads" not "today's deliveries" (truckload business is per-week, not per-day). Inventory pulse shows loads ready / bags on hand / bales on hand instead of cords/yards. Sales tab shows Northeast Stove Supply + Appalachian Coal & Stove in the approval queue, Town & Country + TJ Coal + Hudson Valley Hearth + Pocono Pellet Co. in recent quotes. Finance shows pellets / briquettes / fiber / freight revenue split. Strategy shows Northeast Stove Supply (NY chain), second pellet line, Alpha Fiber bedding push, and the pre-heating-season pre-buy as the four big bets. My Route tab shows a single long-haul load to Hamilton NY (522 mi) instead of five short local stops — matches the actual freight model. Chat greetings rewritten per role to reference real Musser numbers and customers. Prompt suggestions updated to use ZIP-based examples ("Quote 1 load pellets to ZIP 13346").

**Alternatives considered:**
- Bundle a 33k-row US ZIP centroid CSV into the repo (rejected: ~1MB cold-start cost, deployment bloat, awkward to update)
- Use Google Distance Matrix API (rejected for v1: requires API key + billing setup, ~$0.005/lookup, overkill for 95%-accurate use case; reserved as a future "verify mileage" button)
- Make origin ZIP editable (rejected: Musser ships from one plant; locking prevents user error and signals correctness)
- Support Canadian postal codes (rejected: zero current Canadian customers, can revisit if that changes)

**Consequences:**
- Any wholesale dealer (real human, voice agent, chat agent) can now get an instant quote with freight by knowing only their ZIP — eliminates the "let me look up your mileage" interruption that was the main bottleneck
- External dependency on Zippopotam.us. If their service goes down, distance lookups fail; the manual `deliveryMiles` override path remains so quotes can still happen. Future hardening: bundle a fallback ZIP centroid lookup.
- Driving multiplier of 1.20 is a heuristic. Within ~5% of Google driving distance for typical lanes. Mountain / coastal / island lanes will be optimistic. Override path mitigates this for any lane the team flags as unusual.
- The PRICING.md ↔ /api/quote.js drift-prevention invariant still holds — the new freight pipeline is documented in PRICING.md and implemented in /api/quote.js + /api/distance.js. Three files to keep in sync now instead of two; CLAUDE.md should mention this.

**Open items:**
- Add a "verify mileage" button that calls Google Distance Matrix on demand (post-v1)
- Add a small offline ZIP lookup fallback if Zippopotam outages prove disruptive
- CLAUDE.md should be updated to mention `/api/distance.js` as part of the pricing-system invariant (next commit)

---

## 2026-04-27 — Brand guide, provider toggle, premium UI, and Sage-ready AR

**Decision:** Upgrade Lumber Buddy from a demo-style Atlas fork into a premium Musser-specific Atlas deployment. Add `BRAND_STYLE.md`, load it into the brain context, make `/api/claude` OpenAI-first with Anthropic fallback, add placeholder Accounts Receivable through `/api/ar`, and create a Sage 50 connector boundary at `api/connectors/sage50.js`.

**Context:** Musser needs Atlas to create branded websites, PDF-style briefs, slide previews, CEO emails, and operational reporting that matches the real business. Sage 50 access is not available yet, so AR must be useful in demo mode without pretending to be live accounting data.

**Consequences:**
- Customer-facing artifacts must follow `BRAND_STYLE.md`.
- `/api/ar` is explicitly placeholder data until Sage 50 access is confirmed.
- The frontend still reads Anthropic-shaped SSE events, while the backend can use OpenAI or Anthropic.
- Future Sage work should replace the connector implementation rather than rewriting the UI.

---

## 2026-04-27 — GHL primary messaging provider

**Decision:** Route Lumber Buddy's send-to-CEO email path through GoHighLevel Conversations when `GHL_API_KEY` exists. Keep `/api/send-email` as the compatibility endpoint, but make it a provider router with GHL primary and Resend as optional fallback only.

**Context:** Musser already has an active GHL account, and customer/owner communication belongs in the CRM timeline when possible. Resend was only a placeholder email provider and has been removed from Vercel.

**Consequences:**
- CEO email now needs `CEO_EMAIL` plus `CEO_GHL_CONTACT_ID` so HighLevel has a contact timeline to attach the outbound email to.
- Future AR collection email/SMS work should use `api/connectors/ghl.js` instead of adding provider-specific logic to the UI.
- A later Atlas product version can replace the private integration token with OAuth without changing the app-level messaging workflow.
- Owner/admin chat can detect direct "email the CEO" requests and call `/api/send-email` instead of only drafting copy.
- AR CEO summaries now send as Musser-branded HTML operating briefs rather than plain-text notes.
