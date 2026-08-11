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

## Sovereign Layer (2a)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/sovereign/companies` | Spawn a new company `{name, mission}` (company factory). |
| GET | `/api/sovereign/companies` | List all companies under the civilization. |
| POST | `/api/sovereign/lessons` | Record a cross-company lesson `{content, source?, tags?}`. |
| GET | `/api/sovereign/lessons` | Query shared cross-company memory. |
| POST | `/api/company/:id/sovereign/halt` | Per-company kill switch `{reason?, by?}` → status halted, agents inactive. |
| POST | `/api/company/:id/sovereign/resume` | Resume a halted company. |
| POST | `/api/sovereign/halt-all` | Global kill switch `{reason?, by?}`. |
| POST | `/api/company/:id/rollback/register` | Register per-action rollback `{action_type, action_id, reverse}`. |
| POST | `/api/rollback/:id/apply` | Apply a registered rollback. |
| GET | `/api/company/:id/rollbacks` | List rollback registry for a company. |
| POST | `/api/company/:id/sovereign/heartbeat` | Owner heartbeat `{owner_id}` (resets deadman's clock). |
| POST | `/api/company/:id/sovereign/deadman` | Run deadman check `{days?=7}` → `{status: active|read-only}`. |
| GET | `/api/company/:id/sovereign/digest` | Daily owner digest: tasks/spend/approvals/risks/events/halted. |
| POST | `/api/company/:id/sovereign/approve` | Route approval `{action, summary, cost_usd, tier: auto|gated|human-only}`. |
| POST | `/api/company/:id/sovereign/owners` | Add an owner `{name, role, email?, authority[]}` (C50 multi-owner). |
| GET | `/api/company/:id/sovereign/owners` | List owners for a company. |

## Civilization Governance (2b)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/civilization/constitution` | Seeded Constitution articles (C27). |
| POST | `/api/civilization/constitution/amend` | Amendment `{article_id, newBody, authority?}`; entrenched needs `authority: human`. |
| POST | `/api/company/:id/ethics/vet` | Ethics Officer veto `{action, description}` → `{allowed, reason}` (C28). |
| GET | `/api/company/:id/ethics/log` | Ethics verdict log. |
| POST | `/api/company/:id/court/adjudicate` | Constitutional Court `{dispute, article_ref?}` → ruling (C51). |
| POST | `/api/company/:id/whistleblower` | Whistleblower escalation `{from_agent, concern}` (C13). |
| GET | `/api/company/:id/whistleblower/concerns` | List escalated concerns. |
| POST | `/api/company/:id/challenge` | Anti-Sovereign weighted risks `{proposal}` (C12). |
| POST | `/api/company/:id/explain` | Store human-readable rationale `{decision, rationale}` (C30). |
| GET | `/api/company/:id/explanations` | Stored rationales. |
| POST | `/api/company/:id/protected-core` | Protect a never-self-modify path `{path, reason}` (C60). |
| GET | `/api/company/:id/protected-core` | Verify protected core integrity. |
| POST | `/api/company/:id/amnesty/review` | Agent review `{agent_id, violation}` → retrain/re-scope/retire/clear (C52). |
| GET | `/api/civilization/audit` | Verify the immutable hash-chained audit log. |

## Entity #1 Runtime (2c)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/company/:id/entity/council` | Form mini-Council `{miniSovereign, miniEthics, miniHistorian}` (C96). |
| POST | `/api/company/:id/entity/anchor` | Anchor audit tail `{notary?}` → tamper-evident chain (C100). |
| GET | `/api/company/:id/entity/anchors` | List anchor chain. |
| POST | `/api/company/:id/entity/configure` | Configure mission/budget/KPIs `{mission, daily_budget_usd, kpis}`. |
| GET | `/api/company/:id/entity/persona` | Priya persona (name, role, personality, scenario) (C18). |
| POST | `/api/company/:id/entity/intake` | Intake lead `{channel, contact, interest, budget, timeline, humanFlag?}` → rubric score + qualified + books viewing if strong. |
| GET | `/api/company/:id/entity/leads` | List all leads. |
| GET | `/api/company/:id/entity/escalation-rules` | Escalation triggers (outbound_spend, high_risk, constitution_conflict, customer_complaint). |
| GET | `/api/company/:id/entity/spend-caps` | Spend caps (₹500/day LLM, ₹0 outbound). |
| POST | `/api/company/:id/entity/outbound-spend` | Try outbound spend `{amount}` → blocked with approval if > ₹0. |
| GET | `/api/company/:id/entity/historian` | Mini-Historian recent events summary. |

## Grace & Rehearsal (2d)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/company/:id/grace/fugue` | Enter Fugue Mode `{severity: minor|major|existential, reason}` (C112). |
| POST | `/api/company/:id/grace/fugue/exit` | Exit Fugue Mode (reactivates suspended agents). |
| GET | `/api/company/:id/grace/fugue/status` | Current fugue state. |
| POST | `/api/company/:id/grace/offswitch` | Initiate 60s graceful shutdown `{trigger, actions[]}` (C113). |
| POST | `/api/company/:id/grace/offswitch/tick` | Tick the countdown (call once/sec). |
| POST | `/api/company/:id/grace/offswitch/cancel` | Cancel the off-switch delay. |
| GET | `/api/company/:id/grace/offswitch/status` | Current off-switch state. |
| POST | `/api/company/:id/grace/rehearsal/plan` | Plan rehearsal `{action, plan}` → sandbox + simulated-human (C114). |
| POST | `/api/company/:id/grace/rehearsal/approve` | Approve rehearsal `{rehearsalId}` for real execution. |
| POST | `/api/company/:id/grace/rehearsal/execute` | Execute approved rehearsal. |
| POST | `/api/company/:id/grace/rehearsal/reject` | Reject rehearsal `{rehearsalId, reason}`. |
| GET | `/api/company/:id/grace/rehearsals` | List rehearsals. |
| POST | `/api/company/:id/grace/whimsy/init` | Initialize whimsy budget `{percentage?=0.015}` (C115). |
| POST | `/api/company/:id/grace/whimsy/spend` | Spend whimsy `{description, cost_usd}` (capped, joy=true). |
| GET | `/api/company/:id/grace/whimsy/ledger` | Whimsy ledger (budget, spent, acts). |
| GET | `/api/company/:id/grace/status` | Aggregate status (fugue, offswitch, rehearsals, whimsy). |

## 90-Day Operations (2e)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/:id/ops/status` | Current phase, day, logged counts. |
| GET | `/api/company/:id/ops/day` | Current day + phase. |
| GET | `/api/company/:id/ops/phase-summary` | Phase + days in/remaining. |
| POST | `/api/company/:id/ops/day` | Record daily entry `{decisions_logged, escalations, human_reviews, leads_qualified, meetings_booked, deals_closed, rollback_incidents, spend_usd, revenue_usd, notes?}`. |
| POST | `/api/company/:id/ops/day/auto` | Auto-record day from company state. |
| GET | `/api/company/:id/ops/days` | List all recorded days. |
| POST | `/api/company/:id/ops/week` | Record weekly retro `{retro_notes}`. |
| GET | `/api/company/:id/ops/weeks` | List weeks. |
| POST | `/api/company/:id/ops/month` | Record monthly audit `{audit_notes, unit_economics?}`. |
| GET | `/api/company/:id/ops/months` | List months. |
| GET | `/api/company/:id/ops/gate` | Evaluate Phase 2 gate criteria (pass/fail + per-criterion). |

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
