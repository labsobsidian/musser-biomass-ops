# CONSTANTS.md — Musser Biomass
_Last updated: 2026-04-24_
_Never store secrets here. API keys and tokens live in Vercel env vars._

---

## Client

| Constant | Value |
|---|---|
| Legal entity | Musser Biomass (TBC) |
| Industry | Lumber / biomass / landscape supply |
| Primary products | Firewood (bulk + bundled), mulch, bark, wood chips, sawdust |
| Yard address | TODO |
| Service phone | TODO |
| CEO name | TODO (email via `CEO_EMAIL` env var) |

## GHL (planned)

| Constant | Value |
|---|---|
| Location ID | TODO |
| Inbound quote webhook | TODO |

## Vercel

| Constant | Value |
|---|---|
| Project name | `musser-biomass-ops` |
| API base | TBD on first deploy |
| Custom domain (planned) | `musser.labsobsidian.co` |

## GitHub

| Constant | Value |
|---|---|
| Org | `labsobsidian` |
| Repo | `labsobsidian/musser-biomass-ops` |
| Branch | `main` |

## Pricing (authoritative in `PRICING.md`)

| Constant | Value |
|---|---|
| Free delivery radius | 10 miles |
| Per-mile rate beyond free radius | $4.50 |
| Minimum delivery fee | $35 |
| Loading surcharge | $25 |
| Retail discount | 0% |
| Commercial discount | 8% |
| Wholesale discount | 12% |
| Firewood bulk threshold | 5 cords → +5% off firewood |
| Mulch bulk threshold | 10 yards → +5% off mulch |

## External APIs

| API | Base URL | Used for |
|---|---|---|
| Anthropic | `https://api.anthropic.com` | Lumber Buddy brain |
| Resend | `https://api.resend.com` | Send email |
| GitHub | `https://api.github.com` | KB fetch |
| Google Maps (planned) | `https://maps.googleapis.com` | Route optimization |

## Flags & modes

- `DEMO_MODE` — currently implicitly true (UI shows seeded data). Flip when QuickBooks/inventory live data is wired.

## TODO

- [ ] Yard address
- [ ] Service phone
- [ ] CEO name and email (env var only)
- [ ] GHL location ID
- [ ] QuickBooks company ID
- [ ] Supabase project ref (Phase 3)
- [ ] Real product SKUs from Musser's internal system (for bidirectional sync later)
