# PLUTO — Decision Log

> Append entries as you work. Read this before starting any task to see prior decisions.
> Referenced from `PLAN.md` Execution Guide.

## Format

```
### YYYY-MM-DD
TASK: [C# or P# or phase.x]
DECISION: [brief description]
FORAGED: [candidates evaluated, winner, license]
RATIONALE: [why chosen over alternatives]
IMPACT: [what this affects downstream]
```

### 2026-08-12
TASK: Phase 1d — Immune System (#11 Silent Competence) + C5 Adversary
DECISION: Built `src/immune/engine.ts` `ImmuneSystem`: health monitoring (agentHealth/toolHealth over tasks+traces), failure classifier (transient/config/logic/missing/external), code-fix via ToolSynthesizer revalidation, test-runner (synthetic + historical replay), gradual promotion reusing CanaryDeploy, audit log (RepairLog), human-notification gating, and C5 Adversary (`adversaryRun` red-teams tool surfaces). Wired `runtime.immune` + 10 API endpoints.
FORAGED: health-monitor libs (checkly/uptime/healthchecks) — reject, self-contained; reused in-repo ToolSynthesizer sandbox + CanaryDeploy instead of new deps.
RATIONALE: Self-healing must live beside the tools it fixes; reusing the node:vm sandbox and canary pipeline keeps zero new runtime deps and matches the "fix before humans notice" rule.
IMPACT: System now auto-detects, revalidates, and staggers-fix failures with a wake-a-human backstop; C5 red-team active. Next: 1f Foraging + 1e Reality Interface Fill.

### 2026-08-12
TASK: Phase 1f — Foraging Layer (C85-C90)
DECISION: Built `src/forage/engine.ts` `ForageEngine`: C85 scavenge daemon, C86 on-demand gap-triggered search, C87 evaluator (quality/tests/license/security/maintainer/fit → adopt/hold/reject), C88 fork→adapt→sandbox-test→register→canary-deploy pipeline, C89 queryable museum (new `foraged` table), C90 trend prediction. Meta-Agent is now forage-first: `spawnForGap` queries the museum and records "Forage-first: reused…" before synthesizing.
FORAGED: source crawlers (github-trending-api, huggingface-hub, npm-registry) — all map onto the same `ForageCandidate` shape; kept a single injectable feed seam rather than one adapter per API. No new runtime deps.
RATIONALE: The civilization consumes the open-source ecosystem; a uniform candidate shape + museum-first policy keeps P2 forage-first/synthesize-fallback with zero new deps and full test determinism.
IMPACT: Capability gaps now resolve from the museum before synthesis; forked tools version+canary like synthesized ones. Next: 1e Reality Interface Fill, then Phase 1 gate.

## Tags

- `DISCOVERED:` — new sub-task emerged during work
- `BLOCKED:` — cannot proceed, needs resolution
- `TRIED:` — approach attempted and abandoned (preserve the lesson)
- `ESCALATE:` — requires human owner input
- `REVERSED:` — previous decision reversed, note why

---

## Entries

### 2026-08-12
TASK: P1/P2 Meta Layer completion (PLAN 1c — sandbox, tool synthesizer, capability versioning, canary, milestone)
DECISION: Closed the P1 sandbox decision (PLAN L341-350): chose **`node:vm` isolated subprocess-style sandbox** over Docker (zero extra deps, fits ESM + no-build style, synchronous compile+run for synthetic tests). Built `src/meta/synthesizer.ts` `ToolSynthesizer` — P2 tool synthesis: `synthesize` parses an LLM tool spec (name/description/parameters/JS impl), `sandboxTest` compiles the tool in a `node:vm` context and runs synthetic tests (only passing tools materialize into a `ToolDef`), `checksum` for identity. Built `src/meta/canary.ts` `CanaryDeploy` — staged 5%→10%→50%→100% rollout with promote/rollback/stop, `isLive`, deterministic `shouldServe(seed)` bucket routing. Added `CapabilityFactory.registerVersion`/`versions` — immutable capability version rows. Wired into `PlutoRuntime.synthesizer`/`canary` + API (`/meta/tools/synthesize`, `/meta/tools/test`, `/meta/canary`, `/meta/canary/:id/promote|rollback|stop`).
FORAGED: `node:vm` vs Node web worker vs subprocess vs Docker — chose `node:vm` for the tool sandbox (fast, zero-dependency, fine for synthesized pure functions). Docker isolation deferred to real arbitrary-code agents in 1d (which still uses `node:vm` for tools + `AgentFactory` temp-dir runtimes for agents).
RATIONALE: PLAN 1c milestone = "system creates its own agents and tools when it hits gaps". Agents closed earlier (spawnForGap); this closes the tools half: LLM writes code → sandbox compiles+tests → pass ⇒ capability registered → canary rollout.
IMPACT: 17 new tests (test/synthesizer.test.ts 8, test/canary.test.ts 6, test/capability.test.ts 3). Suite now 132/132 pass, coverage 94.52% line / 80.61% branch. Self-extension loop complete: detectGaps → spawnForGap (agent) / synthesize+sandboxTest (tool).
TRIED: CanaryDeploy.promote initially required `length-1` promotes to go live; corrected to require full `length` (index semantics). `shouldServe` live-arm assertion fixed (was asserted before full rollout). Tool sandbox originally kept an unused vm.Context field — removed, compile uses `new vm.Script().runInNewContext({console})` per call.
ESCALATE: none.

### 2026-08-12
TASK: P3 Message Bus (PLAN 1b, all items)
DECISION: Built `src/bus/engine.ts` `MessageBus` — typed agent-to-agent messaging on top of the durable `messages` table + the existing `EventBus`. `CONTRACTS` union (request/offer/delegate/dispute/clarify/report/escalate/confess). `subscribe({contract?, channel?})` + `send()` for routing (agent/department addresses + channel compartmentalization); every send emits `msg.<contract>` event and delivers in-process. Negotiation reference: `offer` → `acceptOffer` (report accepted + issue `delegate`) / `rejectOffer` (report rejected + reason). `confess()` private self-doubt on `__confessional` channel. `log(companyId, {contract?, channel?, limit?})` persistent replay. Wired into `PlutoRuntime.messages`; default wiring subscribes a `capability_gap` request and routes it to the meta-agent's `spawnForGap` (P3 "capability_gap broadcast triggers meta-agent response"). API: `/messages` (typed send + log filter), `/messages/offer`, `/messages/confess`.
FORAGED: Layered typed bus over the existing durable messages table + EventBus vs building a new bus from scratch — reused the persisted log so negotiation/confessions are replayable and survive restarts, matching PLAN "persistent message log".
RATIONALE: PLAN 1b milestone = agents communicate via typed protocols; the existing table already gave persistence, so the bus adds typing, routing, negotiation, compartments, and the confessional without a second store.
IMPACT: 8 new tests (test/bus.test.ts) incl. two-agent negotiation end-to-end and capability-gap→spawn wiring. Suite now 116/116 pass, coverage 94.27% line / 80.39% branch.
TRIED: `acceptOffer`/`rejectOffer` initially spread the offer payload AFTER the explicit `status` field, so the offer's `status:'pending'` overwrote `accepted`/`rejected`. Fixed by spreading the payload first, then the explicit status. Also tried adding a `channel()` method to `Message` via module augmentation — invasive; replaced with a `channelOf(payload)` helper reading `__channel`.
ESCALATE: none.

### 2026-08-12
TASK: P4 World Model (PLAN 1a, all items)
DECISION: Built `src/world/engine.ts` `WorldModel` — the grounded "what is true about X?" substrate. Added `world_facts` (entity/attribute/value, kind, source, confidence, ts, version, active) and `world_mirrors` (system/entity/payload/checksum/drift) tables to `src/kernel/store.ts`. Engine: `assert` (version-supersedes on entity+attribute, keeps history), `forget`, `current`/`all`/`whatIsTrueAbout` (P4 query), `syncMirror`/`markDrift`/`reconcile` (checksum drift detection + self-heal hook), `snapshot` (C26, via `world_snapshot` mirror), `asOf(companyId, T)` time-travel. Provider-agnostic (survives brain-layer provider swaps per C23). Exposed as `runtime.world` + API routes (`GET/POST /world/facts`, `GET/POST /world/mirrors`, `GET /world/mirrors/reconcile`, `GET /world/snapshot`, `GET /world/asof?t=`).
FORAGED: Dedicated `WorldModel` reading `Store.db` directly vs extending `Repos` — chose a focused class over bloating the generic repos layer; world rows have their own timestamps/versioning semantics distinct from graph/memory.
RATIONALE: PLAN 1a milestone = grounded state query; time-travel required versioned immutable fact rows (not in-place updates), which dictated the `assert`-supersedes design.
IMPACT: 9 new tests (test/world.test.ts). Suite now 108/108 pass, coverage 93.58% line / 80.02% branch. External mirrors (inbox/calendar/bank/CRM) are real integration surfaces filled in Phase 1e; reconciliation detects drift now.
TRIED: `reconcile` originally re-checksummed stored payloads and cleared drift automatically — drifted mirrors couldn't be reported because the payload checksum never changed. Fixed: drift is a first-class flag set by `markDrift`/payload-change and `reconcile` reports (doesn't silently clear) it.
ESCALATE: none.

### 2026-08-12
TASK: P1g Brain Layer (PLAN 1g, all six items)
DECISION: Built `src/brain/` — the composable LLM substrate every agent call funnels through. `router.ts` `ModelRouter` (C92: complexity → cheap/standard/heavy tier, per-tier usage) + `PromptCache` (C93: content-addressed cross-agent prompt cache, first-call provider hits, repeats served from memory). `tune.ts` `TuneRegistry` (C94: versioned per-company/task model management, A/B via fraction, rollback) + `FallbackChain` (multi-provider fallback). `window.ts` `ContextWindow` (token-budget fit, keeps system msgs, drops/summarizes oldest; splitForInput). `index.ts` `BrainLayer` facade = fit → cache → router → fallback, all `LlmDriver`, exposing `usage()`. Wired: `PlutoRuntime.brain` injected into `Workforce` + `api.ts` (new `/api/brain/usage` + tune CRUD/rollback); `Workforce` constructor now takes an injectable `driver` defaulting to `makeDriver()` so existing callers/tests are untouched.
FORAGED: Router/cache/registry/window as separate `LlmDriver`-conforming classes + a facade, vs one monolithic Brain class — chose composition so each primitive is independently testable and reusable.
RATIONALE: PLAN 1g milestone = "all LLM calls go through router; swap providers without touching agent code". Modeling every piece as an `LlmDriver` lets the facade wrap them and lets `AgentLoop`/`Workforce` consume the brain behind the existing interface — no agent code changes.
IMPACT: 11 new tests (test/brain.test.ts). Suite now 99/99 pass, coverage 93.24% line / 79.35% branch. Multi-provider fallback and provider-swap-without-agent-code milestone satisfied. Workforce `makeDriver()` default preserved → Phase 0/1 suites green unchanged.
TRIED: Making the fine-tune registry auto-wire the current company/task inside `complete()` — impossible because the `LlmDriver` interface carries no company/task context, so the registry stays an explicit per-call service (`runtime.brain.registry`) instead. Kept the cleaner composition.
ESCALATE: none.

### 2026-08-12
TASK: P1 Meta-Agent (PLAN 1c, agent part)
DECISION: Built `src/meta/engine.ts` `MetaAgent` — gap detector (`detectGaps`: FAILED tasks with unfamiliar kinds + `Unknown tool:` traces, deduped against covered agents/capabilities), agent generator (`generateSpec`: LLM returns a JSON agent spec {name, role, prompt, tools, permissions, budget_usd, kpis, department_id}, deterministic default fallback), registration flow (`spawn`: createForCapability → set budget → registerCapability → remember + emit), introspection (`whatCanIDo`: capabilities, agents, tools, gaps, budgets) and kill switch (`kill`: retire + memory + event). Wired into `PlutoRuntime.meta` and 3 new API routes: `GET /meta/introspect`, `POST /meta/spawn`, `POST /meta/agents/:id/kill`.
FORAGED: Sandbox tester + tool synthesizer deferred (they are the P1 open decision at PLAN.md L341-350: Docker vs Node worker vs subprocess); not needed for the agent half of P1. Used existing `AgentFactory` for isolated temp-dir creation rather than a new sandbox runtime.
RATIONALE: P1 = system creates its own agents when it hits capability gaps. Spawned entities are normal agents (versioned spec, budget, KPI, seeded memory, registered capability) — no special casing, so existing Workforce/loop/verifier machinery applies unchanged.
IMPACT: 9 new tests (test/meta.test.ts) incl. end-to-end "spawned agent completes a real task without human" (SUCCEEDED + traces). Suite now 88/88 pass, coverage 92.58% line / 78.75% branch / 86.9% funcs. PLAN 1c items ticked except sandbox tester, tool synthesizer, canary deployment, milestone.
TRIED: Falling back to the runtime MockV4Flash driver for spec generation — it does not emit JSON, so `parseSpec` falls back to `defaultSpec`; tests use an explicit SpecDriver for the LLM lane.
ESCALATE: none.

### 2026-08-12
TASK: Phase 0.4/0.5
DECISION: API surface documented in `docs/API_SURFACE.md` (40 endpoints + SSE + static dashboard, grouped by subsystem with body schemas). Phase 0 gate declared complete in `CODEBASE_MAP.md`: grep clean, refactor done, 92% coverage, docs current. Deferred open item: no API auth — local control plane only; add admin token before public exposure (P1+).
FORAGED: (documentation only)
RATIONALE: PLAN.md Phase 0 = stabilize + audit; API reference was the last undocumented surface.
IMPACT: Phase 1 begins with a known, versioned baseline. Dashboard/API contract frozen for P1-P5.
ESCALATE: none.

### 2026-08-12
TASK: Phase 0.3
DECISION: Coverage gate passed. Added `npm run test:coverage` (`node --experimental-test-coverage --test test/*.test.ts`). Baseline was 71% line / 61% funcs with seven modules untested (verify, governance, workforce, observability, work/fabric, agents/loop, intel, learn, tools). Added 9 new test files → 79 tests. Coverage now 92.14% line / 79.04% branch / 86.12% funcs (70% gate comfortably met).
FORAGED: Native `node:test` coverage flag vs `c8`/`vitest` — chose native, zero deps, matches existing harness.
RATIONALE: TDD-driven test authoring surfaced a real bug: `Workforce.run` no-agent branch saved a stale `QUEUED` snapshot after `Observability.taskSucceeded` had already persisted `SUCCEEDED`, silently reverting the status. Fixed by reloading the task before the final write.
IMPACT: Guardrail for every later phase (P1–P5 must stay ≥70%). New files: `test/verify`, `test/governance`, `test/workforce`, `test/observability`, `test/fabric`, `test/loop`, `test/intel`, `test/learn`, `test/tools`.
TRIED: (n/a)

### 2026-08-12
TASK: Phase 0.2
DECISION: Domain assumptions extracted from primitives. `BLUEPRINTS` moved from `src/org/engines.ts` into data-driven `config/blueprints.json` (blueprints `services`/`saas`/`real_estate` + `default` key). `OrgEngine.blueprintFor` now selects via JSON keyword tables with first-match-wins then catalog default; `BLUEPRINTS` export removed. Demo and test-harness default missions/company names neutralized to "professional services" (no web-agency language).
FORAGED: Config-as-data (JSON + runtime read via `readFileSync`/`import.meta.url`) vs TS module export vs JSON import assertion — chose runtime read because Node's native type-stripping (no loader) does not support JSON import assertions; keeps ESM + no build step.
RATIONALE: New domains (real estate, education, healthcare...) are added by editing a data file, never `src/`. Default blueprint `services` is a pure fallback (empty keywords) so specific blueprints like `real_estate` are never shadowed by generic keywords (e.g. `lead`, `app`). Saas keywords tightened (`app`→`mobile app`, dropped `product`) to avoid substring false-matches.
IMPACT: Any mission can now shape a different org without code changes. Existing tests + demo unaffected (default shape identical: 5-department services). Real-estate mission verified → 4-department `real_estate` org.
TRIED: Generic default carried keywords (`website|agency|client|service|lead`) — `lead` shadowed `real_estate` (`Qualify 50 real estate leads...` matched services first). Fix: default blueprint has no keywords.
REVERSED: (n/a)

### 2026-08-12
TASK: Phase 0.1
DECISION: Baseline audit captured. Produced `docs/CODEBASE_MAP.md` (file-by-file map, stubs, conformance notes, refactor list) and `docs/PHASE_0_AUDIT.md` (domain-leak grep results, refactor list R1–R4). Verified baseline: `tsc --noEmit` clean, `node --test` 24/24 pass.
FORAGED: (documentation only)
RATIONALE: PLAN.md requires understanding before changes; audit pins the starting gate for the primitive work.
IMPACT: R3 items (kept as-is, doc-only) — `TASK_SPECS` in `src/org/workforce.ts`, capability seed catalog in `src/capability/factory.ts`, default budgets in `src/plane/resources.ts` — deferred; they are tool catalogs, not domain shape. `node:sqlite` experimental warning accepted.

