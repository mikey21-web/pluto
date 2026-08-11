# PLUTO — Codebase Map

> Hour-2 deliverable (executor onboarding). Produced 2026-08-12.
> Source of truth for *what exists, what is stubbed, what conforms to ARCHITECTURE.md, what needs refactoring in Phase 0.*

---

## 1. Baseline status

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ passes (strict TS) |
| `npm test` | ✅ 24/24 pass (node:test runner, `test/*.test.ts`) |
| Runtime | Node.js 22+ · `node:sqlite` (native, experimental) · ESM + TS type-stripping |
| Deploy surface | `src/api.ts` (Express 5 + SSE) → dashboard SPA at `:4000` |

**Stack (committed):** TypeScript strict · Node 22 · SQLite (`node:sqlite`) · Express 5 · Playwright · esbuild. No test framework deps — native `node:test`. Proto state: healthy.

---

## 2. What exists — file:line map

### 2.1 Kernel (Domain + Storage) — `src/kernel/`
| File | What | Key refs |
|---|---|---|
| `types.ts` | 25+ domain entity interfaces + canonical contracts + LLM/tool Agreements | `Company` `repos.ts:22` · `Agent` `:41` · `Task` `:61` · `EventRecord` `:75` · `Message` `:175` · `Job` `:183` · `LlmDriver` `:231` · `ToolDef` `:206` |
| `store.ts` | `node:sqlite` schema (25 tables), WAL, indexes | schema `store.ts:9-128` |
| `repos.ts` | 50+ repo CRUD methods across all entities, event append, graph upsert, jobs, messages | e.g. `createAgent` `repos.ts:98` · `appendEvent` `:223` · `spend` `:372` · `sendMessage` `:577` · `createJob` `:597` |
| `state.ts` | `PlutoState` facade — emit/event helpers, memory, spend, link | `emit` `state.ts:24` · `remember` `:38` |
| `index.ts` | re-export facade | `kernel/index.ts:1` |

**Kernel is domain-neutral today** — entity fields are generic (company, agent, objective, task). No real-estate/agency fields in the schema.

### 2.2 Event Bus — `src/events/bus.ts`
Persist + fan-out pub/sub over the events table. Typed `EventType` list (~32 types), `*` wildcard, handler isolation.
- contract: `bus.ts:37-64` · constants: `EV` `bus.ts:67`

### 2.3 Agents — `src/agents/`
| File | What | Key refs |
|---|---|---|
| `llm.ts` | `DeepSeekV4Flash` (OpenAI-compatible) + `MockV4Flash` deterministic offline driver + `makeDriver()` | `DeepSeekV4Flash` `llm.ts:7` · `MockV4Flash` `:60` · `makeDriver` `:153` |
| `loop.ts` | Agent Loop: system prompt + recall → LLM → tool calls → results → repeat; bounded steps, traced, costed | `AgentLoop.run` `loop.ts:40` · `buildSystemPrompt` `:92` |

### 2.4 Tool Fabric — `src/tools/fabric.ts`
Registry-style fabric (registry only, **no runtime synthesis**). Adapters: `time.now`, `utils.echo`, `memory.write`, `memory.recall`, `graph.lookup`, plus `fsTools` (sandboxed), `browserTool` (Playwright), `httpTool`.
- `buildToolFabric` `fabric.ts:7` · `fsTools` `:85` · `browserTool` `:118` · `httpTool` `:144`

### 2.5 Org Engine — `src/org/`
| File | What | Key refs |
|---|---|---|
| `engines.ts` | `OrgEngine.build` (company → objective → departments → managers), **hardcoded BLUEPRINTS**, `StrategyEngine` (formulate/argmax/experiments) | `BLUEPRINTS` `engines.ts:8` · `blueprintFor` `:36` · `OrgEngine.build` `:43` · `StrategyEngine.formulate` `:114` |
| `workforce.ts` | `Workforce` runtime: submit/run/retry/verify/succeed, agent assignment by department, budget hard-gate | `submit` `workforce.ts:57` · `run` `:67` · `TASK_SPECS` `:25` |

### 2.6 Capability Factory — `src/capability/factory.ts`
Reuse / create / buy / delegate / defer decisioning + materialization + seed catalog.
- `acquire` `factory.ts:39` · `seedCapabilities` `:94`

### 2.7 Control Plane — `src/plane/`
| File | What | Key refs |
|---|---|---|
| `governance.ts` | Risk classification, auto-approve vs require-approval, human registry | `approveOrBlock` `governance.ts:18` · `classifyRisk` `:35` |
| `policy.ts` | Policy engine: allow/deny/require_approval, glob actions, scoped precedence | `evaluate` `policy.ts:23` · `seedDefaults` `:41` |
| `resources.ts` | Budgets, allocation, `canSpend`/`spend` hard ceiling, ledger | `canSpend` `resources.ts:49` · `spend` `:58` |
| `observability.ts` | Per-step traces, cost/latency, task telemetry, agent perf | `agentHook` `observability.ts:14` |

### 2.8 Work / Execution — `src/work/`
| File | What | Key refs |
|---|---|---|
| `graph.ts` | Work DAG: addNode with dep validation, Kahn topo sort, cycle detection, `available()` | `topoOrder` `graph.ts:54` |
| `fabric.ts` | Durable jobs: retry/backoff, heartbeat, failure classification, terminal states | `ExecutionFabric.run` `fabric.ts:52` · `classify` `:11` |

### 2.9 Verification — `src/verify/engine.ts`
Independent verifier registry (`output_exists`, `no_hallucination`). An agent saying "done" is never evidence — enforced by design.
- `verify` `engine.ts:21` · `defaultVerifiers` `:42`

### 2.10 Learning + Evolution — `src/learn/engine.ts`
`LearningEngine` (lesson proposals from failures, company audit → evolution proposals) + `AgentFactory` (create/promote/retire/reconfigure, eval gates).
- `auditCompany` `engine.ts:34` · `AgentFactory.create` `:85` · `promoteIfEarned` `:134`

### 2.11 Intelligence — `src/intel/engine.ts`
Graph-based `CompanyIntelligence`: `factsAbout`, `brief`, `learnCustomer`. Plug-point for Graphiti later.
- `brief` `engine.ts:54`

### 2.12 Meta Layer — `src/meta/engine.ts` (P1, PLAN 1c)
`MetaAgent`: gap detector (FAILED tasks with unfamiliar kinds + `Unknown tool:` traces), agent generator (LLM writes `AgentSpec` {name, role, prompt, tools, permissions, budget_usd, kpis, department_id} with deterministic fallback), registration flow (`spawn` → `AgentFactory` + budget + capability + memory + event), introspection (`whatCanIDo`), kill switch (`kill` → retire).
- `detectGaps` `engine.ts:80` · `generateSpec` `:119` · `spawn` `:157` · `spawnForGap` `:183` · `whatCanIDo` `:205`

### 2.12a Brain Layer — `src/brain/` (P1g, PLAN 1g)
LLM substrate every agent call funnels through. `router.ts` `ModelRouter` (C92 complexity routing cheap/standard/heavy) + `PromptCache` (C93 content-addressed cross-agent cache); `tune.ts` `TuneRegistry` (C94 versioned/A-B/rollback) + `FallbackChain` (multi-provider fallback); `window.ts` `ContextWindow` (token-budget fit/split); `index.ts` `BrainLayer` facade (fit→cache→router→fallback, `usage()`). Exposed as `runtime.brain` and injected into `Workforce`/`api.ts`.
- `ModelRouter` `router.ts:34` · `PromptCache` `router.ts:86` · `FallbackChain` `tune.ts:75` · `TuneRegistry` `tune.ts:22` · `ContextWindow` `window.ts:11` · `BrainLayer` `index.ts:24`

### 2.12b World Model — `src/world/engine.ts` (P4, PLAN 1a)
`WorldModel`: versioned fact store (`assert` supersedes on entity+attribute, keeps history), query interface (`whatIsTrueAbout`/`current`/`all`), external mirrors with checksum drift detection (`syncMirror`/`markDrift`/`reconcile`), snapshotting (C26) and time-travel (`asOf`). Tables `world_facts`/`world_mirrors` in `store.ts`. Exposed as `runtime.world` + `/world/*` API.
- `assert` `engine.ts:50` · `whatIsTrueAbout` `:108` · `syncMirror` `:124` · `reconcile` `:168` · `snapshot` `:196` · `asOf` `:212`

### 2.12c Message Bus — `src/bus/engine.ts` (P3, PLAN 1b)
`MessageBus`: typed agent-to-agent messaging (`CONTRACTS`: request/offer/delegate/dispute/clarify/report/escalate/confess) over the durable `messages` table + EventBus. `subscribe` routing (contract + private channel), `offer`/`acceptOffer`/`rejectOffer` negotiation, `confess` (private self-doubt), `log` replay. `capability_gap` request → meta-agent spawn wiring in runtime. Exposed as `runtime.messages` + `/messages` API.
- `subscribe` `engine.ts:38` · `send` `:58` · `offer` `:87` · `acceptOffer` `:96` · `confess` `:116` · `log` `:130`

### 2.12d Tool Synthesis + Canary — `src/meta/synthesizer.ts`, `src/meta/canary.ts` (P2, PLAN 1c)
`ToolSynthesizer` — P2: `synthesize` (LLM tool spec → ToolSpec), `sandboxTest` (compile in `node:vm` + run synthetic tests; only passing tools become `ToolDef`), `checksum`. `CanaryDeploy` — staged 5%→10%→50%→100% rollout (`promote`/`rollback`/`stop`, `isLive`, deterministic `shouldServe`). `CapabilityFactory.registerVersion`/`versions` for immutable capability versions. Exposed as `runtime.synthesizer`/`runtime.canary` + `/meta/tools/*`, `/meta/canary/*` API.
- `synthesize` `synthesizer.ts:56` · `sandboxTest` `:64` · `CanaryDeploy.start` `canary.ts:23` · `promote` `:31` · `shouldServe` `:75` · `CapabilityFactory.registerVersion` `factory.ts:92`

### 2.12e Immune System — `src/immune/engine.ts` (P1, PLAN 1d + C5)
`ImmuneSystem`: health monitoring per agent/tool (`agentHealth`/`toolHealth` over tasks+traces), failure classifier (`transient`/`config`/`logic`/`missing`/`external`), code-fix via ToolSynthesizer revalidation (`fixTool` self-resolves transient, escalates unfixable logic to a human once), test-runner (`validate` synthetic + historical replay in the sandbox), gradual promotion reusing CanaryDeploy, detailed audit log (`RepairLog`), human-notification gating (`humanWakeupsCount`), and C5 Adversary (`adversaryRun` red-teams tool surfaces → patch). Exposed as `runtime.immune` + `/immune/*` API.
- `agentHealth` `engine.ts:47` · `classify` `:80` · `fixTool` `:103` · `validate` `:164` · `beginPromotion` `:177` · `auditLog` `:186` · `adversaryRun` `:203`

### 2.12f Foraging Layer — `src/forage/engine.ts` (P1, PLAN 1f, C85-C90)
`ForageEngine`: C85 `scavenge` background daemon (source feeds → evaluate → file museum), C86 `onDemand` gap-triggered search (museum-first), C87 `evaluate` (code quality/tests/license/security/maintainer activity/fit → adopt≥0.7/hold/reject<0.4), C88 `forkAndIntegrate` (adapt schema → sandbox-test → `registerVersion` → canary), C89 `search`/`museum` queryable archive over the new `foraged` table, C90 `predictTrends` (star velocity, freshness, cross-community tags). Meta-Agent is forage-first: `spawnForGap` queries the museum before synthesizing. Exposed as `runtime.forage` + `/forage/*` API.
- `scavenge` `engine.ts:81` · `onDemand` `:105` · `evaluate` `:127` · `forkAndIntegrate` `:150` · `search` `:183` · `predictTrends` `:203`

### 2.12g Reality Interface — `src/reality/engine.ts` (P1, PLAN 1e)
`RealityInterface` + `buildRealityInterface`: every commercial channel (email, whatsapp, telegram, voice C17, calendar, payments, banking, signing, ecommerce, ads, contracts) is an `ExternalProvider` that `sync`s ground truth into the World Model mirror (`reality.<kind>` system + `status` fact), `ingest`s inbound, and `route`s outbound. Simulated providers run the full commercial cycle with zero credentials; real SDKs (Stripe, Twilio, DocuSign, Plaid, Cal.com…) swap in behind the `ExternalProvider` seam. `commercialCycleSteps` proves the entity operates every channel. Exposed as `runtime.reality` + `/reality/*` API.
- `syncAll` `engine.ts:96` · `ingest` `:106` · `route` `:118` · `buildRealityInterface` `:186` · `commercialCycleSteps` `:220`

### 2.12h Sovereign Layer — `src/sovereign/engine.ts` (P2, PLAN 2a, C29/C50)
`Sovereign` — the portfolio-level governor over every company in one store. Company factory (`spawnCompany` = `repos.createCompany` + org form + budgets + policies + default owner; repurposes `OrgEngine`/`ResourceEngine`/`PolicyEngine`), cross-company memory (`shareLesson`/`lessons` on `__global__`), per-company kill switch (`haltCompany`/`resumeCompany`/`isHalted`), global kill switch (`haltAll` + `kill_switch_log` table), per-action rollback registry (`registerRollback`/`applyRollback`/`rollbacks` over `rollback_actions`), C29 Deadman's Switch (`deadmanCheck` → read-only after 7-day owner silence; `heartbeat` restores), Sovereign digest (`digest`: daily owner report of tasks/spend/approvals/risks/events/halted), multi-layer approval routing (`routeApproval` auto/gated/human-only via `repos.createApproval`), C50 multi-owner model (`sovereign_owners` + `addOwner`/`owners`; full multi-person impl deferred to Phase 4k). Exposed as `runtime.sovereign` + `/sovereign/*` API. New schema: `sovereign_owners`, `kill_switch_log`, `rollback_actions`.
- `spawnCompany` `engine.ts:45` · `haltCompany` `:82` · `haltAll` `:107` · `registerRollback` `:119` · `deadmanCheck` `:153` · `digest` `:173` · `routeApproval` `:197` · `addOwner` `:215`

### 2.13 Runtime Composition — `src/runtime.ts`
`createRuntime` wires all subsystems + adapter seams (`PlutoAdapters`) + default bus wiring (task.failed → learning).
- `createRuntime` `runtime.ts:52` · `formOrganization` `:97` · `PlutoAdapters` `:18` · `meta` `:44`

### 2.14 Entrypoints
| File | What |
|---|---|
| `demo.ts` | End-to-end bootstrap demo (company → org → workday → approval → learn → verify → strategy → workgraph → policy → capability → intel) |
| `api.ts` | Express + SSE. ~55 REST endpoints across companies/snapshot/capabilities/strategy/workflow/policies/risks/messages/jobs/intel/projects/artifacts/objectives/tasks/events/approvals/resources/memory/decisions/learning/traces/agents + meta (introspect/spawn/kill) + brain (usage/tunes) + world (facts/mirrors/snapshot/asof). Static dashboard. |
| `operate.ts` | Continuous Operator daemon: drains QUEUED/PENDING tasks across companies, durable restarts |

### 2.15 Dashboard — `apps/dashboard/src/main.ts`
945-line SPA (Command Center). Renders company switcher, KPIs, org graph (SVG), objectives, approvals, and a 17-view panel (`renderView` main.ts:205; nav :754). `dist/app.js` is prebuilt via esbuild.

### 2.17 Tests — `test/` (25 files, 161 cases)
`budget`, `capability`, `driver`, `isolation`, `policy`, `strategy`, `workgraph`, `verify`, 
`governance`, `workforce`, `observability`, `fabric`, `loop`, `intel`, `learn`, `tools`, `meta`, `brain`, `world`, 
`bus`, `synthesizer`, `canary`, `immune`, `forage`, `reality`, `sovereign`, `phase1_gate`. `helpers.ts` isolates 
each runtime on a 
temp dir. Coverage: 
95.37% line 
/ 80.58% branch 
/ 90.19% funcs.

---

## 3. What is stubbed / placeholder

| Location | Gap |
|---|---|
| `src/verify/engine.ts:42` | Verifiers are heuristic placeholders (`output_exists`, `no_hallucination` string scan). No real-world verifiers (email landed, calendar booked, payment received). |
| `src/agents/llm.ts:60` | Mock driver ("works" deterministically but is fake intelligence). DeepSeek lane is the real one. Model Router exists but routes a single driver today. |
| Tool fabric | ✅ Runtime synthesis: `ToolSynthesizer` (node:vm) + `CapabilityFactory.registerVersion` + `CanaryDeploy`. Frozen list + synthesized tools. |
| Agent society | ✅ Typed agent messaging: `MessageBus` contracts (request/offer/delegate/dispute/clarify/report/escalate/confess) over the durable messages table + EventBus. |
| World model | ✅ `WorldModel` `src/world/engine.ts`: versioned facts, `whatIsTrueAbout`, mirrors/checksum drift, snapshot, asOf. |
| Meta-cognition | ✅ `MetaAgent` (gap detect → spawn → grow) + `capability_gap` bus wiring + forage-first museum policy. |
| Reality interface | ✅ `src/reality/engine.ts`: 11 commercial channels as `ExternalProvider`s mirroring into the world model; simulated (credential-free) + real-SDK swap-in seam. Prior `http.get`/`browser`/fs gateway retained. |
| `PlutoAdapters` in `runtime.ts:18` | `bus` seam typed `never | null` — the pattern exists only for graph/scheduler. |
| Sovereign layer | None (Phase 2). |
| Immune system | ✅ `src/immune/engine.ts` — health monitor + classifier + code-fix + test-runner + promotion + audit + human gating + C5 Adversary. `ExecutionFabric` still retries; immune system now self-heals/redeploys. |

---

## 4. What conforms to ARCHITECTURE.md already

- **Kernel Layer** — SQLite + event log + repos + domain model: ✅ `src/kernel/`
- **Event bus** as durable event store: ✅ `events/bus.ts`
- **Agent Runtime** (LLM + role + tools + memory): ✅ `agents/` + `workforce.ts`
- **Execution & Control** (durable execution, retry, sandboxed fs, verification, governance, budget, observability): mostly ✅ `work/`, `plane/`, `verify/`
- **Tool Fabric** (registry + runtime synthesis + versioning): ✅ `tools/`, `meta/synthesizer.ts`, `capability/factory.ts`
- **Reality Interface** (11 commercial channels + http/browser/fs gateway): ✅ `src/reality/engine.ts`
 - **Environmental note:** ARCHITECTURE.md diagrams assume `world/`, `bus/`, `meta/`, `immune/`, `sovereign/`, `brain/` - all landed (world, bus, meta, immune, brain, forage, reality, sovereign).

---

## 5. What needs refactoring (Phase 0)

Priority-ordered. Detailed in `PHASE_0_AUDIT.md`.

1. **`src/org/engines.ts:8-41`** — ✅ **DONE (Phase 0.2).** `BLUEPRINTS` extracted to `config/blueprints.json` (blueprints `services`/`saas`/`real_estate` + `default` key); `blueprintFor` selects from keyword tables with first-match-wins then catalog default. `BLUEPRINTS` export removed. Demo/test defaults neutralized to "professional services". Verified: real-estate mission → 4-dept `real_estate` org; default → 5-dept `services`.
2. **`src/demo.ts:7,11`** — ✅ **DONE (Phase 0.2).** Neutral default mission/company; env override preserved.
3. **`test/helpers.ts:11`** — ✅ **DONE (Phase 0.2).** Neutral default missions; 79 tests green.
4. **`src/org/workforce.ts:25` `TASK_SPECS`** — business/services-flavored task kinds. Acceptable → documented in DECISIONS.md; extend from config later if needed.
5. **`src/capability/factory.ts:19,94`** — `SELF_MAKE_ROLE_HINT` + seed catalog lean to client-services. Acceptable as seed → documented.
6. **`src/plane/resources.ts:25`** — hardcoded default budgets (`$100 llm` etc.). Acceptable defaults → documented; move to config when world model lands.
7. **Kernel schema** (`types.ts`, `store.ts`) — **already domain-neutral.** No change required; keep it that way (Phase 0.1 gate: grep clean).

**Conforms fully / keep as-is:** kernel layer, event bus, agent runtime, work graph, durable fabric, governance/policy/resources/observability plane, intelligence, dashboard.

---

## Phase 0 gate — status (2026-08-12)

| Gate | Status |
|---|---|
| 0.1 grep clean in `src/` + `test/` | ✅ (config is data, not code) |
| 0.2 refactor executed + demo/test neutral | ✅ |
| 0.3 coverage ≥70% | ✅ 92.14% line / 79.04% branch / 86.12% funcs (79 tests) via `npm run test:coverage` |
| 0.4 API surface documented | ✅ `docs/API_SURFACE.md` (40 endpoints + SSE) |
| `tsc --noEmit` | ✅ |
| `npm test` | ✅ 79/79 |

*Next: P1 Meta-Agent — the self-aware agent that owns mission, tools, budget, verification.*
