# PLUTO — API Surface (Phase 0.4 + P1)

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

## Meta layer (P1, §1c) — self-extension

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/meta/introspect` | `MetaAgent.whatCanIDo` — capabilities, agents (id/role/tools/budget/success_rate), tool names, open gaps, budgets. System reports what it can/cannot do. |
| POST | `/api/company/:id/meta/spawn` | Auto-create an agent for a gap: `{capability, reason?}` → LLM writes `AgentSpec` → register → returns `{agent_id, role, status, spec}`. |
| POST | `/api/company/:id/meta/agents/:agentId/kill` | Kill switch — retires a spawned entity, records memory + event. 404 if not in this company. |

## Brain layer (1g)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/brain/usage` | Aggregate router (+cache) usage + total cost. |
| GET | `/api/company/:id/brains/tunes` | Fine-tune registry rows for the company. |
| POST | `/api/company/:id/brains/tunes` | Register a model version `{task_kind?, model?, active?, fraction?}`. |
| POST | `/api/company/:id/brains/tunes/rollback` | `{task_kind?}` → roll `active` back one version. |

## World model (1a)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/world/facts` | Current facts. |
| POST | `/api/company/:id/world/facts` | `WorldModel.assert` `{entity, attribute, value, kind?, confidence?, source?}`. |
| GET | `/api/company/:id/world/mirrors` | External mirrors + drift. |
| POST | `/api/company/:id/world/mirrors` | `syncMirror` `{system, payload}` → computes checksum, flags drift. |
| GET | `/api/company/:id/world/mirrors/reconcile` | Reconcile drifted mirrors; reports (does not silently clear). |
| GET | `/api/company/:id/world/snapshot` | C26 world snapshot mirror. |
| GET | `/api/company/:id/world/asof` | `?t=` timestamp → `WorldModel.asOf` time-travel view. |

## Messaging (§24)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/messages` | List, `?limit=` (default 100). |
| POST | `/api/company/:id/messages` | Send a contract `{contract?, from_agent, to_agent?, to_department?, payload?}`. |
| POST | `/api/company/:id/messages/offer` | `MessageBus.offer` negotiation. |
| POST | `/api/company/:id/messages/confess` | Private self-doubt (`confidential` channel). |

## Tool synthesis + canary (1c)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/company/:id/meta/tools/synthesize` | `T: {spec}` → returns parsed `ToolSpec` or error (`ToolSynthesizer.synthesize`). |
| POST | `/api/company/:id/meta/tools/test` | `{spec, tests[]}` → `sandboxTest` (compile + run synthetic tests in node:vm). |
| POST | `/api/company/:id/meta/canary` | `CanaryDeploy.start` `{tool_name}`. |
| GET/POST | `/api/company/:id/meta/canary/:id/promote\|rollback\|stop` | Staged rollout control. |

## Immune system (1d)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/immune/health` | `{agents, tools}` health snapshots. |
| POST | `/api/company/:id/immune/classify` | `{reason, input?}` → failure class. |
| POST | `/api/company/:id/immune/fix-tool` | `{tool_name, spec, tests[], error}` → code-fix via ToolSynthesizer revalidation; returns `RepairLog`. |
| POST | `/api/company/:id/immune/repair-agent/:agentId` | Reconfigure a degraded agent; returns `RepairLog`. |
| POST | `/api/company/:id/immune/validate` | `{spec, synthetic[], historical[]}` → `{ok, failures}` test-runner gate. |
| POST | `/api/company/:id/immune/promote` | `{tool_name}` → begin canary promotion. |
| GET | `/api/company/:id/immune/audit` | Repair/audit log for the company. |
| GET | `/api/company/:id/immune/human-wakeups` | `{count}` — humans woken (should stay ~0). |
| POST | `/api/company/:id/immune/adversary` | `{candidate, probes[]}` → C5 red-team run `{vulnerable, findings, patch}`. |
| GET | `/api/company/:id/immune/adversary/findings` | Adversary finding log. |

## Foraging layer (1f)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/company/:id/forage/scavenge` | `{feeds[]}` → C85 daemon: evaluate each and file as candidate/rejected/museum in the `foraged` table. |
| POST | `/api/company/:id/forage/on-demand` | `{capability, feeds[]}` → C86: museum-first, else scavenge for a capability gap. |
| POST | `/api/company/:id/forage/evaluate` | `{candidate}` → C87 eval report `{code_quality, has_tests, license, security, maintainer_activity, fit, score, verdict}`. |
| POST | `/api/company/:id/forage/integrate` | `{candidate, spec, tests[], capabilityName?}` → C88: sandbox-test → register capability version → canary → `{ok, canaryId, reason}`. |
| GET | `/api/company/:id/forage/museum` | C89 all archived candidates. |
| GET | `/api/company/:id/forage/search` | `?source=&status=&capability=&q=` filterable museum query. |
| POST | `/api/company/:id/forage/trends` | `{feeds[]}` → C90 predicted-trend ranking. |

## Reality interface (1e)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/reality/channels` | List of 11 channels + connect state. |
| POST | `/api/company/:id/reality/sync` | Push every connected provider's ground truth into world mirrors (`reality.<kind>`). |
| POST | `/api/company/:id/reality/ingest` | Inbound webhook/message `{channel, from, body, meta?}` → provider records + bus `report`. |
| POST | `/api/company/:id/reality/route` | Outbound action `{channel, op, payload?}` → routed to the provider. |
| GET | `/api/company/:id/reality/mirrors` | World mirrors for all reality channels. |

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
