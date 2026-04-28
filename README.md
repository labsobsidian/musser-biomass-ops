# Musser Biomass — Biomass Buddy Deployment

**Biomass Buddy by Obsidian Labs** is the AI ops app for Musser Biomass. Pattern forked from Atlas (Hardesty). Single Vercel app that streams chat through an OpenAI-first / Anthropic-fallback brain, pulling its knowledge base live from this GitHub repo. Adds real tools on top: pricing, send-to-CEO email, branded artifact previews, and placeholder Accounts Receivable shaped for future Sage 50 sync.

## Architecture

```
Browser (index.html)
    │
    │  POST /api/claude  { role, messages }        ──► streams chat response
    │  POST /api/quote   { items, miles, ... }     ──► returns itemized quote (REAL)
    │  POST /api/send-email { preset, subject... } ──► sends to CEO via Obsidian Labs CRM (REAL)
    │  GET  /api/ar                              ──► placeholder AR aging (Sage 50 later)
    │
    ▼
Vercel serverless functions
    │
    ├─► /api/claude    ─► getContext() ─► GitHub living docs ─► OpenAI/Anthropic (SSE)
    ├─► /api/quote     ─► mirrors PRICING.md math
    ├─► /api/send-email ─► Obsidian Labs CRM Conversations API
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
| `CEO_GHL_CONTACT_ID` | `abc123` | CRM contact record used for CEO email timeline |
| `GHL_SEND_FROM_EMAIL` | `sales@musserbiomass.com` | Optional CRM sender override |
| `RESEND_API_KEY` | `re_...` | Branded/internal HTML reports and summaries |
| `FROM_EMAIL` | `biomass-buddy@labsobsidian.co` | Verified sender for Resend report emails |
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

### Setting up Obsidian Labs CRM messaging

1. In the Musser CRM sub-account, create a Private Integration Token with Contacts/Conversations scopes.
2. Paste it into Vercel as `GHL_API_KEY`.
3. Add `GHL_LOCATION_ID`.
4. Create or identify a CEO/internal contact in Obsidian Labs CRM and set `CEO_GHL_CONTACT_ID`.
5. Set `CEO_EMAIL`; the UI never exposes this address.

`/api/send-email` auto-routes by message type: plain text uses Obsidian Labs CRM when configured; branded HTML reports/summaries use Resend when configured. AR CEO summaries send a compact logo email plus a generated PDF attachment for the full invoice/aging detail. `MESSAGE_PROVIDER` is only for hard overrides.

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

Returns a fully itemized quote (line items, discounts applied, delivery breakdown, total). The Pricing tab in the UI calls this on every input change. Same math is documented in `PRICING.md` — which is what the AI brain and the Obsidian Labs CRM Conversation AI read when answering pricing questions.

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

Returns `{ ok: true, provider, sentTo, messageId }` on success. The UI's "Send to CEO" button composes a draft from the current Biomass Buddy conversation and fires this through Obsidian Labs CRM Conversations.

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

## Obsidian Labs CRM Conversation AI — pricing consistency

The Musser CRM sub-account's Conversation AI should have **the full content of `PRICING.md`** pasted into its system prompt. This is how the chat/SMS agent quotes the same numbers as the in-app calculator. When prices change, update `PRICING.md`, update `api/quote.js`, and re-paste into the CRM agent config. All three must match.

## Deploy steps (first-time)

1. Push this repo to `labsobsidian/musser-biomass-ops`
2. Create a Vercel project, link to the GitHub repo
3. Set the 8 env vars in both Production and Preview
4. Push to `main` — auto-deploys
5. Visit `/api/context` — confirm GitHub fetch works
6. Open the root URL, open Biomass Buddy, ask a question — confirm streaming works
7. Open the Pricing tab, build a test quote, confirm numbers are right
8. Click "Send to CEO" (use a test `CEO_EMAIL` first) — confirm receipt

Once all four check, swap `CEO_EMAIL` to the real destination and you're demo-ready.

## Website importer and marketing suite

`/api/website-import` imports one public page only after DNS ownership proof. It returns the TXT record name/value to add in GoDaddy, then fetches safe public HTML and passes it into Biomass Buddy as first-party website context.

The Marketing tab includes AEO Monitor, Competitors, Ad Performance, Content Studio, Monday Brief, and Text Campaigns. Draft generation starts with `/api/marketing-draft`; live publishing to a Vercel-hosted blog or Obsidian Labs CRM Social Planner is the next adapter once the hosting/API path is confirmed.

GoDaddy should keep DNS/domain ownership. Vercel is the preferred home for future Atlas-managed Musser site/blog updates because content changes can be versioned and deployed from GitHub.

## CRM text campaigns

Set these Vercel env vars for the text tools:

| Name | Purpose |
|---|---|
| `IMPORT_VERIFICATION_SECRET` | Signs DNS TXT proof before website import |
| `BIOMASS_BUDDY_DEMO_LINK` | Link sent in the executive demo SMS campaign |
| `REVIEW_WORKFLOW_LINK` | Link sent in the review workflow SMS campaign |
| `VOICE_AGENT_PHONE` | Voice agent number sent by SMS |
| `EXEC_DEMO_TAG` | Defaults to `biomass-demo-board` |
| `REVIEW_TEST_TAG` | Defaults to `biomass-demo-board` |
| `REORDER_FOLLOWUP_TAG` | Defaults to `biomass-reorder-followup` |
| `GHL_TAG_CONTACTS_JSON` | Optional demo fallback if CRM tag lookup is unavailable |

Create CRM tags `biomass-demo-board`, `biomass-review-test`, and `biomass-reorder-followup`. Tag Eric, Becky, Mark, and Mick with `biomass-demo-board`. In Biomass Buddy, open Marketing -> Text Campaigns, preview recipients, then confirm send. `/api/send-sms` enforces `Reply STOP to opt out.` on every outbound SMS, including custom prompt-written messages. The first demo-link handoff can be sent by email instead of SMS through `/api/send-campaign-email`; chat commands that say "email the demo link" should use this email endpoint, not `/api/send-sms`.
