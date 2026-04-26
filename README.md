# Musser Biomass — Lumber Buddy Deployment

**Lumber Buddy by Obsidian Labs** is the AI ops app for Musser Biomass. Pattern forked from Atlas (Hardesty). Single Vercel app that streams chat from Claude, pulling its knowledge base live from this GitHub repo. Adds two real functional tools on top: a pricing calculator and a send-to-CEO email endpoint.

## Architecture

```
Browser (index.html)
    │
    │  POST /api/claude  { role, messages }        ──► streams chat response
    │  POST /api/quote   { items, miles, ... }     ──► returns itemized quote (REAL)
    │  POST /api/send-email { preset, subject... } ──► sends to CEO via Resend (REAL)
    │
    ▼
Vercel serverless functions
    │
    ├─► /api/claude    ─► getContext() ─► GitHub living docs ─► Anthropic (SSE)
    ├─► /api/quote     ─► mirrors PRICING.md math
    └─► /api/send-email ─► Resend API
```

## Env vars (Vercel → Project Settings → Environment Variables)

| Name | Example | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Powers `/api/claude` |
| `GITHUB_TOKEN` | `github_pat_...` | Fine-grained PAT scoped to THIS repo only. `contents:read` is enough. |
| `CLIENT_REPO` | `labsobsidian/musser-biomass-ops` | Repo to read living docs from |
| `CLIENT_NAME` | `Musser Biomass` | Used in role preamble |
| `CLIENT_SLUG` | `musser-biomass` | Reserved for future connectors |
| `RESEND_API_KEY` | `re_...` | Email send — from resend.com dashboard |
| `FROM_EMAIL` | `lumber-buddy@musserbiomass.com` | Verified sender (Resend requires domain verification) |
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

### Setting up Resend

1. Sign up at resend.com
2. Add + verify the sending domain (DNS records — takes ~10 minutes to propagate)
3. Create an API key in the dashboard → paste into Vercel as `RESEND_API_KEY`
4. `FROM_EMAIL` must be on the verified domain, e.g. `lumber-buddy@musserbiomass.com`

**Until the domain is verified, `/api/send-email` will return 500 from Resend.**

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
      { "sku": "firewood_seasoned_oak", "quantity": 2 }
    ],
    "deliveryMiles": 18,
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

Returns `{ ok: true, sentTo, resendId }` on success. The UI's "Send to CEO" button composes a draft from the current Lumber Buddy conversation and fires this.

## Living docs the brain reads

- `PROJECT_STATE.md` — what IS
- `ARCHITECTURE.md` — how components relate
- `CONSTANTS.md` — IDs, URLs (no secrets)
- `DECISIONS.md` — append-only log
- `GO_LIVE_CHECKLIST.md` — phased checklist
- `DEMO_CONTEXT.md` — rich demo narrative (delete at live go-live)
- `PRICING.md` — authoritative price list

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
