# DECISIONS.md — Musser Biomass
_Append-only log. One entry per material decision. Newest at the bottom._

---

## 2026-04-24 — Fork from Atlas (Hardesty) pattern

**Decision:** Build the Musser Biomass ops app as a fork of the Atlas pattern established with Hardesty, rebranded as "Lumber Buddy by Obsidian Labs."

**Context:** Atlas worked well for Hardesty — single-file app, streaming chat from a Claude backend that reads the repo's living docs. Same pattern fits Musser: owner-operator business with siloed tools, an owner bottleneck on pricing, and a need for operational visibility.

**Alternatives considered:**
- Build something custom for Musser (rejected: slower, no reuse)
- Generic multi-tenant dashboard (rejected: too early, overfits to imagined requirements)

**Consequences:**
- Fast build (same scaffolding)
- Reusable for future clients (skills library compounds)
- Must maintain brand separation — "Lumber Buddy" is distinctly Musser's, not a rename of Atlas

---

## 2026-04-24 — Two real functional tools in the demo

**Decision:** Ship the first demo with two real, working tools: (1) pricing calculator (`/api/quote`), and (2) send-email-to-CEO (`/api/send-email` via Resend). Everything else is placeholder demo data.

**Context:** A fully-seeded-demo builds credibility, but buyers want to see *something* actually do work. Pricing is Musser's #1 pain point (owner fielding pricing questions all day) and email is the easiest "AI does a thing and sends it" moment.

**Alternatives considered:**
- Demo everything as seeded data (rejected: doesn't prove anything)
- Try to wire five live things (rejected: one of them always breaks on demo day)

**Consequences:**
- Those two endpoints must work reliably before demo day — test both end-to-end
- `PRICING.md` and `/api/quote.js` must stay in sync
- Resend domain verification is a prereq — don't leave until morning-of

---

## 2026-04-24 — Pricing source of truth = PRICING.md

**Decision:** `PRICING.md` is the single authoritative document for all product pricing, delivery rules, and discount logic. It's read by three systems: (1) Lumber Buddy brain (via `/api/context`), (2) pricing calculator (mirrored in `/api/quote.js`), and (3) GHL Conversation AI (pasted into its system prompt).

**Context:** When pricing lives in multiple places, the three systems will drift. Drift means the chat agent quotes one number, the calculator quotes another, and the team has no idea which is right.

**Alternatives considered:**
- Keep prices in a database (rejected: overkill pre-launch, adds a dependency)
- Hardcode in JS only (rejected: brain and chat agent can't read JS)

**Consequences:**
- Price changes require editing `PRICING.md` + `api/quote.js` in the same commit
- Whenever GHL Conversation AI is updated, re-paste the current `PRICING.md`
- At some point we may generate `quote.js` price book from `PRICING.md` at build time — revisit if drift bites us
