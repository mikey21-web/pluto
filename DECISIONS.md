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

## Tags

- `DISCOVERED:` — new sub-task emerged during work
- `BLOCKED:` — cannot proceed, needs resolution
- `TRIED:` — approach attempted and abandoned (preserve the lesson)
- `ESCALATE:` — requires human owner input
- `REVERSED:` — previous decision reversed, note why

---

## Entries

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

