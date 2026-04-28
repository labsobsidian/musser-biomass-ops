# Biomass Buddy Demo Runbook

## Goal

Show Musser leadership that Biomass Buddy is not just a chatbot. It is a branded operating layer that can read the business docs, quote from approved pricing, generate executive reports, prepare website/marketing drafts, and send confirmed CRM messages.

## Recommended Flow

### 1. Open With The Operating System

- Start on the Biomass Buddy tab as `CEO - Eric Wood`.
- Say: "This is the executive command center. Every answer is grounded in Musser's living docs, pricing rules, brand guide, and connected tools."
- Show the role switcher: CEO, CFO, VP Sales, Board of Directors. All currently have full demo permissions.

### 2. Prove The Brain Uses Real Business Context

Prompt:

> Summarize what Biomass Buddy knows about Musser Biomass and the current demo-ready tools.

Point out:

- GitHub living docs provide the source of truth.
- The brand guide controls customer-facing outputs.
- Sage 50 AR is placeholder until live access is available.

### 3. Show The Quote Tool

Go to Pricing or ask:

> Quote 1 load pellets to ZIP 13346.

Point out:

- Pricing comes from `PRICING.md`.
- Freight logic is centralized in `/api/quote`.
- The CRM agent can use the same rules.

### 4. Show Accounts Receivable

Go to Accounts Receivable or ask:

> Create an AR PDF brief for the CEO.

Point out:

- Current data is visibly labeled demo/placeholder.
- Sage 50 connector boundary is ready.
- Branded PDF/reporting is the part to make feel premium.

### 5. Show Marketing And AEO

Go to Marketing -> AEO Monitor.

Show:

- AEO visibility score.
- Priority queries.
- Product FAQ builder.
- Citation gap report.
- Competitor watchlist.
- Content Studio drafts.

Prompt:

> Draft an AEO article for bulk hardwood pellets Virginia.

### 6. Show Confirmed Text Campaigns

Go to Marketing -> Text Campaigns.

Demo with dry-run/preview first:

- Biomass Buddy link.
- Review workflow.
- Reorder follow-up.
- Voice agent phone number.

Say: "It previews recipients and copy before anything sends."

### 7. Close With Website Path

Use Website Import or Website Preview.

Say: "GoDaddy can keep the domain, but Vercel becomes the editable site/blog path. That is what will let Biomass Buddy generate AEO articles and publish approved updates later."

## Demo Guardrails

- Do not imply Sage 50 is live yet.
- Do not imply website publishing is live until DNS/Vercel path is approved.
- Do not send SMS live unless the recipient preview is correct.
- If any real API key is missing, frame it as a safe demo mode instead of a failure.

## Best Closing Line

Biomass Buddy starts as an AI command center, but the bigger idea is that every workflow Musser already runs can become a tool inside the same branded system.
