# CLAUDE.md — musser-biomass-ops

Instructions for Claude Code when working in this repo.

## What this is

AI ops command center for **Musser Biomass**, delivered by Obsidian Labs. Branded as **"Lumber Buddy by Obsidian Labs."** Single-page demo app + living docs + two real functional tools (pricing calculator, send-email-to-CEO) + placeholder demo data everywhere else. Pattern forked from `hardesty-ops`.

## Living docs — the source of truth

Seven docs at the repo root drive everything. Keep them current before writing code:

- `PROJECT_STATE.md` — mission, phase, what's built, remaining work, blockers
- `ARCHITECTURE.md` — stack, data flows, env vars
- `CONSTANTS.md` — non-secret IDs, slugs, flags. **Never put secrets here.**
- `DECISIONS.md` — dated decision log, append-only
- `GO_LIVE_CHECKLIST.md` — phased checklist
- `DEMO_CONTEXT.md` — rich seeded narrative; delete once live data syncs
- `PRICING.md` — authoritative price list; **mirrored in `api/quote.js`**

When the user says "update state" / "log a decision" / "check off X," edit these directly and commit.

## Repo layout

```
index.html              # Lumber Buddy app — 9 tabs, seeded data, streaming chat
api/
  claude.js             # Vercel serverless: Anthropic SSE proxy
  context.js            # Living-docs fetcher w/ 60s cache
  quote.js              # REAL TOOL #1: pricing calculator
  send-email.js         # REAL TOOL #2: send email via Resend
PROJECT_STATE.md
ARCHITECTURE.md
CONSTANTS.md
DECISIONS.md
GO_LIVE_CHECKLIST.md
DEMO_CONTEXT.md
PRICING.md
```

No build step — static `index.html` + Node serverless functions on Vercel.

## Working rules

- **Do not commit secrets.** `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `RESEND_API_KEY` all live only in Vercel env vars.
- **`PRICING.md`, `api/quote.js`, and `api/distance.js` must stay in sync.** If you edit one, edit the others in the same commit. PRICING.md documents the math; quote.js implements pricing; distance.js implements the ZIP→miles pipeline that feeds freight. All three must produce identical numbers.
- **DEMO_MODE is implicitly on.** Seeded data in the UI is intentional. Don't "fix" it by pulling live data.
- **Streaming matters.** `/api/claude` streams SSE; frontend parses chunks progressively. Don't refactor to buffered JSON.
- **Two tools are real; everything else is demo data.** Don't fake-wire real data into the other tabs. Either wire it for real (and update docs) or leave it seeded.
- **Brand:** "Lumber Buddy by Obsidian Labs." Keep wordmark consistent. Brand colors tuned for wood/biomass feel — don't swap.
- **Commit style:** short, lowercase-prefixed (`feat:`, `fix:`, `state:`, `price:`, `docs:`).
- **Push only when asked.** Default is commit locally.

## When editing `index.html`

- Single file, no bundler. Keep it that way until we outgrow it.
- Tabs: Lumber Buddy, Operations, Sales, Pricing, Marketing, Finance, Strategy, My Route, Settings.
- Seeded data should read as plausible Musser data: pellets / briquettes / Alpha Fiber, full-truckload mentality, NY/PA/TN destinations, real customers (Town & Country in Hamilton NY, TJ Coal in Spartansburg PA) where appropriate. **No firewood, mulch, cords, or Shenandoah Valley narrative** — that was inherited from the Hardesty fork and has been removed.

## When editing `api/quote.js`

- Update `PRICING.md` in the same commit. **Non-negotiable.**
- Keep the `PRICE_BOOK` object keyed by the same SKUs documented in `PRICING.md`.
- Export `computeQuote` for reuse (future voice-agent endpoint, etc.)
- Quote requests can supply either `deliveryMiles` (manual) or `originZip`+`destinationZip` (ZIP-to-ZIP). Default origin = `MUSSER_ORIGIN_ZIP` = `24368`. Don't break either path.

## When editing `api/distance.js`

- This is the ZIP→miles pipeline. Calls Zippopotam.us (free, no key), computes haversine × 1.20.
- 24h in-memory cache is intentional — ZIP centroids never move; cache reduces upstream calls.
- If you change the driving multiplier (currently 1.20), update PRICING.md's "How miles are computed" subsection in the same commit.
- US ZIPs only currently. If Canadian / international support is needed later, this is the place to add it (Zippopotam supports multiple countries).

## When editing `api/send-email.js`

- Stays thin: Resend API client.
- Don't add auth here — the endpoint is currently open. If abuse becomes possible (e.g. public deploy without auth), add a simple shared-secret header before iterating further.

## When editing `api/claude.js`

- Keep thin: proxy + stream.
- Forces `stream: true` on every call. Frontend depends on this.

## Out of scope until asked

- Tests, CI, build tooling, TypeScript, framework adoption
- Live data wiring (see `GO_LIVE_CHECKLIST.md` phases)
- Custom domain
