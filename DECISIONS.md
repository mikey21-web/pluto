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

