# UX Contract

## Product context

- **Audience:** Football-statistics users and the FootyEdge operator.
- **Primary jobs:** Review daily model signals, understand historical performance, and monitor whether the data pipeline is fresh and complete.
- **Active locales:** `es`, `en`.
- **Accessibility target:** WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `src/app/api/admin/stats/route.ts` | Route authorization | 2026-09-18 |
| Data lifecycle | `src/app/api/matches/analyze-league/route.ts`, `src/app/api/cron/settle-results/route.ts` | API route behavior | 2026-09-18 |
| Billing / payment | `src/app/api/stripe/checkout/route.ts` | Route behavior | 2026-09-18 |
| Legal copy | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | Product pages | 2026-09-18 |

## Visual contract

- **Project `DESIGN.md`:** `DESIGN.md`.
- **Token ownership model:** existing runtime canonical.
- **Runtime token source:** `src/app/globals.css` CSS custom properties.
- **Drift gate:** `DESIGN.md` mirrors runtime values; update both when changing a shared token.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Scrollbar | `src/app/globals.css` | CSS custom properties | geometry only | computed style / browser |
| Select/Listbox | Native `<select>` in rankings filters | `src/app/rankings/RankingsClient.tsx` | native | keyboard + browser popup |
| Status panel | Admin pipeline panel | `src/app/api/admin/stats/route.ts` | healthy, stale, attention, idle | API + browser |
| Toast | Dashboard `Notif` component | `DashboardClient.tsx` | ok, warn, err | dashboard interaction |
| Value-league radar | `ValueLeagueRadar` | `src/components/dashboard/widgets/ValueLeagueRadar.tsx` | upcoming curated league match, maximum five selections | keyboard + browser |
| CRUD | Picks route handlers | `src/app/api/picks` | create / delete | authenticated flow |

## Flow ledger

| Operation | Trigger | Pending | Success feedback | Failure recovery | Source ref |
|---|---|---|---|---|---|
| Read model performance | Dashboard load | Stable loading panel | Verified metrics or explicit empty state | Retry button | `AIPerformanceWidget.tsx` |
| Select matches for contextual scouting | Value League Radar on dashboard | Explicit “Analizar seleccionados” busy state; no provider request while selecting | Show per-match pick/rejection and link to saved context | Inline API error, retain selection | `ValueLeagueRadar.tsx`, `api/radar/analyze` |
| Read contextual analysis | Explicit AI tab from a model-selected match | Existing analysis quota/payment state | Cached or newly generated context | Retry or plan/payment path | `api/match/[id]/ai-analysis` |
| Refresh admin health | Operator button | Button remains available | Fresh database-derived status | Inline page error | `admin/page.tsx` |
| Run daily pipeline | Admin control | Determinate workflow status | GitHub Actions conclusion | Link/status inspection | `DashboardClient.tsx` |

## Navigation and responsive behavior

- Dashboard filter state remains in the current session; it is exploratory, not a shareable report.
- Marketing navigation uses route/anchor links; its mobile menu is an explicit labeled navigation region.
- Dense match comparison keeps its table strategy; essential status and numeric labels remain textual.

## Async and resilience

- Read requests use a loading, empty, success or recoverable-error state; no success is inferred from an empty response.
- The pipeline health panel only reports database freshness/coverage and credential configuration. Provider reachability is validated by execution and surfaced in GitHub Actions.
- Background pipeline actions do not claim completion until GitHub reports it.

## Verification

- Unit tests: `npm test -- --runInBand`.
- Production build: `npm run build`.
- Browser coverage: dashboard performance loading/error/empty states, admin health states and landing mobile menu/FAQ.
