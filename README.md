# PLUTO — Autonomous Company Operating System

A human supplies a mission. PLUTO designs the organization, creates the workforce, allocates resources, executes in the real world, verifies outcomes, learns, and evolves the company — continuously, until the mission is won, abandoned by policy, or requires a human decision.

```
MISSION → INTELLIGENCE → STRATEGY → ORGANIZATION → WORKFORCE → CAPABILITIES
  → RESOURCES → EXECUTION → REAL WORLD → OBSERVATION → VERIFICATION
  → LEARNING → EVOLUTION → NEW STRATEGY
```

## What this repo is

A working monorepo implementation of the PLUTO kernel (all 15 subsystems from `pluto.md` §7), not a dependency hell of 45 unmounted GitHub repos. External foundations are used where they are genuinely the strongest option (durable-execution semantics in the kernel, MCP-style tool fabric, Playwright as the browser executor); the proprietary layer — company model, objective cascade, org design, capability synthesis, verification, learning, evolution — is built here.

## Requirements

- Node.js >= 22 (uses built-in `node:sqlite`, native TS type-stripping)
- DeepSeek API key optional — without it the system runs on a deterministic mock to prove the loop

## Run

```bash
cp .env.example .env      # add DEEPSEEK_API_KEY if you want real execution
npm install
npm run demo              # bootstraps a company + demo mission + live org
npm run api               # start API + dashboard on :4000
```

Open http://localhost:4000 for the PLUTO Command Center.

## Layout

```
src/
  kernel/        # domain model, events, storage (node:sqlite), graph
  org/           # org engine, agent factory, workforce, delegation
  strategy/      # objective cascade, goal decomposition
  agents/        # LLM runtime (DeepSeek V4 Flash), tool fabric, agent loop
  tools/         # MCP-style tool adapters (fs, http, browser, time)
  verify/        # verification engine
  learn/         # learning + evolution engine
  plane/         # control plane: governance, resources, approvals, observability
  api/           # REST + SSE dashboard server
  demo.ts        # end-to-end bootstrap
apps/dashboard/  # Command Center SPA
```

## Design rules (from pluto.md §41)

- Organization/objective/event/execution/state models are explicit and queryable.
- Typed contracts, not agent chat.
- Every important action is observable + auditable (event log, traces, decisions).
- Task execution is durable (states, retries, heartbeats).
- Planning separated from execution; execution separated from verification.
- An agent saying "done" is never evidence.
- Human approval for high-risk/irreversible actions.
- Multi-model + multi-tenant ready; grid adapters replaceable.

## Verify the build

```bash
npm run typecheck
```