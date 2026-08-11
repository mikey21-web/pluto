# PLUTO Codebase Map

## Exploration Summary (Hour 2)

### What Exists ( conforming to ARCHITECTURE.md layers)

**Kernel Layer** (`pluto/src/kernel/`)
- `index.ts` — module entry, 185 lines
- `store.ts` — SQLite persistence, 7523 lines — 15 entity types, 50+ repo methods, event bus
- `state.ts` — domain state, 2388 lines
- `types.ts` — shared type definitions, 8827 lines
- **Conforms to**: KERNEL LAYER (diagram in ARCHITECTURE.md)

**Agent Runtime** (`pluto/src/agents/`)
- `llm.ts` — LLM runtime (DeepSeek V4 Flash), 6042 lines — bounded steps, tool filtering, mock driver
- `loop.ts` — agent loop, 3986 lines — core execution loop
- **Conforms to**: AGENT SOCIETY LAYER (message passing, tool use)

**Tool Fabric** (`pluto/src/tools/`)
- `fabric.ts` — MCP-style tool adapters (fs, http, browser, memory, graph), 6335 lines
- **Conforms to**: TOOL FABRIC LAYER (registry + runtime)

**Control Plane** (`pluto/src/plane/`)
- `governance.ts` — governance, policy, budgets, approvals, 3260 lines
- `policy.ts` — policy engine, 3358 lines
- `observability.ts` — observability, 2864 lines
- `resources.ts` — resource management, 2936 lines
- **Conforms to**: GOVERNANCE LAYER (diagram in ARCHITECTURE.md)

**API + Dashboard** (`pluto/src/api.ts`, `pluto/apps/dashboard/`)
- 40+ endpoints, SSE, 17-view SPA
- **Conforms to**: REALITY INTERFACE LAYER (partial — technical only per VISION.md)

**Work Graph** (`pluto/src/work/`)
- DAG scheduling, Kahn sort, cycle detection
- **Conforms to**: EXECUTION & CONTROL LAYER

**Strategy Engine** (`pluto/src/strategy/`)
- argmax, experiments
- **Conforms to**: STRATEGY ENGINE LAYER

### What Is Stubbed / Missing (per VISION.md ⚠️)

From VISION.md Part 7 "The 5 Missing Primitives" and Part 8 "What's Needed":

| Stubbed/Missing | Status | Location |
|---|---|---|
| **World Model** — queryable state of reality (customers, deals, cash, promises, calendar, external mirrors) | ❌ Missing | Not in codebase |
| **Message Bus** — typed agent-to-agent protocols (`request | offer | delegate | dispute | clarify | report | escalate | confess`) | ❌ Missing | Not in codebase |
| **Meta Layer** — gap detector, agent generator, tool scheduler, sandbox tester, canary deployment | ❌ Missing | Not in codebase |
| **Immune System** — health monitoring, failure classifier, code-fix agent, test runner, gradual promotion, audit log, adversary | ❌ Missing | `pluto/src/immune/` dir exists but likely incomplete |
| **Sovereign Layer** — company factory, cross-company memory, kill switches, deadman's switch | ❌ Missing | Not in codebase |
| **Real Verifiers** | ⚠️ Placeholders only | `pluto/src/verify/` |
| **Capability Marketplace / Synthesis** | ❌ Missing | Not in codebase |
| **Fine-grained RBAC** | ❌ Missing | Not in codebase |
| **Distributed Execution** | ❌ Missing | Not in codebase |
| **Learning that auto-applies** | ❌ Missing | `pluto/src/learn/` may exist but auto-apply not implemented |
| **World Model / Event → State Projection** | ❌ Missing | Event log only per VISION.md line 215 |
| **Sovereign / Company Factory** | ❌ Missing | Not in codebase |
| **Immune System full implementation** | ⚠️ Partial | Directory exists |

### Domain-Specific Assumptions (Real Estate Leakage)

**Grep results for domain-specific patterns** (Phase 0.1 audit — see `PHASE_0_AUDIT.md`):
- Real estate / Hyderabad / beeecho references in source
- Entity-specific hardcoding that needs extraction to data-driven primitives

### Architecture Layer Conformance

```
KERNEL LAYER          ✅ Built (kernel/, types, store)
AGENT RUNTIME         ✅ Built (agents/llm.ts, loop.ts)
TOOL FABRIC           ✅ Built (tools/fabric.governance)
GOVERNANCE            ✅ Mostly built (plane/governance.ts, policy.ts)
WORK GRAPH            ✅ Built (DAG, Kahn sort)
STRATEGY ENGINE       ✅ Built (argmax, experiments)
API + DASHBOARD       ⚠️ Technical only (VISION.md line 748)
REALITY INTERFACE     ❌ Missing (parallel track Phase 1e)
MESSAGE BUS           ❌ Missing (Phase 1b)
META LAYER            ❌ Missing (Phase 1c)
IMMUNE SYSTEM         ❌ Missing (Phase 1d)
SOVEREIGN LAYER       ❌ Missing (Phase 2)
WORLD MODEL           ❌ Missing (Phase 1a foundation)
```

### Staged Discovery

Key files read during exploration:
- `pluto/VISION.md` — 1129 lines, vision source of truth, v1.0 locked
- `pluto/ARCHITECTURE.md` — 46773 lines, 12 diagrams (master + 11 zoom-ins)
- `pluto/PLAN.md` — 59771 lines, Phase 0–5 build plan with checkboxes
- `pluto/DECISIONS.md` — 29799 lines, prior decisions log
- `pluto/package.json` — 806 lines, dependencies (node >=22, express, esbuild, playwright, typescript)
- `pluto/README.md` — 63 lines, run instructions, design rules

### Coding Standards (per PLAN.md §4)

- Test-driven: interface test first, implementation second, refactor third
- Every commit passes tests (≥70% coverage on new code)
- Definition of done: interface contract implemented, tests passing, integration proven end-to-end, documented in code
- Update PLAN.md and DECISIONS.md as you work: [ ] → [x], OUTCOME: line, DECISIONS.md entry for non-obvious choices
- Forge first: search GitHub, HuggingFace, npm, PyPI, arxiv, Product Hunt, HN before writing from scratch
- Cost discipline: ₹500/day LLM budget (Phase 1), alert at 80%, auto-halt at 100%
- Prompt caching: not optional — 5-10x cost reduction

### Open Decisions (from PLAN.md §5, to be logged in DECISIONS.md)

1. First mission — real estate lead qualifier (Entity #1) vs generic substrate
2. Reality boundary — reversible → autonomous, irreversible → gated
3. Money layer — real from day one vs simulated economy first
4. Learning surface — what auto-applies vs propose-only vs forbidden
5. Kill switch — three layers + rollback + deadman + audit

---

**Map produced:** `pluto/docs/CODEBASE_MAP.md`
**Next:** Phase 0.1 audit → `pluto/docs/PHASE_0_AUDIT.md` → refactor → Phase 0 gate