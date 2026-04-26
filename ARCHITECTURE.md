# ARCHITECTURE.md — Musser Biomass
_Last updated: 2026-04-24_

---

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| App shell | Static `index.html` on Vercel | Single-file, no build step |
| AI brain | Anthropic Claude via `/api/claude` (SSE stream) | Answers operational questions |
| Knowledge base | This repo's living docs via `/api/context` | Grounds the brain |
| Pricing logic | `/api/quote` (real calculator) | Real functional tool #1 |
| Email | `/api/send-email` → Resend | Real functional tool #2 |
| CRM (planned) | GoHighLevel sub-account | Pipeline, SMS, Conversation AI |
| Accounting (planned) | QuickBooks | P&L, invoicing |
| Database (planned) | Supabase | Inventory, orders, delivery records |
| Automation (planned) | n8n self-hosted | Webhook orchestration |

---

## Flow — Customer asks "how much for 2 cords delivered?"

```
Customer → GHL Conversation AI (chat/SMS/web)
           │
           │  System prompt includes PRICING.md
           │
           ▼
         Agent quotes from PRICING.md logic:
         "2 cords seasoned oak × $285 = $570,
          delivery 18 miles = $61, total $631"
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
    │                             GitHub repo: 7 living docs
    │                             (includes PRICING.md)
    ▼
Anthropic /v1/messages  (streaming SSE back to browser)
```

`/api/context.js` caches 60s per serverless instance.

---

## Flow — "Send this update to the CEO" button

```
Lumber Buddy UI  →  POST /api/send-email
                    { preset: "to_ceo", subject, body }
                           │
                           ▼
                    Resend API
                           │
                           ▼
                    CEO_EMAIL inbox
```

Preset hides the address from the UI — the UI only knows "send to CEO", destination is config.

---

## Directory layout

```
musser-biomass-ops/
├── index.html              # Lumber Buddy app — single file, 9 tabs
├── api/
│   ├── claude.js           # streaming proxy
│   ├── context.js          # GitHub living-docs fetcher
│   ├── quote.js            # pricing calculator (real)
│   └── send-email.js       # email to CEO (real)
├── PROJECT_STATE.md
├── ARCHITECTURE.md         # this file
├── CONSTANTS.md
├── DECISIONS.md
├── GO_LIVE_CHECKLIST.md
├── DEMO_CONTEXT.md
├── PRICING.md              # authoritative price list
├── CLAUDE.md               # Claude Code instructions for this repo
├── README.md
└── package.json
```

No framework, no bundler, no build step. Push to `main` → Vercel auto-deploys.

---

## Env vars (Vercel)

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Powers `/api/claude` |
| `GITHUB_TOKEN` | Fine-grained PAT, scoped ONLY to this repo, `contents:read` |
| `CLIENT_REPO` | `labsobsidian/musser-biomass-ops` |
| `CLIENT_NAME` | `Musser Biomass` |
| `CLIENT_SLUG` | `musser-biomass` |
| `RESEND_API_KEY` | Email send (resend.com) |
| `FROM_EMAIL` | Verified sender e.g. `lumber-buddy@musserbiomass.com` |
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
│  Claude-powered · reads this repo's KB  │
│  Can call pricing calc + send email     │
└─────────────────────┬───────────────────┘
                      │ grounded by
┌─────────────────────▼───────────────────┐
│    LAYER 1 — KNOWLEDGE BASE             │
│  Living docs + PRICING.md               │
│  Updated via commits to this repo       │
└─────────────────────────────────────────┘
```
