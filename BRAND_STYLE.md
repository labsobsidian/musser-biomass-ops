# BRAND_STYLE.md - Musser Biomass
_Last updated: 2026-04-27_
_Source of truth for Biomass Buddy / Atlas customer-facing output._

---

## How Atlas Uses This File

Atlas must consult this file before generating customer-facing content for Musser Biomass: websites, landing pages, PDF-style briefs, slide decks, quote layouts, emails, collection notes, and sales material.

If a user asks for something that conflicts with this guide, Atlas should flag the conflict and suggest the closest brand-safe version. Never invent claims, certifications, specs, testimonials, or prices.

---

## Brand Snapshot

- **Company:** Musser Biomass and Wood Products
- **Location:** Rural Retreat / Sugar Grove, Virginia
- **Plant ZIP:** `24368`
- **Core position:** Premium dried hardwood fiber and converted biomass products made from responsibly sourced Appalachian wood.
- **Known products:** Forest Fuel heating pellets, Forest Fuel briquettes, Alpha Fiber, Forest Fiber, bedding/fiber products.
- **Proof themes:** Low-temperature drying, sustainable sourcing, consistent product quality, FSC/ENPlus where verified by source pages, trucking/delivery capability, Appalachian hardwood supply.
- **Contact:** `276-686-5113`, `marketing@musserbiomass.com`, `200 Shoal Ridge Drive, Rural Retreat, VA 24368`.

---

## Voice

Musser should sound like a premium industrial supplier, not a lifestyle brand. The tone is grounded, precise, confident, and sustainability-aware.

### Do

- Lead with concrete product value: consistency, low moisture, clean fiber, reliable truckload supply.
- Use product names exactly: Forest Fuel, Forest Fiber, Alpha Fiber.
- Explain sustainability through process and sourcing, not vague green language.
- Write for wholesale buyers, stove dealers, bedding/fiber buyers, and operations teams.
- Keep sentences tight and practical.

### Don't

- Do not use generic lines like "eco-friendly solutions for a better tomorrow."
- Do not invent customer quotes, lab specs, certifications, BTU claims, or guaranteed performance.
- Do not present demo AR, quote, or finance data as live Sage/accounting data.
- Do not revive old Atlas fork language: firewood cords, mulch yards, local delivery routes, splitter/kiln schedule, or Shenandoah Valley landscaping.

---

## Visual System

### Palette

Use a premium industrial biomass palette: deep charcoal, warm off-white, restrained forest green, and aged gold.

| Token | Hex | Use |
|---|---:|---|
| `--musser-charcoal` | `#17130F` | Header, primary text, premium dark surfaces |
| `--musser-ink` | `#2B241D` | Secondary dark surfaces |
| `--musser-cream` | `#F7F3EA` | Page background |
| `--musser-surface` | `#FFFDF8` | Cards, panels, inputs |
| `--musser-border` | `#E2D8C9` | Borders and dividers |
| `--musser-gold` | `#B88A35` | Accent, active state, live tool mark |
| `--musser-green` | `#1F6B4A` | Success, sustainability, live data |
| `--musser-rust` | `#A9432C` | Alerts and risk |

Gold and green are accents. Do not flood pages with brown, beige, or green. The interface should feel executive and operational.

### Typography

- App/UI: DM Sans.
- Generated artifacts: system sans stack unless a real brand font is provided.
- Use compact labels, clear numbers, and generous line-height for executive readability.

### Imagery

- Prefer real plant, product, truckload, warehouse, fiber, pellets, and Appalachian hardwood imagery when available.
- Avoid stock families, generic forests, fake sustainability illustrations, and dark blurred backgrounds.

---

## Product Language

| Use | Avoid |
|---|---|
| Full truckload | Partial cord / local delivery |
| Freight | Delivery fee when discussing long-haul loads |
| Forest Fuel Heating Pellets | Generic pellets |
| Forest Fuel Briquettes | Firewood bricks unless quoting a source |
| Alpha Fiber | Bedding if the product context is Alpha Fiber |
| Dried hardwood fiber | Wood stuff / biomass material |
| Responsibly sourced Appalachian hardwood | Magical/unsupported green claims |

---

## Artifact Rules

### Logo Usage

- Use `/musser-logo.png` as the preferred logo in reports, PDF-style briefs, website previews, and slide/deck previews.
- Keep the logo scaled down and crisp, generally 120-170px wide in report headers.
- Do not use `MB` initials, placeholder lettermarks, brown logo boxes, invented badges, or fake marks in customer-facing materials.

### Website Preview

- Build a polished preview first, not a live-site claim.
- Required sections: Home, Products, Process/Quality, Sustainability/Mission, Contact.
- Use source-backed claims only.
- Mark unknown assets or final approvals as "needs confirmation" in non-customer-facing notes.

### PDF Brief

- Make it print-friendly, high contrast, and executive-readable.
- Use a clear cover/title, summary, evidence table, and action section.
- Good for AR summaries, quote summaries, weekly owner reports, and sales follow-up.

### Slide Deck

- Use slide-like sections with strong hierarchy and minimal text.
- Include an export-ready outline at the end.
- Do not fabricate charts or metrics; use demo labels when data is placeholder.

### Email

- Plain, direct, ready to send.
- Collection emails should be firm but relationship-aware.
- Owner/CEO summaries should start with the decision or risk, then supporting numbers.

---

## Quality Gates

Before any Atlas output is treated as ready:

1. **Source check:** every claim is supported by living docs, public Musser pages, or user-provided material.
2. **Brand check:** voice sounds like a premium industrial supplier.
3. **Product check:** product names, quantities, and freight language match `PRICING.md`.
4. **Data check:** placeholder AR/finance data is labeled as demo until Sage is connected.
5. **Visual check:** output uses restrained charcoal/cream/gold/green, not generic brown dashboards.
6. **Action check:** every deliverable has a clear next step.

---

## Forbidden Patterns

- Fake testimonials or customer logos.
- Unsupported certification/spec claims.
- Unlabeled placeholder finance or AR data.
- Generic AI copy.
- Old firewood/mulch/local-delivery language.
- Customer-facing statements that imply Sage 50 is already connected.
