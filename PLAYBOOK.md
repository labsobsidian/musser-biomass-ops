# PLAYBOOK.md - Biomass Buddy Learning Map
_Atlas Learning Loop source map for Musser Biomass._

---

## Purpose

This document tells Biomass Buddy where approved lessons belong. Raw corrections, GHL logs, voice transcripts, Sage data, Amazon data, spreadsheets, and future APIs must enter the learning queue first. Only reviewed and approved lessons become live knowledge.

## Target Documents

| Category | Target doc | Notes |
|---|---|---|
| Pricing | `PRICING.md` | High-risk. Keep `/api/quote.js` and `/api/distance.js` in sync when logic changes. |
| Freight | `PRICING.md` | High-risk. Confirm lane exceptions and mileage overrides before promotion. |
| Brand | `BRAND_STYLE.md` | Customer-facing voice, artifact design, terminology, and quality gates. |
| Operations | `PROJECT_STATE.md` or `DEMO_CONTEXT.md` | Use `PROJECT_STATE.md` for real operating truth; use `DEMO_CONTEXT.md` for demo narrative. |
| Customer handling | `LEARNING_LOG.md` or future `CUSTOMERS.md` | Do not invent customer promises. |
| Accounting | `PROJECT_STATE.md` or future Sage connector docs | High-risk. Sage 50 remains source of truth once connected. |
| Compliance | `PLAYBOOK.md` or legal/compliance doc | High-risk. Requires explicit owner/admin approval. |
| Tool behavior | `ARCHITECTURE.md` or endpoint code | Code changes need a normal engineering review. |
| Product | `PRICING.md` or `DEMO_CONTEXT.md` | Product specs and claims are high-risk when customer-facing. |
| Other | `LEARNING_LOG.md` | Approved operating lessons that do not fit another doc. |

## Promotion Rules

- Pending items are not live knowledge.
- Approved low/medium-risk items may be appended to `LEARNING_LOG.md`.
- High-risk items may be approved, but should be treated as instructions to patch the target doc and any related code before customer-facing use.
- External connectors normalize source evidence into learning items; they do not update the live KB directly.
