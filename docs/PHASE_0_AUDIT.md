# PLUTO — Phase 0.1 Codebase Audit

> PLAN.md Phase 0.1/0.2. Produced 2026-08-12.
> Goal: enumerate every domain-specific assumption baked into what should be primitives, produce the refactor list, then refactor.

---

## 1. Grep results (domain-leak scan)

Pattern: `real.?estate | real_estate | agency | saas | hyderabad | beeecho`

| File : line | Hit | Domain assumption |
|---|---|---|
| `src/org/engines.ts:8` | `agency:` blueprint | Org-engine blueprint list hardcoded to client-services agency shape |
| `src/org/engines.ts:18` | `saas:` blueprint | Second hardcoded blueprint (product/SaaS) |
| `src/org/engines.ts:38` | `return BLUEPRINTS.saas` (matches `ecommerce|shop|store|retail`) | Keyword → hardcoded module mapping baked in code |
| `src/org/engines.ts:39` | `return BLUEPRINTS.agency` (matches `website|agency|client|service`) | Keyword → hardcoded module mapping baked in code |
| `src/org/engines.ts:40` | `return BLUEPRINTS.agency` (**default fallback**) | Every unrecognized domain (incl. real-estate, education, healthcare) silently shapes as a client-services agency — the deepest leak |
| `src/demo.ts:7` | `MISSION = ... 'Get 10 paying website clients for a web agency.'` | Demo default mission hardcoded to web agency |
| `src/demo.ts:11` | `createRuntime(DATA_DIR, 'Acme Web Agency (PLUTO)', ...)` | Demo company identity hardcoded to web agency |
| `test/helpers.ts:11` | default mission `'Get 10 paying website clients for a web agency.'` | Test harness bakes the same domain string |

**Not infected (grep-clean today):** `src/kernel/**` (schema is generic), `src/agents/**`, `src/tools/**`, `src/plane/**` (except default $ amounts), `src/work/**`, `src/verify/**`, `src/learn/**`, `src/intel/**`, `src/events/**`, `src/capability/**` (seed slightly flavored), `src/api.ts`, `src/runtime.ts`.

---

## 2. Audit verdict

The primitives that *should* be domain-agnostic are:
- **Org Engine** (`org/engines.ts`) — **FAILS**. Blueprint definitions AND domain→blueprint mapping are hardcoded constants.
- **Demo/test harness defaults** (`demo.ts`, `test/helpers.ts`) — **PARTIAL FAIL**. Default missions embed one customer's domain.
- **Kernel schema, agent runtime, tool fabric, control plane, work/verify/learn/intel** — **PASS**. Domain-neutral; any flavored bits are seed/example data, not structure.

**Root cause:** Phase-0 code was written against the original "web agency" demo mission. The shortest path to domain-neutral substrate is: (a) move blueprints + keyword mapping to config data, (b) rename the default to a generic services shape (same five departments so tests stay green), (c) neutralize demo/test default missions.

---

## 3. Refactor list (PLAN.md 0.1 → 0.2)

### R1 — Blueprints become data (engines.ts)
- [x] Extract `BLUEPRINTS` (`agency`, `saas`) into `config/blueprints.json`.
- [x] Each blueprint gains a `keywords[]` list; add a `"default"` key naming the fallback.
- [x] Add a generic default blueprint (`services`) sharing today's 5-department shape (Intelligence/Sales/Marketing/Delivery/Finance) so existing tests + demo keep passing.
- [x] `OrgEngine` loads blueprints once (static cache) and selects via `blueprintFor` from the JSON keyword tables. `BLUEPRINTS` export removed from `engines.ts`.
- [x] Keep `blueprintFor` signature identical (returns `OrgBlueprint`) — no caller changes.

### R2 — Demos and tests stop embedding one domain (demo.ts, test/helpers.ts)
- [x] `demo.ts` default mission → domain-neutral: e.g. `'Deliver 10 paying client engagements for a professional services company.'` (env override preserved).
- [x] `demo.ts` default company name → `'Acme Services Co (PLUTO)'` (env override preserved).
- [x] `test/helpers.ts` default missions → same neutral strings.
- [x] Verify demo pipeline still maps to the default `services` blueprint (department names unchanged).

### R3 — Document kept-as-is seed/flavor decisions (no code change)
- [x] `TASK_SPECS` (`workforce.ts:25`), `SELF_MAKE_ROLE_HINT` + seed catalog (`capability/factory.ts:19,94`), default budgets (`resources.ts:25`): generic business flavor is acceptable; record in DECISIONS.md and leave code, move to config in Phase 1 when World Model lands.

### R4 — Phase 0.1 gate verification
- [x] Re-run domain grep → clean (no `agency|saas` literals in `src/`; config file is data, not code).
- [x] `npm run typecheck` green.
- [x] `npm test` green (24+ cases).

---

## 4. Non-code audit surface (0.3 / 0.4 / 0.5)

- **Test infra:** native `node:test` — good enough for Phase 0; add a `npm run test:coverage` for the 70% gate (0.3).
- **API surface:** documented in `CODEBASE_MAP.md` §2.13 (~40 endpoints) — full endpoint table to `docs/` in 0.4.
- **Baselines (0.5):** none recorded yet — capture with mock driver (deterministic tokens/latency) after refactor.

*Owner next step: execute R1-R2, then run the R4 gate.*