# PROJECT_STATE.md — Musser Biomass
_Last updated: 2026-04-24_

---

## Mission

Build an AI-forward ops stack for Musser Biomass that takes pricing questions, dispatch logic, and customer follow-up off the owner's plate. Give the team a single pane of glass for orders, yard production, delivery routes, and financials — so they can double their weekly order volume without adding office headcount.

## Primary Contacts

- **CEO/Owner** — approves pricing exceptions, fleet/kiln capital, key demo stakeholder (email set via `CEO_EMAIL` env var)
- **Operations Manager** — day-to-day owner of the system, dispatch and scheduling
- **Yard/Production Lead** — runs the splitter, kiln schedule, loading
- **Brian (Obsidian Labs)** — contact at Musser for the build

## Current Phase

**Phase 0 — Demo Build.** Lumber Buddy app scaffolded on Vercel with seeded placeholder data. Two real functional tools live: pricing calculator and send-to-CEO email. Everything else is realistic demo data until Musser's systems are connected.

---

## Pain Points (hypothesis — confirm on first working session)

1. Pricing questions funnel to the owner — phone and text interruptions all day
2. Quotes are inconsistent customer-to-customer because there's no single source of truth
3. Delivery routing is manual — whoever is at the yard figures out stop order in the morning
4. Order intake scattered across phone, text, email, walk-ups
5. No real pipeline visibility — hard to know what's due to deliver this week
6. Seasonal demand swings (heating pellets and briquettes peak heading into cold weather) hit without a plan
7. Commercial and wholesale customers have negotiated prices that live in someone's head
8. Invoicing lags production — paperwork piles up

---

## What's Built

### Infrastructure
- `musser-biomass-ops` repo — scaffolded with full Lumber Buddy app
- `/api/claude` — streaming brain proxy; OpenAI-first with Anthropic fallback (reads live KB from this repo)
- `/api/context` — living-docs fetcher w/ 60s cache
- `/api/quote` — **real pricing calculator** (POST items + miles → itemized quote)
- `/api/send-email` — **real email sender** via Resend ("to_ceo" preset wired)
- `/api/ar` — **placeholder Accounts Receivable source** shaped for future Sage 50 integration
- Vercel deployment — TBD (push to main + wire env vars)

### Lumber Buddy App Tabs
- Lumber Buddy (AI brain, opens by default)
- Operations (today's orders, yard production, dispatch)
- Sales (order pipeline, quote queue)
- Pricing (live calculator — uses `/api/quote`)
- Marketing (seasonal campaigns, lead sources)
- Finance (revenue by product, P&L snapshot)
- Strategy (annual goals, big bets)
- My Route (driver-only view — today's stops)
- Settings (integrations, users, brain config)
- Accounts Receivable (aging, open invoices, collection priority; placeholder until Sage 50 access)

### Knowledge Base Living Docs
- `PROJECT_STATE.md` (this file)
- `ARCHITECTURE.md`
- `CONSTANTS.md`
- `DECISIONS.md`
- `GO_LIVE_CHECKLIST.md`
- `DEMO_CONTEXT.md` — rich seeded narrative for demo
- `PRICING.md` — authoritative pricing, mirrored in `/api/quote.js`
- `BRAND_STYLE.md` — source of truth for branded websites, slide/PDF-style artifacts, and customer-facing copy

---

## Remaining Work

### Pre-Demo
- [ ] Clone repo to Vercel, set env vars, confirm deploy
- [ ] Verify pricing calculator works end-to-end
- [ ] Set `RESEND_API_KEY`, `FROM_EMAIL`, `CEO_EMAIL` in Vercel
- [ ] Verify send-to-CEO works with a real test email
- [ ] Swap placeholder prices in `PRICING.md` + `api/quote.js` with Musser's real sheet
- [ ] Custom domain (e.g. `musser.labsobsidian.co`)

### Phase 1 — GHL Build (Post-Demo)
- [ ] Create GHL sub-account for Musser Biomass
- [ ] Build pipeline: Quote Requested → Quoted → Scheduled → Delivered → Invoiced → Paid
- [ ] Custom fields: product, quantity, delivery address, miles from yard, customer type, price quoted
- [ ] Inbound quote form → webhook → auto-create opportunity + draft quote using `/api/quote`
- [ ] Conversation AI system prompt — include full `PRICING.md` so chat/SMS/social can quote live
- [ ] Lead nurture sequence (first-time buyer vs. repeat customer paths)
- [ ] Reminder workflow for seasonal customers (heating-season pellet pre-buy)

### Phase 2 — Dispatch & Routing
- [ ] Morning dispatch view — today's deliveries with map + optimal order
- [ ] Driver route view — mobile-friendly, one stop at a time
- [ ] Proof of delivery capture (photo + signature)
- [ ] Automatic invoice creation on delivery confirmation

### Phase 3 — Live Data Wiring
- [ ] Sage 50 AR sync for invoice aging and receivables (replace placeholder AR data)
- [ ] Accounting reporting path for revenue/P&L numbers (replace seeded finance data)
- [ ] Inventory tracking in Supabase (loads, bags, bale counts)
- [ ] Production schedule from yard lead → flows into ops dashboard
- [ ] Flip `DEMO_MODE` flag off

### Phase 4 — Voice Agent (stretch)
- [ ] ElevenLabs agent for inbound calls during peak season
- [ ] Quote → schedule → book directly via voice
- [ ] Transfer to human for anything off-script

---

## Blockers

- ~~Real price sheet from Musser~~ — received Apr 26, three SKUs deployed
- CEO email address — placeholder `CEO_EMAIL` env var to be set
- Resend account + verified sending domain — required before send-to-CEO works live
- Sage 50 access path for AR sync (Phase 3)
- Google Maps API key if we want a "verify mileage" upgrade button (Phase 2 — currently using free Zippopotam.us + 1.20 driving multiplier, ~95% accurate)

---

## Notes

- Skills version: v0.2.0
- DEMO_MODE: true — seeded data until accounting + live order intake are wired
- `PRICING.md` is read by the Lumber Buddy brain AND should be pasted into GHL Conversation AI's system prompt so the chat agent quotes from the same source
- Pricing calculator (`/api/quote.js`), distance lookup (`/api/distance.js`), and `PRICING.md` must be updated together — drift between any of them will cause the chat agent and the UI to disagree
- Plant origin ZIP is `24368` — locked in `MUSSER_ORIGIN_ZIP` constant in `api/quote.js`, documented in PRICING.md
- All seeded demo data across Operations / Sales / Finance / Strategy / My Route tabs and chat greetings reflects Musser's real product world (pellets / briquettes / Alpha Fiber, NY/PA destinations, full-truckload model). Older Hardesty-era firewood/mulch/cords narrative was scrubbed Apr 26.
