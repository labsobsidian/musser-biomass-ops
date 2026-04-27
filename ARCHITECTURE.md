# ARCHITECTURE.md — Musser Biomass
_Last updated: 2026-04-24_

---

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| App shell | Static `index.html` on Vercel | Single-file, no build step |
| AI brain | OpenAI-first / Anthropic fallback via `/api/claude` (SSE stream) | Answers operational questions and creates branded artifacts |
| Knowledge base | This repo's living docs via `/api/context` | Grounds the brain |
| Pricing logic | `/api/quote` (real calculator) | Real functional tool #1 |
| Messaging | `/api/send-email` → GoHighLevel Conversations | Real functional tool #2 |
| CRM | GoHighLevel sub-account | Contacts, email, SMS, pipeline, Conversation AI |
| Accounting / AR (planned) | Sage 50 | Accounts receivable, invoice aging, collections reporting |
| Database (planned) | Supabase | Inventory, orders, delivery records |
| Automation (planned) | n8n self-hosted | Webhook orchestration |

---

## Flow — Customer asks "how much for 1 load of pellets to 13346?"

```
Customer → GHL Conversation AI (chat/SMS/web)
           │
           │  System prompt includes PRICING.md
           │
           ▼
         Agent quotes from PRICING.md logic:
         "1 load Forest Fuel pellets = $5,720,
          freight to 13346 = $1,539.90,
          total = $7,259.90"
           │
           ▼
         Creates lead in GHL with the quote attached
           │
           ▼
         Human confirms + schedules delivery
```

For internal use from the Lumber Buddy app, the same logic is exposed at `/api/quote` — the Pricing tab calls it on every input change.

---

## Flow — Lumber Buddy answers a team question

```
Browser (index.html)
    │  POST /api/claude  { role, messages }
    ▼
/api/claude.js  ────► getContext() ────► /api/context.js
    │                                          │
    │                                          ▼
    │                             GitHub repo: 8 living docs
    │                             (includes PRICING.md + BRAND_STYLE.md)
    ▼
OpenAI Responses API or Anthropic Messages API (normalized SSE back to browser)
```

`/api/context.js` caches 60s per serverless instance.

---

## Flow — "Send this update to the CEO" button

```
Lumber Buddy UI  →  POST /api/send-email
                    { preset: "to_ceo", subject, body }
                           │
                           ▼
                    GoHighLevel Conversations API
                           │
                           ▼
                    CEO_EMAIL inbox
```

Preset hides the address from the UI — the UI only knows "send to CEO", destination is config.

---

## Directory layout

```
musser-biomass-ops/
├── index.html              # Lumber Buddy app — single file, 10 tabs
├── api/
│   ├── claude.js           # streaming proxy
│   ├── context.js          # GitHub living-docs fetcher
│   ├── quote.js            # pricing calculator (real)
│   ├── ar.js               # placeholder AR endpoint
│   ├── connectors/sage50.js # future Sage 50 boundary
│   └── send-email.js       # email to CEO (real)
├── PROJECT_STATE.md
├── ARCHITECTURE.md         # this file
├── CONSTANTS.md
├── DECISIONS.md
├── GO_LIVE_CHECKLIST.md
├── DEMO_CONTEXT.md
├── PRICING.md              # authoritative price list
├── BRAND_STYLE.md          # brand guide for artifacts
├── CLAUDE.md               # Claude Code instructions for this repo
├── README.md
└── package.json
```

No framework, no bundler, no build step. Push to `main` → Vercel auto-deploys.

---

## Env vars (Vercel)

| Name | Purpose |
|---|---|
| `OPENAI_API_KEY` | Powers `/api/claude` when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | Defaults to `gpt-5.5` |
| `ANTHROPIC_API_KEY` | Fallback/provider option for `/api/claude` |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-6` |
| `AI_PROVIDER` | `openai` or `anthropic`; defaults to `openai` |
| `GITHUB_TOKEN` | Fine-grained PAT, scoped ONLY to this repo, `contents:read` |
| `CLIENT_REPO` | `labsobsidian/musser-biomass-ops` |
| `CLIENT_NAME` | `Musser Biomass` |
| `CLIENT_SLUG` | `musser-biomass` |
| `GHL_API_KEY` | HighLevel private integration token/OAuth token for messaging |
| `GHL_LOCATION_ID` | Musser HighLevel location/sub-account ID |
| `CEO_GHL_CONTACT_ID` | GHL contact record used for CEO email timeline |
| `GHL_SEND_FROM_EMAIL` | Optional GHL sender override |
| `MESSAGE_PROVIDER` | Optional: `ghl` or `resend`; auto-detects if unset |
| `CEO_EMAIL` | Destination for the "to_ceo" preset |

All must be set in **Production** and **Preview** environments.

---

## The three-layer model

```
┌─────────────────────────────────────────┐
│    LAYER 3 — OPERATIONAL TABS           │
│  Orders · Dispatch · Production · P&L   │
└─────────────────────┬───────────────────┘
                      │ feeds from
┌─────────────────────▼───────────────────┐
│    LAYER 2 — LUMBER BUDDY BRAIN         │
│  Provider-toggle brain · reads this KB  │
│  Can call pricing calc + send email     │
└─────────────────────┬───────────────────┘
                      │ grounded by
┌─────────────────────▼───────────────────┐
│    LAYER 1 — KNOWLEDGE BASE             │
│  Living docs + PRICING.md + BRAND_STYLE │
│  Updated via commits to this repo       │
└─────────────────────────────────────────┘
```
