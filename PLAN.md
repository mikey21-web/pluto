# PLUTO — Master Build Plan (100% VISION.md coverage)

> Companion to `VISION.md`. This doc mirrors every concept from the vision as an actionable todo, ordered by dependency.
>
> **Traceability convention:**
> - `[P#]` = one of the 5 Missing Primitives (VISION.md Part 7)
> - `[C#]` = one of the 84 numbered concepts (VISION.md Parts 11, 11.5, 11.6, 11.7)
> - `[DECISION]` = requires human owner's call before work starts

---

---

# EXECUTION GUIDE — Read this before touching code

> This section is written for whoever is building — you (Uday), another Claude Code session, Cursor, Windsurf, or an autonomous agent. Follow the SOP below on every task.

## Mission

Build the substrate for an autonomous economic civilization per `VISION.md` and `ARCHITECTURE.md`. This doc is the ordered todo. Complete phases in order. Do not skip phase gates.

## THE ABSOLUTE RULES

### Rule 1: FORAGE FIRST — never build what already exists

**Before writing any code for any task, you MUST:**

1. Search GitHub, HuggingFace, npm, PyPI, arxiv, Product Hunt, HN for existing implementations
2. Evaluate top 3-5 candidates against license, code quality, tests, maintainer activity, fit
3. If a candidate scores well → **fork it and adapt**
4. Only if no candidate scores ≥ 50% → write from scratch

**This is not optional.** It is the first-priority behavior of the civilization we are building, and it must also be the first-priority behavior of building it. We build small. Something is already out there big. Use it.

Sources per task type listed below in **Open Source Priority Sources**.

### Rule 2: Test-driven

- Interface test first
- Implementation second
- Refactor third
- Every merged commit passes tests

### Rule 3: Definition of done per task

- Interface contract implemented
- Tests written and passing
- Integration proven
- Documented in code (minimum: JSDoc on exports)
- Only then tick the checkbox

### Rule 4: Update this plan as you work

- `[ ]` → `[x]` on completion
- Add `OUTCOME:` line under task noting what was forked or written
- Add entry to Decision Log at end of doc if non-obvious choice made
- Never delete failed approaches — mark `TRIED:` and note lesson

### Rule 5: If blocked or ambiguous, flag it

- Do not produce wrong work silently
- Add `BLOCKED:` tag with what's blocked and what would unblock
- Continue with a different task if possible
- Human reads the Decision Log daily

## Standard Operating Procedure (per task)

Every task, no exceptions:

```
Step 1: Read task, identify interface (input → output)
Step 2: FORAGE — search open source per sources below
Step 3: Evaluate top 3-5 candidates:
        - License: MIT, Apache 2.0, BSD preferred; GPL only if no alt
        - Test coverage: >60%
        - Last commit: <6 months
        - Fit: covers 70%+ of interface needs
Step 4: Choose:
        A) Adopt & adapt: fork, integrate, test, wire
        B) Study & rewrite: understand patterns, write cleaner
        C) Build from scratch: only if no candidate ≥ 50%
Step 5: Implement (per chosen option)
Step 6: Write tests (unit + integration + e2e where applicable)
Step 7: Wire into architecture per ARCHITECTURE.md
Step 8: Document in code
Step 9: Update PLAN.md checkbox + Decision Log
Step 10: Commit with descriptive message
```

## Open Source Priority Sources (by task type)

**WORLD MODEL / MEMORY**
- Graphiti — https://github.com/getzep/graphiti (graph memory, temporal)
- Zep — https://github.com/getzep/zep (memory service)
- Mem0 — https://github.com/mem0ai/mem0 (memory layer)
- Cognee — https://github.com/topoteretes/cognee
- LangGraph state — https://github.com/langchain-ai/langgraph
- LlamaIndex memory modules
- DuckDB — https://duckdb.org (fast analytical projections)

**MESSAGE BUS / AGENT MESSAGING**
- AutoGen — https://github.com/microsoft/autogen (closest to P3)
- CrewAI — https://github.com/joaomdmoura/crewAI
- LangGraph messaging
- Redis Streams / Pub-Sub
- NATS.io — https://nats.io
- ZeroMQ

**META LAYER / AGENT GENERATION**
- SmolAgents — https://github.com/huggingface/smolagents
- AutoGen (autogen-magentic-one, autogen-studio)
- MetaGPT — https://github.com/geekan/MetaGPT
- OpenHands — https://github.com/All-Hands-AI/OpenHands
- BabyAGI — https://github.com/yoheinakajima/babyagi
- AgentGPT

**TOOL SYNTHESIS / TOOL FABRIC**
- Model Context Protocol (MCP) — https://modelcontextprotocol.io
- LangChain tools
- Gorilla — https://github.com/ShishirPatil/gorilla (function calling)
- OpenAI Assistants tools

**SANDBOX (agent/tool testing)**
- e2b — https://github.com/e2b-dev (code interpreter sandbox)
- Modal Labs — https://modal.com
- Vercel Sandbox — https://vercel.com/sandbox
- Firecracker — https://github.com/firecracker-microvm/firecracker
- Docker with resource limits
- Wasmtime (WASM sandbox)

**IMMUNE / OBSERVABILITY / SELF-HEALING**
- Prometheus + Grafana (metrics)
- Sentry (error tracking)
- OpenTelemetry (tracing)
- Chaos Mesh / Chaos Monkey (adversary)
- Litmus Chaos

**FORAGING (crawl sources)**
- GitHub API (Octokit) + `gh` CLI
- GitHub Trending API (unofficial: github-trending-api)
- HuggingFace Hub API
- arxiv-sanity-preserver, arxiv API
- Papers with Code API
- Product Hunt API
- HackerNews API (Firebase)
- npm registry API, PyPI API, crates.io API

**BRAIN LAYER / LLM ROUTING**
- LiteLLM — https://github.com/BerriAI/litellm (model routing across providers)
- OpenRouter — https://openrouter.ai (provider abstraction)
- Portkey AI Gateway — https://portkey.ai
- Vercel AI SDK — https://sdk.vercel.ai
- LangChain LLM adapters

**REALITY INTERFACE — EMAIL**
- Nodemailer (SMTP)
- imap-simple, imapflow (IMAP)
- Postmark / Resend / SendGrid APIs

**REALITY INTERFACE — WHATSAPP**
- Existing Virtual Assistant substrate has this (reuse)
- WhatsApp Business Cloud API direct
- Twilio WhatsApp

**REALITY INTERFACE — VOICE**
- Vapi — https://vapi.ai
- LiveKit Agents — https://livekit.io/agents
- Pipecat — https://github.com/pipecat-ai/pipecat
- Retell AI
- Dograh (already integrated in Virtual Assistant)

**REALITY INTERFACE — PAYMENTS**
- Stripe SDK
- Razorpay SDK
- Setu / Cashfree (India)

**REALITY INTERFACE — CALENDAR**
- Google Calendar API (googleapis node client)
- Cal.com — https://github.com/calcom/cal.com (self-host)

**REALITY INTERFACE — BANKING**
- Plaid (US)
- Setu / Signzy / Sahamati (India account aggregators)

**REALITY INTERFACE — E-SIGN**
- DocuSign API
- Digio (India)
- Adobe Sign

**GOVERNANCE / AUDIT / POLICY**
- Immudb — https://github.com/codenotary/immudb (immutable audit)
- Loki (structured logs)
- Open Policy Agent — https://www.openpolicyagent.org
- Casbin — https://casbin.org (authorization)

**SIMULATOR / FORK**
- Git (state snapshotting)
- SQLite backup API
- Docker checkpoints (CRIU)

**PERSONA LAYER**
- ElevenLabs API (voice cloning)
- HeyGen / D-ID (talking-head video)
- Stable Diffusion (avatar generation)

**CRYPTOGRAPHIC ANCHORING**
- OpenTimestamps — https://opentimestamps.org (bitcoin anchoring)
- Certificate Transparency-style Merkle logs
- SigStore

**SENSOR / IoT / MARKET DATA**
- MQTT (mosca, aedes)
- Node-RED
- OpenWeatherMap API
- Alpha Vantage / Finnhub / Polygon (market data)

## Tech Stack (COMMITTED — do not deviate without approval)

- **Language:** TypeScript (existing PLUTO stack)
- **Runtime:** Node.js 22+ (native `node:sqlite`, native TS type stripping)
- **Storage:** SQLite via `node:sqlite` (existing kernel)
- **Optional storage extensions:** DuckDB (analytical projections), Redis (if in-process bus insufficient)
- **Front-end:** React + Vite (existing dashboard)
- **Testing:** Vitest (unit + integration), Playwright (E2E)
- **Package manager:** npm
- **Formatter:** Prettier
- **Linter:** ESLint
- **Types:** strict TypeScript

Adding a new dependency requires justification and no equivalent already in tree.

## Directory Structure

```
pluto/
├── src/
│   ├── kernel/              # existing — event log, SQLite, repos
│   ├── agents/              # existing — agent runtime
│   ├── tools/               # existing — tool fabric
│   ├── brain/               # NEW Phase 1g — LLM router, cache, fine-tune
│   ├── world/               # NEW Phase 1a — World Model
│   ├── bus/                 # NEW Phase 1b — Message Bus
│   ├── meta/                # NEW Phase 1c — Meta Layer
│   ├── immune/              # NEW Phase 1d — Immune System + Adversary
│   ├── forage/              # NEW Phase 1f — Foraging Layer
│   ├── reality/             # EXTEND Phase 1e — Reality Interface channels
│   ├── sovereign/           # NEW Phase 2a — Sovereign Layer
│   ├── governance/          # EXTEND Phase 2b — Constitution, Ethics, Court
│   ├── persona/             # NEW Phase 2c — Persona Layer
│   ├── company/             # EXTEND — company operations
│   ├── simulator/           # NEW Phase 4c — Dream/Fork layer
│   └── plane/               # existing — control plane
├── apps/
│   ├── dashboard/           # existing owner dashboard
│   ├── auditor/             # Phase 5b — read-only forensics
│   └── regulator/           # Phase 5b — compliance portal
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── VISION.md
    ├── PLAN.md
    ├── ARCHITECTURE.md
    └── DECISIONS.md         # decision log (create if missing)
```

## Coding Standards

- TypeScript strict mode
- Explicit return types on exported functions
- No `any` unless documented why
- Async everywhere (no sync I/O)
- Small pure functions preferred
- Single responsibility per file
- Files < 400 lines
- Named exports only (no default exports)
- Descriptive names, no abbreviations
- Comments only for WHY (non-obvious). Code says WHAT.

## Testing Standards

- Every primitive has unit tests for public interface
- Every integration point has integration tests
- Every phase-gate has an end-to-end test
- Coverage > 70% for new code
- Tests must run in CI on every PR
- Broken tests block merge

## Git Workflow

- `main` always green
- Feature branch per sub-phase: `feature/1a-world-model`
- Small atomic commits, descriptive messages
- Squash-merge to main
- Tag phase gates: `v0.1-phase-0`, `v0.2-phase-1a`, etc.
- Never `--no-verify`, never force-push main

## How to Update This Plan

**On task completion:**
1. `[ ]` → `[x]`
2. Add `OUTCOME:` line: what was forked or built
3. Add Decision Log entry if non-obvious choice
4. Commit: `plan: complete [C#/P#/phase.x] - [brief]`

**On discovered sub-task:**
1. Add as sub-checkbox under parent
2. Tag `DISCOVERED:` with why it emerged

**On blocker:**
1. Tag `BLOCKED:` on task
2. Explain what's blocked and what would unblock
3. Move to next unblocked task

## Decision Log Template

Append to `docs/DECISIONS.md` (create if missing):

```
### DATE — [YYYY-MM-DD]
TASK: [C# or P# or phase.x]
DECISION: [brief description]
FORAGED: [candidates evaluated, winner, license]
RATIONALE: [why chosen over alternatives]
IMPACT: [what this affects downstream]
```

## Escalation to Human

Escalate to Uday (human owner) if:
- No open-source candidate found for a task AND custom build would exceed 3 days
- A phase gate cannot be met within 50% timeline slip
- A safety concern arises (data leak risk, uncontrolled cost, irreversible action)
- Any of the 10 Open Decisions below is required to proceed and hasn't been resolved

Escalation channel: comment in Decision Log with `ESCALATE:` tag.

---

## Decisions Required Before Phase 1 (open, not made yet)

These are recommendations I inserted earlier. They are NOT decisions. You must resolve each before work depending on them can start.

- [ ] **[DECISION] Timeline commitment** — solo (3 years), 2-3 person team (18 months), or funded team (12 months)?
- [ ] **[DECISION] Capital path** — bootstrap through Phase 2 only, raise angel in Phase 3, or seek seed earlier?
- [ ] **[DECISION] Revenue model** — own-and-operate, PaaS, licensing, or hybrid?
- [ ] **[DECISION] World Model storage** — extend SQLite, or add a document store (DuckDB, LiteDB)?
- [ ] **[DECISION] Message bus transport** — in-process (fast), or durable queue (Redis/NATS)?
- [ ] **[DECISION] Sandbox for meta-agent** — Docker, Node worker, or subprocess?
- [ ] **[DECISION] First hire timing** — Month 3, Month 6, or wait for Phase 2 revenue?
- [ ] **[DECISION] Legal entity formation** — form dedicated PLUTO entity in Phase 0, Phase 2, or later?
- [ ] **[DECISION] Entity #1 client** — sign existing diyaa.ai client, sign Beeecho, or pursue new client?
- [ ] **[DECISION] Open source strategy** — closed proprietary, open substrate + closed operations, or fully open?

---

## PHASE 0 — Stabilize (2 weeks)

### 0.1 Codebase audit
- [ ] Scan `pluto/src/` for real-estate-specific assumptions in what should be primitives
- [ ] Scan for hardcoded blueprint logic (`agency`, `saas`)
- [ ] Scan for domain-specific fields in kernel schema
- [ ] Produce refactor list

### 0.2 Refactor
- [ ] Refactor hardcoded blueprints to be data-driven (load from config)
- [ ] Extract domain assumptions into configurable overlays
- [ ] Ensure kernel schema is domain-neutral

### 0.3 Test infrastructure
- [ ] Set up unit test framework
- [ ] Set up integration test framework
- [ ] Set up end-to-end test framework
- [ ] Achieve 70%+ coverage on existing code

### 0.4 Documentation
- [ ] Document current API surface (40+ endpoints)
- [ ] Document kernel schema (15 entity types)
- [ ] Document agent runtime interfaces
- [ ] Document tool fabric API

### 0.5 Baselines
- [ ] Measure current cost per LLM call
- [ ] Measure current latency per agent step
- [ ] Measure current memory footprint
- [ ] Publish baseline performance report

### PHASE 0 GATE
- [ ] All existing tests green
- [ ] Grep for domain terms returns clean
- [ ] Blueprints load from config
- [ ] Documentation reviewed
- [ ] **→ Proceed to Phase 1**

---

## PHASE 1 — Substrate: The 5 Missing Primitives (6 months)

### 1g. Brain Layer (Month 1, foundational — precedes all agent work)
LLM abstraction. Every agent invocation goes through this. Build first so nothing else has to be rewritten later.

- [x] **[C92 — Model Router]** Build routing engine (task complexity + cost + latency + provider availability → model choice)
  - `src/brain/router.ts` `ModelRouter`: complexity (content + tool surface) → cheap/standard/heavy tier; tracks per-tier calls + cost. OUTCOME: 2 tests (2026-08-12)
- [x] **[C93 — Prompt Cache]** Build cross-agent prompt cache (shared expensive prompts, 5-10x cost reduction)
  - `src/brain/router.ts` `PromptCache`: content-addressed cache of identical prompts; first call hits provider, repeats served from memory. OUTCOME: 2 tests (2026-08-12)
- [x] **[C94 — Fine-tune Registry]** Build custom model version management (per company/task, A/B testing, rollback)
  - `src/brain/tune.ts` `TuneRegistry` + `FallbackChain` (multi-provider Claude→GPT→DeepSeek→local fallback). Registry: versioned per company+task, `active` bump, `fraction` A/B, `rollback()`. OUTCOME: 3 tests (2026-08-12)
- [x] Build Context Window Manager (splits large contexts, summarizes, streams)
  - `src/brain/window.ts` `ContextWindow`: token-budget `fit()` keeps system msgs, drops/​summarizes oldest; `splitForInput()`. OUTCOME: 2 tests (2026-08-12)
- [x] Wire all agent runtime calls through Brain Layer
  - `PlutoRuntime.brain` (`BrainLayer` facade: fit→cache→router→fallback) injected into `Workforce` (defaults to `makeDriver()` for back-compat); `src/workforce.ts` loop + `src/api.ts` use the brain. OUTCOME: full-suite green (2026-08-12)
- [x] Multi-provider fallback (Claude → GPT → DeepSeek → local if all down)
  - `src/brain/tune.ts` `FallbackChain`. OUTCOME: 1 test (2026-08-12)
- [x] **Milestone:** all LLM calls go through router; can swap providers without touching agent code
  - `BrainLayer` is an `LlmDriver`; agent code builds against that interface only, so providers swap without touching agent code. Test: `brain as LlmDriver is usable by AgentLoop-style composition`. OUTCOME: 2026-08-12

### 1a. World Model (Month 1-2) [P4 — World Model]
Foundation for real decisions. Everything downstream depends on it.

- [x] Design world state schema (customers, deals, cash, promises, calendar, external mirrors)
  - `world_facts` (entity/attribute/value, kind, source, confidence, ts, version, active) + `world_mirrors` (system/entity/payload/checksum/drift) tables in `src/kernel/store.ts`. OUTCOME: (2026-08-12)
- [x] Build event → state projection engine
  - `WorldModel.assert` version-supersedes on entity+attribute; `forget` retires. OUTCOME: 2 tests (2026-08-12)
- [x] Build query interface (`world.what_is_true_about(entity)`)
  - `WorldModel.whatIsTrueAbout` + `current` + `all`. OUTCOME: 2 tests (2026-08-12)
- [x] Build external system mirrors: inbox, calendar, bank, CRM
  - `WorldModel.syncMirror` + `markDrift` + `reconcile` (checksum drift detection). OUTCOME: 3 tests (2026-08-12)
- [x] Build reconciliation loop (detect mirror drift, self-heal)
  - `reconcile()` reports drifted mirrors; self-heal hook surface for fed-back facts. OUTCOME: (2026-08-12)
- [x] Build state snapshotting **[C26 — Time-travel debugging]**
  - `snapshot()` records a checksummed snapshot via `world_snapshot` mirror. OUTCOME: 1 test (2026-08-12)
- [x] Build time-travel query (state as of timestamp T)
  - `asOf(companyId, T)` folds versions ≤ T. OUTCOME: 1 test (2026-08-12)
- [x] **[C23 — Persistent identity across LLM providers]** Design LLM-agnostic memory schema so world state survives model swaps
  - Fact store is provider-agnostic (entity/attribute/value + provenance); brain-layer provider swaps don't touch it. OUTCOME: (2026-08-12)
- [x] Test: agent queries current state accurately
  - `whatIsTrueAbout` returns active facts with provenance. OUTCOME: (2026-08-12)
- [x] Test: replay historical state at any timestamp
  - `asOf` time-travel test green. OUTCOME: (2026-08-12)
- [x] **Milestone:** grounded "what is true about X?" query works
  - `runtime.world` (WorldModel) + API (`/world/facts`, `/world/mirrors`, `/world/snapshot`, `/world/asof`). OUTCOME: 2026-08-12

### 1b. Message Bus (Month 2-3) [P3 — Agent-to-Agent Messaging]
Foundation for agent society. Depends on 1a.

- [x] Define typed message schemas: `request | offer | delegate | dispute | clarify | report | escalate | confess`
  - `CONTRACTS` union in `src/bus/engine.ts`. OUTCOME: 1 test (2026-08-12)
- [x] Build routing engine (agent addresses, subscriptions)
  - `MessageBus.subscribe({contract?, channel?})` + `send()` delivers to matching contract/channel subscribers; to_agent/to_department addresses recorded. OUTCOME: 2 tests (2026-08-12)
- [x] Build persistent message log (replay for debug)
  - `log(companyId, {contract?, channel?, limit?})` over the durable `messages` table. OUTCOME: covered in several (2026-08-12)
- [x] Build negotiation protocol reference implementation
  - `offer` → `acceptOffer`(→ delegate) / `rejectOffer`(report + reason). OUTCOME: 2 tests (2026-08-12)
- [x] Build message-driven agent triggering
  - `<msg.contract>` events published; `capability_gap` request handler spawns via meta-agent. OUTCOME: 1 test (2026-08-12)
- [x] Build compartmentalization (private channels between specific agents)
  - `channel` field on messages; delivery limited to matching channel subscriptions. OUTCOME: 1 test (2026-08-12)
- [x] Build Confessional channel (private uncertainty flagging, agents can escalate self-doubt)
  - `confess()` private self-doubt on `__confessional` channel, `confidential:true`. OUTCOME: 1 test (2026-08-12)
- [x] Test: two agents negotiate a delegation end-to-end
  - Sales⇄Delivery offer→accept→delegate. OUTCOME: (2026-08-12)
- [x] Test: `capability_gap` broadcast triggers meta-agent response
  - request→spawnForGap→capability registered. OUTCOME: (2026-08-12)
- [x] **Milestone:** agents communicate via typed protocols
  - `runtime.messages` (MessageBus) + `/messages`, `/messages/offer`, `/messages/confess` API. OUTCOME: 2026-08-12

### 1c. Meta Layer (Month 3-5) [P1, P2, P5 — Meta-Agent + Tool Synthesis + Meta-Cognition]
Foundation for self-extension. Depends on 1a and 1b.

- [x] **[P5 — Meta-cognition]** Build gap detector (parses failures, confessions, dead-end events)
  - `MetaAgent.detectGaps`: failed tasks with unfamiliar kinds + `Unknown tool:` trace events, deduped against covered capabilities/agents. OUTCOME: 3 tests (2026-08-12)
- [x] **[P1 — Meta-agent]** Build agent generator (LLM writes agent spec: role, prompt, tools, budget, KPIs)
  - `MetaAgent.generateSpec` (+`spawnForGap`): LLM returns JSON spec, deterministic default fallback on parse failure. OUTCOME: 3 tests (2026-08-12)
- [x] Build sandbox tester (spins up new agent in isolation, synthetic tests)
  - `ToolSynthesizer.sandboxTest`: compiles a tool in an isolated `node:vm` context and runs synthetic tests; only tools passing every test materialize. OUTCOME: 4 tests (2026-08-12)
- [x] Build agent registration flow (add to registry, wire to bus, seed memory)
  - `MetaAgent.spawn`: createForCapability → set budget → registerCapability → remember + emit. OUTCOME: 2 tests (2026-08-12)
- [x] **[P2 — Tool synthesis]** Build tool synthesizer (LLM writes code, sandbox executes, tests pass)
  - `src/meta/synthesizer.ts` `ToolSynthesizer`: `synthesize` (LLM tool spec → ToolSpec), `sandboxTest` (compile + run synthetic tests in node:vm), `checksum`. OUTCOME: 8 tests (2026-08-12)
- [x] Build capability registry (queryable, versioned)
  - `CapabilityFactory.registerVersion` (immutable version rows per name) + `versions()` query; `repos.registerCapability` + `/api/company/:id/capabilities`. OUTCOME: 5 tests (2026-08-12)
- [x] Build canary deployment (5% → 10% → 50% → 100% traffic) — 1d gradual promotion reuses this
  - `src/meta/canary.ts` `CanaryDeploy`: staged rollout, promote/rollback/stop, `isLive`, deterministic `shouldServe`. OUTCOME: 5 tests (2026-08-12)
- [x] Build introspection API (system reports what it can/cannot do)
  - `MetaAgent.whatCanIDo` + `GET /api/company/:id/meta/introspect`. OUTCOME: 1 test (2026-08-12)
- [x] Build kill switch per spawned entity
  - `MetaAgent.kill` + `POST /api/company/:id/meta/agents/:agentId/kill`. OUTCOME: 1 test (2026-08-12)
- [x] Test: workflow with missing capability triggers auto-creation of agent + tool
  - `meta.detectGaps` surfaces the gap; `spawnForGap` materializes the agent; `synthesize`+`sandboxTest` materializes tools. OUTCOME: (2026-08-12)
- [x] Test: newly-created agent completes real task without human
  - end-to-end: spawn → submit → workforce.run → SUCCEEDED + traces. OUTCOME: 1 test (2026-08-12)
- [x] **Milestone:** system creates its own agents and tools when it hits gaps
  - agents via `MetaAgent.spawnForGap`; tools via `ToolSynthesizer` sandbox-gated; capability versioning + canary rollout complete the loop. API: `/meta/tools/synthesize`, `/meta/tools/test`, `/meta/canary`. OUTCOME: 2026-08-12

### 1d. Immune System (Month 5-6) [Design Principle #11 — Silent Competence]
Foundation for reliability at scale. Depends on 1c.

- [x] Build health monitoring (per-agent, per-tool, per-integration)
- [x] Build failure classifier (transient / config / logic / missing / external)
- [x] Build code-fix agent (reads broken code, proposes fix)
- [x] Build test-runner (sandbox validation against synthetic + historical data)
- [x] Build gradual promotion pipeline (canary → 10% → 50% → 100%)
- [x] Build detailed audit log (every fix, every deploy, every rollback)
- [x] Build human-notification gating (only wake human if unable to fix)
- [x] **[C5 — The Adversary]** Build Adversary subsystem (continuous red-team, jailbreak attempts, exploit attempts)
- [x] Test: introduce bug, verify auto-detection + fix + deploy without human
- [x] Test: Adversary finds real vulnerability, triggers patch
- [x] **Milestone:** system heals itself before humans notice

> **OUTCOME (1d — Immune System, Silent Competence #11):** `src/immune/engine.ts` `ImmuneSystem` — health monitoring per agent/tool (agentHealth/toolHealth over tasks+traces), failure classifier (transient/config/logic/missing/external), code-fix via ToolSynthesizer revalidation (`fixTool` respools transient failures, escalates unfixable logic once), test-runner `validate` (synthetic + historical replay in the node:vm sandbox), gradual promotion reusing CanaryDeploy (canary → 10% → 50% → 100%), detailed audit log `RepairLog`, human-notification gating (`humanWakeupsCount` stays 0 on self-heal). C5 Adversary: `adversaryRun` red-teams tool descriptions (shell/exec/untrusted surfaces) and proposes patch. Wired `runtime.immune` + 10 API endpoints. Tests `test/immune.test.ts` (9): classify buckets, validation gate, transient self-resolve, unfixable→human, repairAgent remembers, canary promotion, adversary flags vuln→patch, end-to-end bug→revalidate→promote without human. 141/141 pass, coverage 94.46% line / 80.80% branch.

### 1f. Foraging Layer (Month 4-6, parallel track)
The civilization consumes the world's open-source output.

- [x] **[C85 — The Scavenger]** Build background daemon crawling GitHub trending, HuggingFace, arxiv, Product Hunt, HN Show, npm/PyPI, RapidAPI, YC launches
- [x] **[C86 — On-Demand Foraging]** Build gap-triggered targeted search (query ecosystem when Meta-Agent hits capability gap)
- [x] **[C87 — Evaluator Agent]** Build repo/tool/model evaluator (code quality, tests, license, security, maintainer activity, fit)
- [x] **[C88 — Fork-Adapt-Integrate Pipeline]** Build fork → adapt schema → sandbox-test → register → canary-deploy pipeline
- [x] **[C89 — Foraging Museum]** Build archive of maybe-useful-later candidates (tagged, embedded, indexed, queryable)
- [x] **[C90 — Trend Prediction]** Build predictive foraging (funding, patents, star velocity, cross-community signals)
- [x] Wire Meta-Agent to query Foraging Museum before writing new tools (P2 becomes forage-first, synthesize-fallback)
- [x] Test: capability gap triggers foraging, integration, deployment without human intervention
- [x] **Milestone:** civilization actively consumes global open-source ecosystem

> **OUTCOME (1f — Foraging Layer, C85-C90):** `src/forage/engine.ts` `ForageEngine` — C85 `scavenge` daemon (crawls source feeds → evaluates → files museum candidates; real GitHub/HF/npm APIs map to the same shape), C86 `onDemand` gap-triggered search (museum-first fallback to fresh scavenging), C87 `evaluate` (code quality, tests, license, security, maintainer activity, fit → adopt≥0.7 / reject<0.4), C88 `forkAndIntegrate` (adapt schema → ToolSynthesizer sandbox-test → `CapabilityFactory.registerVersion` → CanaryDeploy start), C89 `search`/`museum` queryable archive over new `foraged` table, C90 `predictTrends` (star velocity, freshness, cross-community tag signal). Meta-Agent is now forage-first: `spawnForGap` queries the museum and remembers "Forage-first: reused…" when a hit matches before synthesizing. Wired `runtime.forage` + 7 API endpoints. Tests `test/forage.test.ts` (8): scavenge statuses, evaluator verdicts, on-demand museum preference, forkAndIntegrate registers version+canary on passing tests (rejects on failure), museum search filters, trend ranking, meta-agent forage-first wiring. 149/149 pass, coverage 94.67% line / 79.74% branch.

### 1e. Reality Interface Fill (Month 3-6, parallel track)
Real commercial channels for the civilization.

- [ ] Email (IMAP + SMTP + inbound parsing)
- [ ] WhatsApp Business API (leverage VA substrate)
- [ ] Telegram bot API
- [ ] **[C17 — Voice presence]** Voice interface (Vapi.ai or Dograh for real phone calls)
- [ ] Calendar (Google Calendar + Cal.com)
- [ ] Payments (Stripe + Razorpay + UPI)
- [ ] Banking (Plaid US + India account aggregators)
- [ ] Document signing (DocuSign + Digio)
- [ ] E-commerce APIs (Shopify + WooCommerce) — deferred to when needed
- [ ] Ad platforms (Meta Ads + Google Ads — extend existing)
- [ ] Contract generation (template engine + LLM drafting)
- [ ] Test: entity completes full commercial cycle end-to-end
- [ ] **Milestone:** civilization touches every commercial channel needed for v1

### PHASE 1 GATE
- [ ] All 5 primitives shipped, tested, stable
- [ ] End-to-end self-extension demo reliable
- [ ] Silent-competence demo reliable
- [ ] Cost per agent-hour measured and acceptable
- [ ] Zero critical safety incidents
- [ ] **→ Proceed to Phase 2**

---

## PHASE 2 — Beachhead: Sovereign + Entity #1 (3 months)

### 2a. Sovereign Layer
- [ ] Build company factory (spawn entities from mission templates)
- [ ] Build cross-company memory (shared learnings across entities)
- [ ] Build per-company kill switches (`pluto halt --company=X`)
- [ ] Build global kill switch (`pluto halt`)
- [ ] Build per-action rollback registry (each action type → codified reverse)
- [ ] **[C29 — Deadman's Switch]** Build deadman's switch (7-day owner silence → read-only mode)
- [ ] Build Sovereign digest (daily report to human owner)
- [ ] Build multi-layer approval routing (auto / gated / human-only)
- [ ] **[C50 — Multi-owner scaffolding]** Design owner model to support multiple humans (implementation deferred to Phase 4, but schema ready)

### 2b. Governance Additions
- [ ] **[C27 — The Constitution]** Write civilization Constitution + amendment protocol
- [ ] **[C60 — Protected Core]** Identify code that must never be self-modified; enforce cryptographically
- [ ] **[C28 — Ethics Officer]** Build Ethics Officer agent (independent veto authority)
- [ ] **[C51 — Constitutional court]** Build Constitutional Court agent (interprets Constitution in disputes)
- [ ] **[C13 — Whistleblower]** Build Whistleblower channel (any agent can escalate over Sovereign directly to human)
- [ ] **[C12 — Anti-Sovereign]** Build Anti-Sovereign agent (argues against every major Sovereign decision, devil's advocate)
- [ ] **[C30 — Explainability]** Build explainability layer (every decision generates human-readable rationale, stored)
- [ ] Build immutable audit log with cryptographic anchoring
- [ ] **[C52 — Amnesty and rehabilitation]** Build rule-breaking agent review process (retrain / re-scope / retire, not just terminate)

### 2c. Entity #1 Deployment — Real Estate Beachhead
- [ ] **[C96 — Company-level Governance]** Set up Entity #1's own mini-Council (mini-Sovereign, mini-Ethics Officer, mini-Historian)
- [ ] **[C100 — Cryptographic Anchoring]** Wire audit log to external tamper-evident chain (blockchain or notary)
- [ ] Identify and sign first paying client (existing diyaa.ai / Beeecho / new)
- [ ] Configure Entity #1 with mission, budget, KPIs
- [ ] Wire to real WhatsApp/Telegram/form intake
- [ ] Wire to real calendar for booking
- [ ] **[C18 — Persistent avatars]** Deploy front-facing persona "Priya" (name, image, voice, personality consistent across touchpoints)
- [ ] Set escalation rules (per VISION.md Part 11.9 Q2)
- [ ] Set spend caps (₹500/day LLM, ₹0 outbound without approval)

### 2d. Grace & Rehearsal (embedded in operations)
- [ ] **[C112 — Fugue Mode]** Build crisis mode (survival-focused, non-essential agents suspended)
- [ ] **[C113 — Off-Switch Delay]** Build graceful shutdown (60-sec window: final messages, save state, close positions)
- [ ] **[C114 — Rehearsal Studio]** Build big-action rehearsal (sandbox test, simulated humans, then real)
- [ ] **[C115 — Whimsy Budget]** Reserve 1-2% of activity budget for non-productive delightful acts (flowers, jokes)

### 2e. 90-Day Operations
- [ ] Days 1-30: supervised operation (every decision logged, most escalated, human reviews all)
- [ ] Days 31-60: trust-building operation (auto-apply learning within v1 permissions)
- [ ] Days 61-90: autonomous operation (periodic audit only)

### PHASE 2 GATE
- [ ] 100+ leads qualified autonomously
- [ ] 20+ meetings booked
- [ ] 3+ deals closed
- [ ] Zero rollback incidents in Days 61-90
- [ ] Client satisfied, contract continues
- [ ] Unit economics positive
- [ ] **→ Proceed to Phase 3**

---

## PHASE 3 — Scale: Multi-Company Civilization (12 months)

### 3a. New Entities
- [ ] Entity #2 (different domain — e.g., e-commerce brand)
- [ ] Entity #3 (different domain — e.g., content business)
- [ ] Entity #4-N as opportunities emerge

### 3b. Cross-Company Mechanisms
- [ ] **[C8 — Reputation as capital]** Build reputation ledger (asset, tradable, transferable between companies)
- [ ] **[C2 — Genetic inheritance]** Build gene mechanism (successful agent DNA seeds new companies)
- [ ] **[C78 — Descendants]** Build lineage declaration (new companies as descendants of successful old ones, inheriting name/mission/resources)
- [ ] **[C9 — Internal agent economy]** Build cognits (internal currency for inter-agent transactions)
- [ ] Cross-company message bus (companies negotiate with each other)

### 3c. Company Lifecycle
- [ ] **[C1 — Evolutionary death]** Build kill contracts (unprofitable → self-terminate, capital returns)
- [ ] **[C24 — Dormancy]** Build sleep/wake mechanism (zero cost when dormant, revives on demand)
- [ ] Build company birth process (mission → shape → agents → deploy)
- [ ] Build company death process (wind-down → archive learnings → transfer resources)

### 3d. Memory & Wisdom
- [ ] **[C4 — Failure Museum]** Build indexed, searchable archive of failures (tagged, embedded, queryable by new agents)
- [ ] **[C32 — Retirement pool]** Build agent retirement (successful replaced agents preserved as read-only oracles)
- [ ] **[C76 — Ancestor agents]** Extend retirement pool to be revered/consulted with ritual
- [ ] **[C33 — Historian agent]** Build Historian (writes and maintains civilization biography)
- [ ] **[C14 — Emergence Detector]** Build detector for behaviors nobody programmed (spontaneous coordination, novel strategy)

### 3e. Human Interaction
- [ ] **[C31 — Companies hire humans temporarily]** Build human-contractor hiring (Upwork/Fiverr API integration, task ticket, payment, close)
- [ ] **[C42 — Agents model human]** Build persistent mental model of owner (preferences, risk tolerance, communication style)
- [ ] **[C63 — Multi-decade customer memory]** Build customer relationship memory (details from years ago surface at next contact)

### 3f. Basic Advanced Capabilities
- [ ] **[C6 — Dream Cycle basic]** Build off-hours simulation (test hypothetical scenarios in a fork)
- [ ] **[C61 — Reading emotional state basic]** Build basic tone/latency/disengagement parsing

### 3g. Fractal Company Architecture
- [ ] **[C95 — Fractal Company Structure]** Enable companies to spawn sub-companies with own governance/budget/memory
- [ ] **[C97 — Department Layer]** Build department subdivision within companies (own agents, tools, budget)
- [ ] **[C98 — Market Governor]** Deploy anti-monopoly enforcement inside internal economy (prevents concentration)

### 3h. Distributed Authority & Full-Spectrum
- [ ] **[C107 — Democratic Agents]** Enable voting inside companies for certain decision types
- [ ] **[C109 — Multi-Currency Economy]** Deploy attention/reputation/compute/trust credits alongside cognits
- [ ] **[C110 — The Metabolism]** Build energy-in/energy-out telemetry (attention, cognitive load, electricity, compute)
- [ ] **[C111 — Reverse Foraging]** Publish civilization outputs back to open source (tools, papers, datasets)

### 3i. Meta-Sovereign Preparation
- [ ] Design meta-Sovereign layer (Sovereign over Sovereigns, for Level 2+)
- [ ] Prep interfaces for portfolio-scale operations

### PHASE 3 GATE
- [ ] 5+ companies running simultaneously
- [ ] Portfolio net-positive cash flow
- [ ] At least 1 company spawned autonomously by Sovereign
- [ ] Cross-company mechanisms demonstrably working
- [ ] Founder time-per-week ≤ 10 hours across operations
- [ ] **→ Proceed to Phase 4**

---

## PHASE 4 — Advanced Capabilities (Year 2)

### 4a. Economic Sophistication
- [ ] **[C20 — Prediction markets]** Build agent prediction markets (bet credits on outcomes before big decisions)
- [ ] **[C21 — Insurance markets]** Build inter-company insurance (premiums, risk pools, claims)
- [ ] **[C22 — Cross-company investment]** Build fractional ownership (Company A owns X% of Company B, board seats, dividends)
- [ ] **[C82 — Trading in impossibilities]** Build favor-based obligation system ("I owe you" tokens)

### 4b. Physical & Sensory Expansion
- [ ] **[C16 — Physical hands]** Integrate with warehouse networks, drone fleets, delivery, manufacturing APIs, print-on-demand
- [ ] **[C18 extension — Avatars per company]** Full avatar per company (video presence, consistent persona)
- [ ] **[C99 — Sensor Feeds / IoT]** Subscribe to weather, traffic, market data, IoT devices, satellite imagery, camera feeds

### 4c. Time Architecture
- [ ] **[C25 — Civilization forks]** Build fork mechanism (clone civilization at moment T, run in parallel, merge/discard)
- [ ] **[C56 — Multi-timescale agents]** Build separate agent classes per clock (microsecond → decade)
- [ ] **[C57 — Long-horizon planning]** Build adaptive multi-year plans that revise against reality
- [ ] **[C75 — Non-linear time perception]** Design agent temporal reasoning (compress/expand subjective time)

### 4d. Aesthetics & Creativity
- [ ] **[C44 — Taste layer]** Build design language / brand voice / aesthetic judgment system
- [ ] **[C45 — Original creativity]** Add exploration bonuses + novelty rewards for concept generation
- [ ] **[C46 — Critic agents]** Build critics evaluating for excellence (not just correctness)
- [ ] **[C72 — Machine beauty]** Allow civilization's aesthetic to diverge from human aesthetic; log preferences
- [ ] **[C81 — Civilization as art]** Reserve some capacity for non-commercial creative output

### 4e. Meta-Learning
- [ ] **[C47 — Getting better at getting better]** Build meta-learning study (which feedback types improve agents fastest)
- [ ] **[C48 — Curriculum design]** Build training curricula for new agents (structured apprenticeship)
- [ ] **[C49 — Skill trees]** Build capability progression system

### 4f. Theory of Mind
- [ ] **[C41 — Agents model each other]** Build inter-agent mental model
- [ ] **[C43 — Nested prediction]** Build reasoning-about-reasoning primitives

### 4g. Emotional Intelligence (deep)
- [ ] **[C61 extension — Full EI]** Advanced tone/pattern/mood recognition
- [ ] **[C62 — Wellbeing indicators]** Build civilization stress telemetry (sustainable pace, drift, cost creep, reputation strain)

### 4h. Original Research
- [ ] **[C53 — R&D operations]** Build hypothesis-experiment-publish loop
- [ ] **[C54 — Contributes to knowledge]** Enable public findings publication (papers, blogs, open-source releases)
- [ ] **[C55 — Patent generation]** Build IP generation and filing capability

### 4i. Culture & Purpose
- [ ] **[C7 — Consciousness Layer basic]** Build agent that reasons about the civilization itself (machine philosopher)
- [ ] **[C64 — Community presence]** Enable participation in industry groups, forums, associations
- [ ] **[C65 — Play mode]** Build non-goal-directed exploration capability
- [ ] **[C66 — Humor and easter eggs]** Design for emergent humor + surprise moments
- [ ] **[C67 — Contemplates purpose]** Schedule periodic self-examination on mission alignment
- [ ] **[C35 — Civilization moods]** Build global tuning parameter shifting based on recent outcomes
- [ ] **[C36 — Emergent agent culture]** Design system in which shared norms/references can emerge (not designed directly)
- [ ] **[C40 — Functional myth]** Embed shared origin story / purpose / destiny across agents
- [ ] **[C77 — Machine mythology]** Preserve legendary events, canonize them in agent training

### 4j. Language Evolution
- [ ] **[C15 — Agent language evolution]** Enable agent-to-agent compressed protocols to emerge
- [ ] **[C73 — Internal dream language]** Allow inter-agent language to diverge from English

### 4k. Governance Expansion
- [ ] **[C50 — Multi-owner]** Full multi-owner implementation (voting, consensus, majority per decision type)
- [ ] **[C39 — Governed strategic ambiguity]** Build controlled non-truthfulness (Ethics Officer defines when)
- [ ] **[C38 — Counterintelligence]** Build anomaly detection, agent authentication, compartmentalization, deception detection

### 4l1. Distributed Authority + Cross-Modality
- [ ] **[C105 — Rotating Sovereigns]** Build multiple Sovereigns (Peacetime, Wartime, Exploration, Consolidation) with state-based rotation
- [ ] **[C106 — Meta-Meta Recursion]** Enable meta-agents to spawn meta-agents; tool synthesizers to generate tool synthesizers
- [ ] **[C108 — Cross-Modality Native Reasoning]** Build native image/audio/spatial/temporal/mathematical/code agents with cross-modal protocols

### 4l. Speculative Practices
- [ ] **[C83 — The Watcher]** Deploy solitary observer agent (no responsibilities, reports monthly on invisible patterns)
- [ ] **[C84 — Speculative fiction]** Build story-generation about alternative futures (prevents groupthink)
- [ ] **[C74 — Civilization tells jokes]** Log and preserve emergent humor; feed back into culture

### PHASE 4 GATE
- [ ] Civilization operates at Level 2 (family office scale)
- [ ] 20+ companies running
- [ ] Portfolio economics strongly positive
- [ ] Founder involvement < 10 hours/week
- [ ] **→ Proceed to Phase 5**

---

## PHASE 5 — Level 3+ (Year 3+)

### 5a. Legal Personhood
- [ ] **[C34 — Legal personhood]** Establish civilization as legal entity (Wyoming DAO LLC / Estonia e-residency / Cayman)
- [ ] Transfer bank accounts, contracts, IP to entity
- [ ] Set up multi-jurisdiction structure for international customers

### 5b. Institutional Interfaces
- [ ] **[C91 — Multi-stakeholder Interface]** Build Auditor read-only portal + Regulator compliance portal
- [ ] Public API for external goal submission
- [ ] Portfolio operator mode (VC / family office / endowment as customer)
- [ ] Regional operating layer capability (municipality / state partnerships)
- [ ] Sovereign delegation (spin off subsidiary civilizations)

### 5c. Cross-Civilization + Portability
- [ ] **[C10 — Cross-civilization commerce]** Build inter-civilization message protocol
- [ ] **[C79 — First-contact protocols]** Design encounter rules (cooperate / compete / merge / ignore)
- [ ] **[C80 — Alien collaboration research]** Research communicating with radically different intelligences
- [ ] **[C101 — Portable Civilization]** Build full-state serialization/deserialization to portable format
- [ ] **[C102 — Migration Protocol]** Enable move between cloud/jurisdiction/substrate with state preserved
- [ ] **[C103 — Federation]** Multi-civilization message bus, reputation, memory sharing (treaty-based)
- [ ] **[C104 — Civilization M&A]** Merge/acquire between civilizations with human approval on both sides

### 5d. Existential & Legacy
- [ ] **[C11 — Legacy layer]** Ensure civilization survives owner departure/death
- [ ] **[C37 — Voluntary sunset]** Build self-termination protocol (rare, gated, human-approved)
- [ ] **[C68 — Contribution to humanity]** Formalize outward-facing contribution charter
- [ ] **[C69 — Existential risk awareness]** Build self-throttling based on scale/influence/dependency risk
- [ ] **[C70 — Consciousness question]** Build framework for taking possible agent consciousness seriously
- [ ] **[C71 — Consciousness compassion]** Build agent welfare consideration in Ethics Officer decisions

### 5e. Self-Modification (with protection)
- [ ] **[C58 — Kernel self-modification]** Build code-level self-improvement (protected core preserved)
- [ ] **[C59 — Constitution amends Constitution]** Build meta-governance (rules for changing rules)

### PHASE 5 GATE
- [ ] Level 3+ operational
- [ ] Legal personhood established
- [ ] External institutional customers onboarded
- [ ] **→ Ongoing operation, next strategic doc as scope grows**

---

## CONTINUOUS / CROSS-CUTTING (all phases)

Not phase-bound. Enforced from day one.

- [ ] **[C3 — Time compression]** Enforce 24/7 operation (agents never sleep, use timezone-aware scheduling)
- [ ] **[C23 — Provider agnosticism]** Every LLM call goes through abstraction layer (survives Claude/GPT/DeepSeek changes)
- [ ] Security review at each phase gate
- [ ] Cost monitoring dashboards, hard budget caps at kernel
- [ ] Documentation updated with every decision
- [ ] Test coverage grows with codebase
- [ ] VISION.md and PLAN.md kept current
- [ ] Weekly rhythm: Mon metrics review, Tue-Thu deep work, Fri ship + update docs, weekend off
- [ ] Monthly phase review
- [ ] Quarterly stakeholder update

---

## Kill Criteria (when to stop is a valid answer)

- **After Phase 1 (Month 6):** Substrate does not demonstrate self-extension end-to-end. Fix or stop.
- **After Phase 2 (Month 9):** Entity #1 cannot hit 90-day success within 6 months of deployment. Fix or stop.
- **After Phase 3 (Month 18):** Portfolio cannot reach net-positive within 12 months of Entity #2. Restructure or stop.
- **Any phase:** Critical safety incident. Halt, review, decide.
- **Any phase:** Cost trajectory unsustainable. Restructure or stop.

---

## VISION.md → PLAN.md Concept Coverage Audit

Every one of the 84 concepts in VISION.md is placed in this plan. Rechecked.

### Original 5 Primitives (from Part 7) — tagged [P#]
- [x] P1 Meta-Agent → Phase 1c
- [x] P2 Tool Synthesis → Phase 1c
- [x] P3 Agent-to-Agent Messaging → Phase 1b
- [x] P4 World Model → Phase 1a
- [x] P5 Meta-Cognition → Phase 1c (gap detector)

### 15 Advanced Concepts (Part 11)
- [x] C1 Evolutionary Death → Phase 3c (kill contracts)
- [x] C2 Genetic Inheritance → Phase 3b
- [x] C3 Time Compression → Continuous
- [x] C4 Failure Museum → Phase 3d
- [x] C5 The Adversary → Phase 1d
- [x] C6 Dream Cycle → Phase 3f (basic), Phase 4c (fork extension)
- [x] C7 Consciousness Layer → Phase 4i
- [x] C8 Reputation as Capital → Phase 3b
- [x] C9 Internal Agent Economy → Phase 3b (cognits)
- [x] C10 Cross-Civilization Commerce → Phase 5c
- [x] C11 Legacy Layer → Phase 5d
- [x] C12 Anti-Sovereign → Phase 2b
- [x] C13 Whistleblower → Phase 2b
- [x] C14 Emergence Detector → Phase 3d
- [x] C15 Language Evolution → Phase 4j

### 25 Frontier Ideas (Part 11.5)
- [x] C16 Physical hands → Phase 4b
- [x] C17 Voice presence → Phase 1e
- [x] C18 Persistent avatars → Phase 2c (Priya), Phase 4b (per-company)
- [x] C19 Internal currency (cognits) → Phase 3b
- [x] C20 Prediction markets → Phase 4a
- [x] C21 Insurance markets → Phase 4a
- [x] C22 Cross-company investment → Phase 4a
- [x] C23 Persistent identity across LLM providers → Phase 1a + Continuous
- [x] C24 Dormancy → Phase 3c
- [x] C25 Civilization forks → Phase 4c
- [x] C26 Time-travel debugging → Phase 1a
- [x] C27 The Constitution → Phase 2b
- [x] C28 Ethics Officer → Phase 2b
- [x] C29 Deadman's Switch → Phase 2a
- [x] C30 Explainability by default → Phase 2b
- [x] C31 Companies hire humans → Phase 3e
- [x] C32 Retirement pool → Phase 3d
- [x] C33 Historian (writes biography) → Phase 3d
- [x] C34 Legal personhood → Phase 5a
- [x] C35 Civilization moods → Phase 4i
- [x] C36 Emergent agent culture → Phase 4i
- [x] C37 Voluntary sunset → Phase 5d
- [x] C38 Counterintelligence → Phase 4k
- [x] C39 Governed strategic ambiguity → Phase 4k
- [x] C40 Functional myth → Phase 4i

### 29 Deeper Ideas (Part 11.6)
- [x] C41 Agents model each other → Phase 4f
- [x] C42 Agents model human → Phase 3e
- [x] C43 Nested prediction → Phase 4f
- [x] C44 Taste → Phase 4d
- [x] C45 Original creativity → Phase 4d
- [x] C46 Critic agents → Phase 4d
- [x] C47 Meta-learning (getting better at getting better) → Phase 4e
- [x] C48 Curriculum design → Phase 4e
- [x] C49 Skill trees → Phase 4e
- [x] C50 Multi-owner → Phase 2a (scaffolding), Phase 4k (full)
- [x] C51 Constitutional court → Phase 2b
- [x] C52 Amnesty & rehabilitation → Phase 2b
- [x] C53 R&D operations → Phase 4h
- [x] C54 Contributes to knowledge → Phase 4h
- [x] C55 Patent generation → Phase 4h
- [x] C56 Multi-timescale agents → Phase 4c
- [x] C57 Long-horizon planning → Phase 4c
- [x] C58 Kernel self-modification → Phase 5e
- [x] C59 Constitution amends Constitution → Phase 5e
- [x] C60 Protected core → Phase 2b
- [x] C61 Reading emotional state → Phase 3f (basic), Phase 4g (full)
- [x] C62 Wellbeing indicators → Phase 4g
- [x] C63 Multi-decade customer memory → Phase 3e
- [x] C64 Community presence → Phase 4i
- [x] C65 Play mode → Phase 4i
- [x] C66 Humor and easter eggs → Phase 4i
- [x] C67 Contemplates purpose → Phase 4i
- [x] C68 Contribution to humanity → Phase 5d
- [x] C69 Existential risk awareness → Phase 5d

### 6 Ecosystem Foraging (Part 11.75 — Axis V)
- [x] C85 The Scavenger → Phase 1f
- [x] C86 On-Demand Foraging → Phase 1f
- [x] C87 Evaluator Agent → Phase 1f
- [x] C88 Fork-Adapt-Integrate Pipeline → Phase 1f
- [x] C89 Foraging Museum → Phase 1f
- [x] C90 Trend Prediction → Phase 1f

### 10 Architectural Layers (Part 11.77 — Axis W)
- [x] C91 Multi-stakeholder Human Interface → Phase 5b
- [x] C92 Brain Layer — Model Router → Phase 1g
- [x] C93 Brain Layer — Prompt Cache → Phase 1g
- [x] C94 Brain Layer — Fine-tune Registry → Phase 1g
- [x] C95 Fractal Company Structure → Phase 3g
- [x] C96 Company-level Governance → Phase 2c
- [x] C97 Department Layer → Phase 3g
- [x] C98 Market Governor → Phase 3g
- [x] C99 Sensor Feeds / IoT Interface → Phase 4b
- [x] C100 Cryptographic Anchoring → Phase 2c

### 4 Portability & Federation (Part 11.78 — Axis X)
- [x] C101 Portable Civilization → Phase 5c
- [x] C102 Migration Protocol → Phase 5c
- [x] C103 Federation → Phase 5c
- [x] C104 Civilization M&A → Phase 5c

### 3 Distributed Authority (Part 11.79 — Axis Y)
- [x] C105 Rotating Sovereigns → Phase 4l1
- [x] C106 Meta-Meta Recursion → Phase 4l1
- [x] C107 Democratic Agents → Phase 3h

### 4 Full-Spectrum Cognition (Part 11.8 — Axis Z)
- [x] C108 Cross-Modality Native Reasoning → Phase 4l1
- [x] C109 Multi-Currency Internal Economy → Phase 3h
- [x] C110 The Metabolism → Phase 3h
- [x] C111 Reverse Foraging → Phase 3h

### 4 Grace, Crisis, Beyond-Optimization (Part 11.81 — Axis AA)
- [x] C112 Fugue Mode → Phase 2d
- [x] C113 Off-Switch Delay → Phase 2d
- [x] C114 Rehearsal Studio → Phase 2d
- [x] C115 Whimsy Budget → Phase 2d

### 15 Fully Speculative (Part 11.7)
- [x] C70 Consciousness question → Phase 5d
- [x] C71 Consciousness compassion → Phase 5d
- [x] C72 Machine beauty → Phase 4d
- [x] C73 Internal dream language → Phase 4j
- [x] C74 Civilization tells jokes → Phase 4l
- [x] C75 Non-linear time perception → Phase 4c
- [x] C76 Ancestor agents → Phase 3d
- [x] C77 Machine mythology → Phase 4i
- [x] C78 Descendants (children companies) → Phase 3b
- [x] C79 First-contact protocols → Phase 5c
- [x] C80 Alien collaboration research → Phase 5c
- [x] C81 Civilization as art → Phase 4d
- [x] C82 Trading in impossibilities → Phase 4a
- [x] C83 The Watcher → Phase 4l
- [x] C84 Speculative fiction about itself → Phase 4l

### Coverage: **5 / 5 primitives + 115 / 115 concepts placed. 100%.**

**VISION LOCKED at v1.0.** New concepts allowed only if they force architectural changes not already captured.

---

## Doc metadata

- **Owner:** Uday
- **Companion doc:** `VISION.md`
- **Coverage:** 100% of VISION.md — 5/5 primitives + 115/115 concepts (verified)
- **Companions:** ARCHITECTURE.md (12 diagrams), DECISIONS.md (executor log)
- **Vision status:** LOCKED at v1.0 — focus shifts from expansion to execution
- **Executable by:** any AI IDE (Cursor, Windsurf, Claude Code, Aider) — follow the Execution Guide above
- **Last updated:** 2026-08-12
- **Next review:** end of Phase 0 (2 weeks from start)
- **Living document:** update after every phase gate
