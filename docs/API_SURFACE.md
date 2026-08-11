# PLUTO — API Surface (Phase 0.4)

> Source of truth for `src/api.ts` (Express 5 + SSE). Produced 2026-08-12. Port `PLUTO_PORT` (default 4000), data dir `PLUTO_DATA_DIR` (default `./data`). Multi-tenant: every resource is scoped by `company_id`; per-company rows share one SQLite file.

## Realtime

| Method | Path | Notes |
|---|---|---|
| GET | `/api/events/stream` | Server-sent events for all companies. Server polls the event store every 1.2s and pushes new events per company. |

## Companies

| Method | Path | Notes |
|---|---|---|
| GET | `/api/companies` | List with derived rollups: agents, departments, tasks_total, tasks_failed, spend, approvals_pending, capabilities, projects, strategies. |
| POST | `/api/companies` | Body `{name, mission}`. Creates company, seeds default budgets (`ResourceEngine.defaults`) and policies (`PolicyEngine.seedDefaults`), emits `company.created`. |

## Company snapshot (dashboard)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/snapshot` | Full operating picture: org summary, graph, departments, agents (+task counts/fail rate), objectives, projects, tasks (≤100), events (80), pending approvals, decisions, budgets ledger, memory, learning, traces, capabilities, policies, risks, experiments, strategies, messages, jobs, artifacts, intelligence brief. |
| GET | `/api/company/:id/graph` | `{nodes, edges}` for the company. |

## Capabilities (§33)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/capabilities` | Registry rows. |
| POST | `/api/company/:id/capabilities` | Register `{name, provider?, description?, kind?}`. |
| POST | `/api/company/:id/capabilities/acquire` | Forge-or-buy decision via `CapabilityFactory.acquire`; materializes create/buy when the decision says so. Body `{name, description?, cost_ceiling_usd?, urgency?}`. |

## Strategy (§16)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/strategies` | List. |
| POST | `/api/company/:id/strategies` | `StrategyEngine.formulate`; body `{name?, kind?, options[]}` (options: `{name, expected, confidence, cost_usd, summary}`). |
| GET | `/api/company/:id/experiments` | List. |
| POST | `/api/company/:id/experiments` | Start: `{objective_id?, hypothesis, variant, metric, baseline?}`. |
| POST | `/api/company/:id/experiments/:eid/conclude` | `{observed}` → WIN/LOSE/INCONCLUSIVE vs baseline, emits `strategy.changed`. |

## Work graph (§7.8)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/workflow` | Stored workflows. |
| POST | `/api/company/:id/workflow` | Save workflow `{name?, kind?, definition?}`. |

## Policies (§7.13)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/policies` | List. |
| POST | `/api/company/:id/policies` | Register `{name?, scope?, rules[]}` (rules: `{action, effect, note?}`). |
| POST | `/api/company/:id/policies/check` | Evaluate `{role?, action?}` → `{effect, policy?}`. |

## Risks

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/risks` | List. |
| POST | `/api/company/:id/risks` | Create `{title, probability?, impact?}`. |

## Messaging (§24)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/messages` | List, `?limit=` (default 100). |
| POST | `/api/company/:id/messages` | Send typed contract message `{contract?, from_agent, to_agent?, to_department?, payload?}`. |

## Execution fabric (§7.10)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/jobs` | List, `?status=` filter (queued/running/retrying/succeeded/failed). |

## Intelligence (§7.2)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/intelligence` | `CompanyIntelligence.brief`: facts, customers, capabilities, recent errors, open risks, summary. |

## Projects & artifacts

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/projects` | List. |
| POST | `/api/company/:id/projects` | Create `{name, objective_id?, budget_usd?}`. |
| GET | `/api/company/:id/artifacts` | List. |

## Core records

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/objectives` | List. |
| GET | `/api/company/:id/tasks` | List, `?status=` filter. |
| POST | `/api/company/:id/tasks` | Submit task to the Workforce runtime; policy-gated (403 on deny). Body `{agent_id?, objective_id?, kind?, summary?, input?, role?}`. Runs async, broadcasts on completion. |
| GET | `/api/company/:id/events` | Event log, `?limit=` (default 200). |
| GET | `/api/company/:id/approvals` | `?status=` filter. |
| POST | `/api/approvals/:id/decide` | `{decision: approved\|rejected, by?}` → resolves approval, emits completion event. |
| GET | `/api/company/:id/resources` | Budget ledger with `pct` and `over` flags. |
| GET | `/api/company/:id/memory` | `?type=` + `?limit=` (default 50). |
| GET | `/api/company/:id/decisions` | Decision log, `?limit=` (default 100). |
| GET | `/api/company/:id/learning` | Lessons (applied + proposed). |
| GET | `/api/company/:id/traces` | LLM/tool traces, `?limit=` (default 100). |
| GET | `/api/company/:id/agents` | List. |
| POST | `/api/company/:id/agents` | Create agent for a capability need: `{name, role, department_id?, tools[], permissions[]}`. |

## Static

| Method | Path | Notes |
|---|---|---|
| GET | `/` (+ assets) | Dashboard SPA served from `apps/dashboard`. |

**Count:** 40 API endpoints + 1 SSE stream + static dashboard. No auth on any endpoint yet — dashboard is a local control plane (see Phase 0.5 open item; an admin token should gate mutating routes before any public exposure).
