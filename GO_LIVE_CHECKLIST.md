# GO_LIVE_CHECKLIST.md — Musser Biomass
_Last updated: 2026-04-24_

---

## Pre-Demo

- [x] Scaffold `musser-biomass-ops` repo
- [x] Build Lumber Buddy app (index.html, 9 tabs, seeded data, white-labeled)
- [x] Build `/api/claude` streaming proxy
- [x] Build `/api/context` living-docs fetcher
- [x] Build `/api/quote` pricing calculator (real functional tool #1)
- [x] Build `/api/send-email` via GoHighLevel Conversations (real functional tool #2)
- [x] Build `/api/ar` placeholder Accounts Receivable source for future Sage 50 sync
- [x] Add `BRAND_STYLE.md` for brand-safe artifacts
- [x] Write 7 living docs incl. `PRICING.md`
- [ ] Push to GitHub
- [ ] Create Vercel project, wire env vars (OpenAI, Anthropic fallback, GitHub, GHL)
- [ ] Confirm `/api/context` returns the 7 living docs
- [ ] Confirm streaming chat works end-to-end
- [ ] Confirm pricing calculator returns correct quotes for 3 test scenarios
- [ ] Confirm AR tab loads placeholder data and is hidden from yard/driver roles
- [ ] Verify GHL messaging token and `CEO_GHL_CONTACT_ID` (prereq for `/api/send-email`)
- [ ] Set `CEO_EMAIL` env var to a test address/contact, send a live email, confirm receipt
- [ ] Replace `CEO_EMAIL` with actual CEO address before demo
- [ ] Walk through demo flow dry-run once before live

## Phase 1 — GHL Stack (Week 1–2 post-demo)

### Sub-account
- [ ] Create white-labeled GHL sub-account for Musser under Obsidian Labs
- [ ] A2P registration if SMS will go out

### Pipeline
- [ ] Create pipeline: Quote Requested → Quoted → Scheduled → Delivered → Invoiced → Paid
- [ ] Custom fields: product_type, quantity, delivery_address, miles_from_yard, customer_type, price_quoted, delivery_date, driver_assigned

### Conversation AI
- [ ] Paste `PRICING.md` into Conversation AI system prompt
- [ ] Configure persona: friendly, direct, always offer to book a callback for custom quotes
- [ ] Test via web chat, SMS, Facebook — make sure the pricing math matches `/api/quote`

### Quote request form
- [ ] Build quote request form (product, quantity, ZIP, customer type)
- [ ] Webhook → auto-create GHL opportunity
- [ ] Auto-draft quote email using `/api/quote`

### Workflows
- [ ] First-time buyer nurture (3-step welcome sequence)
- [ ] Repeat-customer seasonal reminder (heating-season pellet pre-buy)
- [ ] Abandoned-quote follow-up (Day 2 / Day 5)

### Email
- [ ] Branded quote email template (HTML)
- [ ] Delivery-scheduled confirmation template
- [ ] Invoice template

## Phase 2 — Dispatch & Routing (Week 2–3)

- [ ] Morning dispatch view in Lumber Buddy (today's deliveries, map)
- [ ] Driver route view (mobile-first, one stop at a time, gate/access notes visible)
- [ ] Proof of delivery capture (photo + signature) → triggers invoice
- [ ] Google Maps API key for route optimization

## Phase 3 — Live Data (Week 3–4)

- [ ] Sage 50 AR sync — replace placeholder AR data with live invoice aging
- [ ] Accounting reporting path — replace seeded finance data with live P&L/revenue source
- [ ] Supabase inventory tables (loads, bags, bale counts)
- [ ] Nightly production schedule flow from yard lead → ops dashboard
- [ ] Flip implicit DEMO_MODE flag off in UI (remove seeded data cards, show live)

## Phase 4 — Voice Agent (optional stretch)

- [ ] ElevenLabs Conversational AI for inbound calls (peak-season only if desired)
- [ ] Twilio number (port existing or add new)
- [ ] Voice agent uses same PRICING.md logic via `/api/quote`
- [ ] Human transfer for anything outside the script

## Final Sign-Off

- [ ] Cold session smoke test — Lumber Buddy answers accurately from docs alone
- [ ] Pricing calculator matches Conversation AI for 5 randomly chosen scenarios
- [ ] Send-to-CEO verified in production
- [ ] Client has been trained on editing `PRICING.md` themselves (or has a contact at Obsidian Labs to email for changes)
- [ ] System runs for 2 weeks without Obsidian Labs intervention
