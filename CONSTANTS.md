# CONSTANTS.md — Musser Biomass
_Last updated: 2026-04-24_
_Never store secrets here. API keys and tokens live in Vercel env vars._

---

## Client

| Constant | Value |
|---|---|
| Legal entity | Musser Biomass (TBC) |
| Industry | Biomass / dry wood fiber / converted hardwood products |
| Primary products | Forest Fuel pellets, Forest Fuel briquettes, Alpha Fiber, Forest Fiber |
| Plant address | 200 Shoal Ridge Drive, Rural Retreat, VA 24368 |
| Service phone | 276-686-5113 |
| Public email | marketing@musserbiomass.com |
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
| Plant origin ZIP | 24368 |
| Freight rate | $2.95 / mile / load |
| Minimum freight charge | $0 |
| Fuel surcharge | $0 |
| Deadhead charge | $0 |
| Customer-type adjustments | Reserved for future use; all currently 0% |
| Quantity rule | Whole truckloads only |

## External APIs

| API | Base URL | Used for |
|---|---|---|
| Anthropic | `https://api.anthropic.com` | Lumber Buddy brain |
| Resend | `https://api.resend.com` | Send email |
| GitHub | `https://api.github.com` | KB fetch |
| Sage 50 (planned) | TBD | Accounts receivable and invoice sync |
| Google Maps (planned) | `https://maps.googleapis.com` | Route optimization |

## Flags & modes

- `DEMO_MODE` — currently implicitly true (UI shows seeded data). Flip when accounting/inventory live data is wired.
- `AI_PROVIDER` — `openai` by default, `anthropic` as fallback/config option.

## TODO

- [x] Plant address
- [x] Service phone
- [ ] CEO name and email (env var only)
- [ ] GHL location ID
- [ ] Sage 50 access path (AR Automation, API/connector, ODBC/SDK/export, or middleware)
- [ ] Supabase project ref (Phase 3)
- [ ] Real product SKUs from Musser's internal system (for bidirectional sync later)
