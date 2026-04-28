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
| Messaging | `/api/send-email` -> CRM for plain text, Resend for branded reports/PDF attachments | Real functional tool #2 |
| Learning loop | `/api/learning/*` + `LEARNING_LOG.md` | Human-approved correction queue and weekly KB review |
| CRM | Obsidian Labs CRM sub-account | Contacts, email, SMS, pipeline, Conversation AI |
| Accounting / AR (planned) | Sage 50 | Accounts receivable, invoice aging, collections reporting |
| Database (planned) | Supabase | Inventory, orders, delivery records |
| Automation (planned) | n8n self-hosted | Webhook orchestration |

---

## Flow - "Send this update to the CEO" button

```
Biomass Buddy UI  ->  POST /api/send-email
                    { preset: "to_ceo", subject, body, attachments? }
                           |
                           v
                    Provider router
                    - Plain text: Obsidian Labs CRM Conversations API
                    - AR/report: Resend + generated PDF attachment
                           |
                           v
                    CEO_EMAIL inbox
```

Preset hides the address from the UI - the UI only knows "send to CEO", destination is config.

---

## Website, Marketing, and CRM SMS flows

Website importer:

```
GoDaddy DNS TXT proof -> /api/website-import -> safe public page fetch
  -> imported page context -> /api/claude website previews and AEO drafts
```

CRM tag-based SMS:

```
Marketing tab -> /api/send-sms { dryRun:true } -> CRM contacts by tag
  -> recipient preview -> /api/send-sms { dryRun:false } -> Obsidian Labs CRM Conversations SMS
```

CRM tag-based demo email:

```
Marketing tab / chat "email demo link" -> /api/send-campaign-email
  -> CRM contacts by biomass-demo-board tag -> Obsidian Labs CRM Conversations Email
```

Marketing suite:

```
Marketing tab -> AEO Monitor / Competitors / Ads / Content Studio / Monday Brief
  -> /api/marketing-draft for branded article, social, and brief drafts
```

GoDaddy remains DNS/domain control. Vercel is the preferred publishing path for future Atlas-managed website/blog changes.

---

## Directory layout

```
musser-biomass-ops/
├── index.html              # Biomass Buddy app — single file, 10 tabs
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
| `CEO_GHL_CONTACT_ID` | CRM contact record used for CEO email timeline |
| `GHL_SEND_FROM_EMAIL` | Optional CRM sender override |
| `RESEND_API_KEY` | Branded/internal HTML reports and summaries |
| `FROM_EMAIL` | Verified sender for Resend report emails |
| `MESSAGE_PROVIDER` | Optional hard override: `auto`, `ghl`, or `resend` |
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
│    LAYER 2 — BIOMASS BUDDY BRAIN         │
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
