# Musser Biomass — Lumber Buddy Deployment

**Lumber Buddy by Obsidian Labs** is the AI ops app for Musser Biomass. Pattern forked from Atlas (Hardesty). Single Vercel app that streams chat through an OpenAI-first / Anthropic-fallback brain, pulling its knowledge base live from this GitHub repo. Adds real tools on top: pricing, send-to-CEO email, branded artifact previews, and placeholder Accounts Receivable shaped for future Sage 50 sync.

## Architecture

```
Browser (index.html)
    │
    │  POST /api/claude  { role, messages }        ──► streams chat response
    │  POST /api/quote   { items, miles, ... }     ──► returns itemized quote (REAL)
    │  POST /api/send-email { preset, subject... } ──► sends to CEO via GHL (REAL)
    │  GET  /api/ar                              ──► placeholder AR aging (Sage 50 later)
    │
    ▼
Vercel serverless functions
    │
    ├─► /api/claude    ─► getContext() ─► GitHub living docs ─► OpenAI/Anthropic (SSE)
    ├─► /api/quote     ─► mirrors PRICING.md math
    ├─► /api/send-email ─► GoHighLevel Conversations API
    └─► /api/ar         ─► Sage 50 connector boundary
```

## Env vars (Vercel → Project Settings → Environment Variables)

| Name | Example | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Powers `/api/claude` when OpenAI is selected |
| `OPENAI_MODEL` | `gpt-5.5` | Premium model default |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Fallback/provider option |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Anthropic model default |
| `AI_PROVIDER` | `openai` | `openai` or `anthropic`; defaults to OpenAI |
| `GITHUB_TOKEN` | `github_pat_...` | Fine-grained PAT scoped to THIS repo only. `contents:read` is enough. |
| `CLIENT_REPO` | `labsobsidian/musser-biomass-ops` | Repo to read living docs from |
| `CLIENT_NAME` | `Musser Biomass` | Used in role preamble |
| `CLIENT_SLUG` | `musser-biomass` | Reserved for future connectors |
| `GHL_API_KEY` | `pit-...` | HighLevel private integration token/OAuth token |
| `GHL_LOCATION_ID` | `abc123` | Musser HighLevel location/sub-account ID |
| `CEO_GHL_CONTACT_ID` | `abc123` | GHL contact record used for CEO email timeline |
| `GHL_SEND_FROM_EMAIL` | `sales@musserbiomass.com` | Optional GHL sender override |
| `RESEND_API_KEY` | `re_...` | Branded/internal HTML reports and summaries |
| `FROM_EMAIL` | `lumber-buddy@labsobsidian.co` | Verified sender for Resend report emails |
| `MESSAGE_PROVIDER` | `auto` | Optional hard override: `auto`, `ghl`, or `resend` |
| `CEO_EMAIL` | `ceo@musserbiomass.com` | Destination for "send to CEO" button |

All must be set in **Production** and **Preview** environments.

### Creating the GitHub PAT

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. "Generate new token"
3. **Resource owner:** `labsobsidian`
4. **Repository access:** Only select repositories → pick **only** `musser-biomass-ops`
5. **Repository permissions:** Contents → **Read-only**
6. Generate, copy, paste into Vercel env var `GITHUB_TOKEN`
7. Token expires — calendar a reminder to rotate.

### Setting up GoHighLevel messaging

1. In the Musser GHL sub-account, create a Private Integration Token with Contacts/Conversations scopes.
2. Paste it into Vercel as `GHL_API_KEY`.
3. Add `GHL_LOCATION_ID`.
4. Create or identify a CEO/internal contact in GHL and set `CEO_GHL_CONTACT_ID`.
5. Set `CEO_EMAIL`; the UI never exposes this address.

`/api/send-email` auto-routes by message type: plain text uses GHL when configured; branded HTML reports/summaries use Resend when configured. AR CEO summaries send a compact logo email plus a generated PDF attachment for the full invoice/aging detail. `MESSAGE_PROVIDER` is only for hard overrides.

## Local dev

```bash
npm install
vercel dev
```

Create `.env.local` mirroring the Vercel env vars. Do not check in.

## Debugging the KB

```
https://<your-deploy-url>/api/context
```

Returns which docs are currently loaded and the total KB length. Add `?force=1` to bypass the 60s cache.

## The two real functional tools

### 1. Pricing calculator — `/api/quote`

```bash
curl -X POST https://<your-deploy>/api/quote \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [
      { "sku": "forest_fuel_pellets", "quantity": 1 }
    ],
    "destinationZip": "13346",
    "customerType": "retail"
  }'
```

Returns a fully itemized quote (line items, discounts applied, delivery breakdown, total). The Pricing tab in the UI calls this on every input change. Same math is documented in `PRICING.md` — which is what the AI brain and the GHL Conversation AI read when answering pricing questions.

**Keep `PRICING.md` and `api/quote.js` in sync.** They must produce identical numbers.

GET `/api/quote` returns the full price book (used by the UI to populate the dropdown).

### 2. Send email to CEO — `/api/send-email`

```bash
curl -X POST https://<your-deploy>/api/send-email \
  -H 'Content-Type: application/json' \
  -d '{
    "preset": "to_ceo",
    "subject": "Weekly revenue snapshot",
    "body": "Revenue MTD is $94,800..."
  }'
```

Returns `{ ok: true, provider, sentTo, messageId }` on success. The UI's "Send to CEO" button composes a draft from the current Lumber Buddy conversation and fires this through GHL Conversations.

For AR/report emails, the UI can include `attachments: [{ filename, title, contentText }]`. `/api/send-email` turns `contentText` into a simple PDF attachment and sends it through Resend so Gmail does not have to render the entire report body inline.

## Living docs the brain reads

- `PROJECT_STATE.md` — what IS
- `ARCHITECTURE.md` — how components relate
- `CONSTANTS.md` — IDs, URLs (no secrets)
- `DECISIONS.md` — append-only log
- `GO_LIVE_CHECKLIST.md` — phased checklist
- `DEMO_CONTEXT.md` — rich demo narrative (delete at live go-live)
- `PRICING.md` — authoritative price list
- `BRAND_STYLE.md` — authoritative brand/style guide for generated artifacts

## Accounts Receivable — `/api/ar`

`/api/ar` currently returns placeholder Accounts Receivable data so the UI and brain can demonstrate Sage-ready reporting without pretending Sage 50 is connected. Future live sync should replace `api/connectors/sage50.js` with the confirmed access path: Sage AR Automation, Sage-supported API/connector, ODBC/SDK/export, or middleware.

## GHL Conversation AI — pricing consistency

The Musser GHL sub-account's Conversation AI should have **the full content of `PRICING.md`** pasted into its system prompt. This is how the chat/SMS agent quotes the same numbers as the in-app calculator. When prices change, update `PRICING.md`, update `api/quote.js`, and re-paste into the GHL agent config. All three must match.

## Deploy steps (first-time)

1. Push this repo to `labsobsidian/musser-biomass-ops`
2. Create a Vercel project, link to the GitHub repo
3. Set the 8 env vars in both Production and Preview
4. Push to `main` — auto-deploys
5. Visit `/api/context` — confirm GitHub fetch works
6. Open the root URL, open Lumber Buddy, ask a question — confirm streaming works
7. Open the Pricing tab, build a test quote, confirm numbers are right
8. Click "Send to CEO" (use a test `CEO_EMAIL` first) — confirm receipt

Once all four check, swap `CEO_EMAIL` to the real destination and you're demo-ready.
