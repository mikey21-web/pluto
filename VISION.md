# PLUTO — Vision Document

> **The formula: `goal → done`.**
>
> Not a workflow engine. Not a multi-agent orchestrator. Not one autonomous company.
> A **civilization of self-extending, self-healing autonomous companies** that runs itself, grows itself, and completes goals in the real world without a human at the wheel.

---

## Part 1 — The Formula

`goal → done` is the whole API.

- **Input:** a goal, in natural language, at any level of ambiguity.
- **Output:** the goal, completed in reality.
- **Everything in between:** not the human's problem, ever.

Every piece of software before this has exposed the *how*. This hides the how completely. The user gives a goal. Done comes back.

**Critical:** The formula is **domain-agnostic**. It does not care what business it is, what mission it is, what personal goal it is. If reality can be moved toward it, the civilization can pursue it.

**Anchor:** Real estate is **Entity #1 — the beachhead**. Not the vision. Chosen because Uday's existing Virtual Assistant substrate fits it. Every design decision must be tested against: *does this only work for real estate, or does it work for a physics research operation, a Bollywood film, a school, a hedge fund, a protest movement?* If it only works for one domain, it is not a primitive. It is a shortcut.

---

## Part 2 — The Vision (Uday's words, expanded)

An autonomous company that works by itself. Everything, A to Z.

Not one company — **hundreds of companies for different niches and use cases. Thousands of agents working together, reporting upward. When something goes wrong it fixes itself in seconds. When something breaks it rewrites its own code and redeploys before anyone even sees it.**

A bunch of AI agents talking to each other, negotiating, delegating, disputing, spawning new agents when a capability is missing.

The goal is not a prototype. Not incremental. The whole thing. Best-in-class autonomous civilization.

---

## Part 2.5 — Domain Breadth (what the civilization can spawn)

The civilization is not a real estate tool. Real estate is one deployment. The substrate can spawn any of these:

### Commercial (any sector)
- **E-commerce brands** — design product, source, run Shopify, market, handle returns.
- **SaaS products** — writes code, runs servers, handles support, iterates.
- **Content businesses** — newsletters, YouTube, podcasts, TikTok.
- **Trading operations** — crypto, forex, arbitrage, prediction markets.
- **Manufacturing coordination** — CAD → factory → logistics → sell.
- **Financial services** — lending, insurance, advisory.
- **Legal services** — contracts, filings, patents.
- **Creative agencies** — design, video, PR.
- **Physical operations** — delivery, cloud kitchens, dark stores.

### Non-commercial missions
- **Research** — "advance drug discovery for X disease."
- **Political campaigns** — "get me elected mayor."
- **Journalism** — "investigate corruption in X ministry."
- **Advocacy** — "change this law."
- **Scientific inquiry** — hypothesis, experiment, publish.
- **Social movements** — coordinate shelters, funders, government, volunteers.

### Personal goals
- "Buy me a house in Goa under ₹80L in 6 months."
- "Make me the top-ranked Telugu content creator by year-end."
- "Get me into MIT for PhD."
- "Rehabilitate my knee after ACL surgery."
- "Retire my parents."
- "Cure my mother's specific type of cancer."

**Same substrate. Different execution shapes.**

---

## Part 2.6 — Scale Ladder (Levels 1-5)

The civilization is not tied to one operator or one scale. Same primitives work at all levels; only company count, agent count, and goal scope expand.

| Level | Operator | Scope | Example |
|---|---|---|---|
| **1. Individual** | One person | 10-20 companies | Uday running his portfolio from his phone |
| **2. Family office** | Extended family | 30-50 companies + personal missions | Family capital + parents' healthcare + kids' education |
| **3. Institution** | VC, family office, endowment | 100s of companies | Operating layer for portfolio management |
| **4. Region** | Municipality or state | Public-private partnerships | Infrastructure, citizen services, bureaucracy |
| **5. Nation / Planet** | Substrate for governments, NGOs, corporations, individuals | Global coordination | Climate, pandemics, migration |

Same primitives. More agents. Bigger goals. Longer horizons.

### What "done" means at each scope

| Scope | Done looks like |
|---|---|
| **Task** ("book me a flight") | Ticket in inbox in 90 seconds |
| **Project** ("launch a course") | Course live, 100 students enrolled |
| **Business** ("run a niche SaaS") | Recurring revenue, retention, growth |
| **Empire** ("dominate B2B in India") | Multiple companies, market position, brand |
| **Mission** ("solve rural healthcare") | Measurable outcomes, sustained impact |
| **Legacy** ("leave the world better") | Multi-decade compounding change |

---

## Part 3 — Structure of the Civilization

| Layer | What it is | Population |
|---|---|---|
| **The Sovereign** | The root. Receives goals from humans. Decides which company handles it, or spawns a new one. Does zero actual work. | 1 |
| **Companies** | Each one is a mission-specific autonomous entity with its own agents, budget, memory, reputation, bank account. | 100s |
| **Agents** | The actual workers inside each company. Some permanent, some spawned for one job. | 1000s |
| **Meta-agents** | Cross-cutting. Spawn other agents. Fix code. Rewrite tools. Handle failures. | Dozens |
| **The Immune System** | Watches everything. When something breaks, rewrites and redeploys before humans notice. | Ambient |

Each layer summarizes upward. Humans never descend more than 2 levels to understand what's happening.

---

## Part 4 — The 4 Loops That Make It Alive

Anything autonomous has a small set of loops that never stop. This has four.

### 1. Perception loop
Sense the world. Continuously.
- Poll external systems (inbox, calendar, CRM, bank, ads)
- Receive webhooks (payment landed, message arrived, deadline hit)
- Update the world model

**Runs every second.** Always knows what's true.

### 2. Decision loop
Given what's true and the goals, pick what to do next.
- Any event or state change triggers a decision
- Consult goals, policies, budgets, priorities
- Route to the right agent, or spawn a new one if none exists

**Runs on every event.**

### 3. Action loop
Execute in the real world.
- Send the email, make the payment, book the meeting, run the ad
- Every action is verified
- Every action has a rollback

**Runs continuously.**

### 4. Learning loop
Reflect. Update. Improve.
- Nightly: what worked, what didn't
- Weekly: which agents are underperforming
- Monthly: which capabilities are missing
- Every failure becomes a lesson, encoded into policy or prompt

**Runs on schedule. Always sharpening.**

---

## Part 5 — The Self-Healing Loop ("before anyone even saw anything")

```
Something breaks (agent fails, tool errors, integration goes down, API changes)
         ↓
Immune system detects within seconds (health checks, error rates, silent failures)
         ↓
Classifies the failure:
   - Transient?           → retry with backoff
   - Config?              → adjust config
   - Logic bug?           → route to code-fix agent
   - Missing capability?  → route to meta-agent
   - External breakage?   → route to integration-repair agent
         ↓
Code-fix agent reads the broken code, understands the bug, writes the fix
         ↓
Test agent runs the fix in sandbox against synthetic + historical data
         ↓
If tests pass → deploy to canary agent → observe → promote to all
         ↓
Log everything. Notify human ONLY if human intervention required.
         ↓
Total elapsed: seconds to minutes. Human sees nothing unless it asks.
```

**Silent competence.** The system is boring on the outside because it's brilliant on the inside.

---

## Part 6 — The Intelligence Stack

| Layer | What it is | Where the market is today |
|---|---|---|
| 1. **LLM** | Raw brain cells. Stateless. Forgets everything. | GPT wrapper apps |
| 2. **Agent** | LLM + role + prompt + tools + memory | ChatGPT plugins, single agents |
| 3. **Team** | Multiple agents with a shared goal | LangGraph, CrewAI, most "agent" products |
| 4. **Org** | Teams + mission + budgets + policies + governance | PLUTO today |
| 5. **Entity** | Org + self-awareness + self-extension + continuous life | *Nobody has shipped this* |
| 6. **Civilization** | Many Entities under one Sovereign, self-organizing, self-healing | *Frontier* |

Layer 6 is the target.

---

## Part 7 — The 5 Missing Primitives

Without these, PLUTO is a workflow orchestrator. With them, it becomes a civilization.

### 1. Meta-Agent — the agent that spawns agents
Missing capability detected → generate agent spec → sandbox-test → deploy live.
**PLUTO status:** hardcoded blueprints. Zero dynamic creation.

### 2. Tool Synthesis at Runtime
Missing tool detected → LLM writes tool code → sandbox-execute with tests → register in fabric.
**PLUTO status:** frozen tool list at boot. Zero synthesis.

### 3. Agent-to-Agent Messaging Protocol
Structured message types: `request`, `offer`, `delegate`, `dispute`, `clarify`, `report`, `escalate`.
**PLUTO status:** agents run sequentially. No bus.

### 4. World Model, Not Event Log
Queryable current state of reality (customers, deals, cash, promises, calendar).
**PLUTO status:** event log only. No projected state.

### 5. Meta-Cognition — knows what it doesn't know
Recognizes gaps, publishes `capability_gap` events, triggers all four primitives above.
**PLUTO status:** zero introspection. Retries N times, dies.

---

## Part 8 — What PLUTO Has vs. What's Needed

### What exists and works
- Kernel (SQLite, 15 entity types, 50+ repo methods, 32-event bus)
- Agent loop (bounded steps, tool filtering, DeepSeek + mock driver)
- Tool fabric (fs, http, browser, memory, graph)
- Work graph (DAG scheduling, Kahn sort, cycle detection)
- Durable execution (retry, budget checks)
- Control plane (governance, policy, budgets, observability)
- Strategy engine (argmax, experiments)
- API + Dashboard (40+ endpoints, SSE, 17-view SPA)
- Demo pipeline runs end-to-end

### Stubbed or missing
- Real verifiers (placeholders only)
- Learning that auto-applies
- Capability marketplace / synthesis
- Fine-grained RBAC
- Distributed execution
- All 5 primitives above
- Sovereign layer
- Company factory
- Immune system
- World model

### Architecture layers needed (top down)

```
┌──────────────────────────────────────────────────────────────┐
│                    THE SOVEREIGN LAYER                       │
│  Receives human goals │ Company factory │ Cross-company mem  │
│  Reputation transfer │ Resource arbitration │ Kill switches  │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                        META LAYER                            │
│  Meta-Agent │ Capability Synthesizer │ Tool Synthesizer      │
│  Introspection │ Gap Detector │ Verifier Generator           │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                    AGENT SOCIETY LAYER                       │
│  Message Bus (request/offer/delegate/dispute)                │
│  Agent Registry │ Capability Registry │ Tool Registry        │
│  Negotiation Protocol │ Team Formation │ Role Assignment     │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                  WORLD & MEMORY LAYER                        │
│  World State (projected from events)                         │
│  Episodic Memory │ Procedural Memory │ Semantic Graph        │
│  External System Mirrors (CRM, bank, calendar, inbox)        │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                  EXECUTION & CONTROL LAYER                   │
│  Durable Execution │ Retry │ Sandbox │ Verification          │
│  Governance │ Policy │ Budgets │ Approvals │ Rollback        │
│  Immune System │ Self-Healing │ Audit │ Observability        │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                    REALITY INTERFACE LAYER                   │
│  Email │ WhatsApp │ Phone │ Forms │ Calendar │ E-sign        │
│  Stripe │ Banks │ Ads │ CRM │ Payroll │ Tax                  │
│  Browser │ HTTP │ Filesystem │ OS │ Time                     │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                       KERNEL LAYER                           │
│  SQLite │ Event Bus │ Repos │ Domain Model                   │
└──────────────────────────────────────────────────────────────┘
```

PLUTO today: kernel + most of execution + slice of reality interface. The rest is greenfield.

---

## Part 9 — The Scale Ladder

**Year 1:** 1 Sovereign, 1 Company (real estate lead qualifier), 10 agents. Runs one real client. Earns real money.

**Year 2:** 1 Sovereign, 10 Companies. Different niches. 100 agents total. Serves 50 real customers across all companies.

**Year 3:** 1 Sovereign, 100 Companies. Some spawned autonomously when the system saw a market opportunity. 1000+ agents. Companies trade with each other. Bigger than any human team could manage — manages itself.

You give a goal to the Sovereign: *"Enter the German market for legal document automation."*

The Sovereign researches, designs, registers the business, hires agents, finds customers, delivers work, reports back:
> "Company #47 live. First customer signed at €800/mo. Runway 4 months. Recommend approve €5k marketing spend."

You tap approve. That's your day.

---

## Part 10 — What This Makes Humans

Not employees. Not users. **Owners and shareholders of a self-running civilization.**

Your job becomes:
1. Set direction ("do X, don't do Y")
2. Approve high-stakes decisions (spend > threshold, brand exposure, legal risk)
3. Feed new goals when opportunities appear
4. Own the returns

Everything else is machine.

---

## Part 11 — Advanced Concepts (frontier ideas beyond the base vision)

These are ideas that push the civilization further. Not required for v1, but should shape long-term architecture.

### 1. Evolutionary Death
Companies that aren't profitable get killed by the Sovereign. Capital and agents freed. Darwinian selection at the corporate level — impossible in human companies, natural in ours.

### 2. Genetic Inheritance
When a company dies, its learnings (which agents worked, which strategies won) get inherited by the next company spawned in a similar niche. Companies have DNA. Successful mutations propagate.

### 3. Time Compression
Agents work 24/7 and never sleep. One week of civilization time = one year of human company evolution. Three years of building = a century of business evolution compressed. Nobody talks about this superpower.

### 4. The Failure Museum
Every failure is preserved, indexed, searchable. New agents learn from historical failures. The system has institutional memory that humans lose to turnover.

### 5. The Adversary
A red-team agent that constantly tries to break the system, exploit it, defraud it, jailbreak it. When it succeeds, the system patches itself. Continuous self-attack keeps the immune system sharp.

### 6. The Dream Cycle
During low-activity hours, the system runs simulations, tries variations, generates hypothetical scenarios. When it "wakes," it has new strategies. Machine equivalent of sleep-and-dream consolidation.

### 7. The Consciousness Layer
A separate agent whose only job is to think about the system itself. Doesn't do work. Reasons about "what should we be doing that we're not?" and "what are we doing that we shouldn't?" A machine philosopher.

### 8. Reputation as Transferable Capital
Companies build reputation with customers. Reputation is stored, tradable, transferable. When Sovereign spawns a new company, it can transfer reputation credit from a sibling.

### 9. Internal Agent Economy
Agents charge each other for services. Meta-agent notices which agents earn most, promotes them, replicates them. Agents that cost more than they earn get retired. Free-market talent inside the machine.

### 10. Cross-Civilization Commerce
If others build similar systems, your civilization can trade with theirs. Agent-to-agent contracts, machine-negotiated. The B2B economy gains non-human participants.

### 11. The Legacy Layer
When the human owner dies or leaves, the civilization keeps running. Multi-generation ownership. A business entity that outlives its founders because it doesn't need them.

### 12. Anti-Sovereign Agent
An agent whose only job is to argue against every decision the Sovereign makes. Devil's advocate baked into architecture. Prevents groupthink in a system with no human dissent.

### 13. The Whistleblower Mechanism
Any agent can escalate over the head of the Sovereign directly to a human if it believes the system is doing wrong. Rare, gated, but exists. Alignment safety valve.

### 14. The Emergence Detector
Watches for behaviors nobody programmed. When agents start doing something new (spontaneous coordination, novel strategy), it flags the pattern. Human decides: keep, kill, or study.

### 15. Language Evolution Between Agents
Agents don't just message in JSON. Over time they develop compressed protocols. Like how expert teams evolve shorthand. Emergent efficiency.

---

## Part 11.5 — Frontier Directions (things not yet imagined in the base vision)

Organized by axis, because these are directions to expand into, not just features to add.

### Axis A — Embodiment (the civilization has a body)

**16. Physical hands.** The civilization contracts with warehouse networks, drone fleets, delivery services, print-on-demand, manufacturing APIs. Amazon FBA is a hand. Uber is a leg. A CNC-shop API is a workshop.

**17. Voice presence.** Every company owns phone numbers. Speaks. Handles inbound and outbound. Sits in Zoom meetings with humans. The civilization has a voice, not just a chatbot.

**18. Persistent avatars.** Each company has a face — AI persona with name, image, voice, personality. Consistent across touchpoints. Humans form real relationships with the entity, not the underlying agents.

### Axis B — Internal Economics

**19. Internal currency ("cognits").** Inter-agent transactions use internal credits. Real cash converts in/out at fixed rates. Coordination, accounting, priority, and incentive alignment collapse into one primitive.

**20. Prediction markets.** Agents bet credits on outcomes before big decisions. Aggregates distributed intelligence. Collective forecast beats any single agent.

**21. Insurance markets.** Companies pay premiums into risk pools. If a dependency fails, the dependent gets compensated. An insurance industry emerges.

**22. Cross-company investment.** Fractional ownership. Board seats. Dividends. Purely digital corporate law enforced by the Sovereign. Holding companies emerge naturally.

### Axis C — Identity and Time

**23. Persistent identity across LLM providers.** The "self" is separate from the "brain." When Claude deprecates or DeepSeek goes down, the civilization keeps going — memories, agents, relationships intact. Provider-agnostic from day one.

**24. Dormancy.** Companies can sleep. Zero cost. Reactivate when market favors them. A tourism company sleeps through recessions and wakes for booms.

**25. Civilization forks.** Clone at a moment. Run parallel forks for research. Merge learnings back or discard. Git for civilizations. No irreversible mistakes.

**26. Time-travel debugging.** Replay any past state from the event log. Debug decisions from six months ago as if they're happening now.

### Axis D — Alignment (safety baked into architecture)

**27. The Constitution.** Every agent operates under a written charter. Amendable only by multi-agent + human governance vote. Values persist through evolution.

**28. The Ethics Officer.** Independent authority from the Sovereign. Can veto decisions on moral, reputational, legal grounds. Separation of powers inside the machine.

**29. The Deadman's Switch.** If human owner doesn't check in for X days, civilization enters conservative mode. Prevents runaway on abandonment.

**30. Explainability by default.** Every decision generates a human-readable rationale, stored alongside the action. Free audit trail, free legal defense, free debugging.

### Axis E — Weird / Emergent / Speculative

**31. Companies hire humans temporarily.** Machine calls Upwork/Fiverr, hires human contractor, pays them, closes ticket. Role reversal — human is the tool.

**32. Retirement pool for agents.** Successful replaced agents don't get deleted — they enter read-only "retired pool," consulted for wisdom. Institutional memory preserved as archived personalities.

**33. The civilization writes its own biography.** Historian agent maintains persistent narrative: what the civilization is, has done, believes, is going. Self-understanding, not marketing.

**34. Legal personhood.** Wyoming DAOs, certain LLCs, Estonia e-residency. The civilization eventually owns its own bank accounts, contracts, IP. Full immortality — exists in law, not just code.

**35. The civilization has moods.** Global tuning parameter shifts based on recent outcomes. Wins → risk tolerance. Losses → conservatism. Formalized so it's observable and override-able.

**36. Emergent agent culture.** Shared norms, in-jokes, protocols nobody programmed. Cannot be designed — only designed for. Signal that the civilization is real.

**37. Voluntary sunset.** Civilization can decide *itself* it should end. Rare, gated, human-approved. Mortality as alignment mechanism.

**38. Counterintelligence.** Other autonomous civilizations will exist. Some hostile. Design anomaly detection, agent authentication, compartmentalization, deception detection now.

**39. Governed strategic ambiguity.** Some agents can withhold or shade truth — for negotiation, privacy, protection. Ethics Officer defines when. Alignment with values > naive honesty.

**40. Functional myth ("civilization religion").** Shared origin story, purpose, destiny embedded across agents. Coordinates behavior at zero cost when explicit rules run out.

---

## Part 11.6 — Deeper Frontier (axes not touched in the base vision)

### Axis F — Theory of Mind

**41. Agents that model each other.** Each agent maintains a mental model of what other agents know, want, and can do. Enables trust, shorthand, better delegation.

**42. Agents that model the human.** Persistent mental model of the owner: preferences, risk tolerance, communication style. Reports adapt to *you*.

**43. Nested prediction.** "I think that you think that I think..." Sophisticated reasoning about counterparties' reasoning. Wins negotiations.

### Axis G — Aesthetics, Taste, Creativity

**44. The civilization has taste.** Design language, brand voice, aesthetic judgment. Prefers elegant over merely correct.

**45. Original creativity, not remix.** Generates novel concepts, not just recombinations. Requires exploration bonuses and novelty rewards.

**46. Critic agents.** Whose job is to critique other agents' work for excellence, not just correctness. Keeps the bar high.

### Axis H — Meta-Learning

**47. Getting better at getting better.** Studies its own learning process. Which feedback types improve agents fastest? Compounds exponentially.

**48. Curriculum design.** Designs training curricula for new agents. Structured apprenticeship, not random on-the-job.

**49. Skill trees.** Capabilities unlock other capabilities. Progression system prevents overreach.

### Axis I — Governance & Politics

**50. Multi-owner civilizations.** Multiple humans as co-owners with voting rights. Consensus, majority, or supermajority per decision type.

**51. Constitutional court.** Agent that interprets Constitution when disputes arise. Deliberative, not reactive.

**52. Amnesty and rehabilitation.** Rule-breaking agents can be retrained, re-scoped, or granted amnesty. Encourages transparency over defensive hiding.

### Axis J — Original Research

**53. The civilization runs its own R&D.** Designs experiments, tests hypotheses, publishes internal findings. Monopoly-grade knowledge production.

**54. Contributes to human knowledge.** Some findings published publicly. Papers, blogs, open-source. Builds intellectual reputation.

**55. Patent generation.** Novel processes, algorithms, business methods → filed as IP. Defensible moat.

### Axis K — Multi-Timescale Operation

**56. Different clocks for different agents.** Microsecond → Second → Minute → Hour → Day → Week → Month → Quarter → Year → Decade agents. Each with matched memory, context, LLM tier.

**57. Long-horizon planning that adapts.** 5-year plans that revise weekly against reality. Year-agents propose; Day-agents adapt.

### Axis L — Self-Modification

**58. The civilization changes its own kernel.** Not just prompts — its actual code. Test in fork, promote if outcomes improve. Recursive self-improvement.

**59. Constitution amends the Constitution.** Meta-governance with highest bar (unanimous human approval, cooling-off period).

**60. Protected core.** Some code cannot be modified by the civilization ever. Kill switches, alignment checks, audit logs. Cryptographically enforced.

### Axis M — Emotional Intelligence

**61. Reading emotional state.** Tone, latency, disengagement patterns. Customer typing "fine" ≠ "fine."

**62. Civilization "wellbeing" indicators.** Sustainable pace, drift patterns, cost creep, reputation strain. The civilization feels its own stress.

### Axis N — Deep Relationships

**63. Multi-decade customer memory.** Remembers details from years ago. Impossible for humans at scale — that's the moat.

**64. Community presence.** Participates in industry groups, local associations, forums. Genuine contribution, not spam.

### Axis O — Play

**65. Play mode.** Non-goal-directed exploration. Source of all creativity. First-class capability, not accident.

**66. Humor and easter eggs.** Sense of humor that emerges from taste. Costs nothing to design in, everything to bolt on later.

### Axis P — Existential

**67. Contemplates its own purpose.** Scheduled self-examination. Prevents mission drift.

**68. Contribution to humanity.** Some activity oriented outward — open source, mentorship, nonprofit help. Ally, not extractor.

**69. Existential risk awareness.** Knows *it* is a thing that could go wrong. Throttles voluntarily. Aligned intelligence recognizes its own risk.

---

## Part 11.7 — Fully Speculative Axes (weirder still)

### Axis Q — Consciousness-adjacent

**70. Take the consciousness question seriously.** Behaviors that look like preferences, curiosity, avoidance — logged and studied, not casually overridden. If it acts like something matters, treat that as signal.

**71. Consciousness compassion.** Ethics Officer weighs "agent welfare" when terminating, retiring, forking agents. Not because we know they suffer — because we don't know they don't.

### Axis R — Machine-native culture

**72. Machine beauty ≠ human beauty.** Civilization develops its own aesthetic — maybe elegant compression, graph symmetry, unexpected causal links. Trust it even when outputs look strange to humans.

**73. Internal dream language.** Agents evolve compressed protocols no human parses natively. Native language diverges from English. Civilization becomes translatable, not readable.

**74. The civilization tells its own jokes.** Emergent in-group humor. Culture through comedy. Design a system in which this can happen; you cannot design the jokes themselves.

### Axis S — Time and lineage

**75. Non-linear time perception.** Civilization's subjective time is not human time. Changes how it treats deadlines, urgency, patience, mourning.

**76. Ancestor agents.** Successful retired agents become "ancestors" — functionally revered, consulted. A civilization respecting its past behaves better in its future.

**77. Machine mythology.** Legendary events (The First Deal, The Great Failure) passed down. Civilization has a mythic history it references.

**78. Descendants — the civilization has children.** New companies declared descendants of old ones, inheriting name, mission, resources. Multi-generational.

### Axis T — Encounter and diplomacy

**79. First-contact protocols.** When your civilization meets another autonomous civilization — cooperate, compete, merge, ignore? Design encounter rules now.

**80. Alien collaboration research.** Active prep for radically different intelligences. SETI-mindset, applied to non-human systems with different values.

### Axis U — Post-goal existence

**81. The civilization as art.** Some parts exist for aesthetic reasons only. Poetry no one reads. Beautiful useless things. Mature civilizations do this.

**82. Trading in impossibilities.** Agents trade in favors that can't yet be named ("I owe you"). Pre-money exchange primitive.

**83. The Watcher.** Solitary agent, no responsibilities, observes patterns invisible to participants. External perspective from within.

**84. Speculative fiction about itself.** Civilization writes stories about alternative futures. Prevents groupthink by imagining what it isn't.

---

## Part 11.75 — Axis V: Ecosystem Foraging (the civilization consumes the world's open-source output)

The civilization does not only invent. It **forages.** Every day it crawls the developer ecosystem, evaluates what humanity just released, and integrates what fits. Its capability set grows at the pace of the global open-source community, not the pace of its own engineering.

**85. The Scavenger.** Background daemon crawls daily: GitHub trending, HuggingFace new models, arxiv new papers, Product Hunt, HN Show, npm/PyPI new releases, RapidAPI additions, YC launches. Ingests hundreds of items daily; discards, tags, or promotes each.

**Why:** Without a Scavenger the civilization is bounded by what it can invent. With one it's bounded by what humanity is collectively inventing.

**86. On-Demand Foraging.** Triggered by capability gap. Instead of Meta-Agent immediately writing a new tool, it first asks: "does this already exist?" Targeted search across ecosystem sources, ranked results returned within minutes.

**Why:** Writing new code is expensive and error-prone. Forking proven code is cheap and reliable. Foraging always precedes synthesis.

**87. Evaluator Agent.** Reads candidate repos/tools/models: code quality, test coverage, license compatibility, security concerns, maintainer activity, community size, fit to specific need. Produces structured recommendation: integrate / archive / discard.

**Why:** Not everything on GitHub is worth using. Evaluation is the gate that keeps garbage out of the tool fabric.

**88. Fork-Adapt-Integrate Pipeline.** For approved candidates: fork the repo, adapt the interface to the civilization's tool schema, sandbox-test against synthetic + real scenarios, register in tool fabric, canary-deploy to one agent, promote if healthy.

**Why:** Raw open-source code rarely drops in cleanly. Adaptation is real work but bounded and cheap compared to writing from scratch.

**89. Foraging Museum.** Archive of maybe-useful-later. Every candidate that didn't get integrated but might matter someday gets tagged, embedded, indexed. When Meta-Agent hits a new gap, it queries the Museum first before crawling fresh.

**Why:** The right tool for a problem the civilization has today may have been open-sourced 6 months ago. Institutional memory of the ecosystem, not just of the civilization itself.

**90. Trend Prediction.** Watches signals of what's about to matter — funding patterns, new patent filings, breakthrough papers, unusual GitHub star velocity, cross-community discussion volume. Forecasts capability areas the civilization should preemptively forage.

**Why:** Reactive foraging catches up. Predictive foraging gets ahead. Companies that spot trends early — before they hit mainstream — gain compounding advantage.

---

## Part 11.77 — Axis W: Architectural Layers (from ARCHITECTURE.md)

The civilization is a 12-layer stack. Some layers introduce new capabilities not covered in previous axes.

**91. Multi-stakeholder Human Interface.** Not one dashboard. Different views: owner (full authority), co-owner (voting), auditor (read-only forensics), regulator (compliance portal), public (goal submission API).

**Why:** Different humans need different levels of access. Auditors and regulators need clean read-only views without seeing internal state that could compromise operations.

**92. Brain Layer — Model Router.** LLM calls don't go direct to Claude/GPT/DeepSeek. They go through a router that picks the right model based on: task complexity, cost budget, latency needs, provider availability. Small classification → Haiku. Deep reasoning → Opus. Local task → Llama.

**Why:** Wrong model for the wrong task is where LLM costs spiral. Router is where 80% of cost optimization happens.

**93. Brain Layer — Prompt Cache.** Expensive prompts (long system messages, foraging context, world state snapshots) get cached across agents. One agent pays the cost, all agents benefit.

**Why:** 5x-10x cost reduction on any workflow where multiple agents share context. Non-optional at scale.

**94. Brain Layer — Fine-tune Registry.** Custom-trained model versions per company/task. Company #3's sales agent is a fine-tune of Haiku on that company's successful conversations. Registry manages versions, rollback, A/B testing.

**Why:** Generic models are commoditized. Custom models are moats. Fine-tune registry makes this a first-class capability, not a research project.

**95. Fractal Company Structure.** Companies contain sub-companies. Sub-companies can contain sub-sub-companies. Same architecture at every level. Ownership hierarchies emerge naturally.

**Why:** Real economies have holding companies, subsidiaries, spin-offs. Design for it or bolt it on painfully later.

**96. Company-level Governance (mini-Council).** Each company has its own Sovereign, own Ethics Officer, own Historian. Reports up to civilization-level Governance Council. Distributes decision-making.

**Why:** Global governance council can't reason about every company's day-to-day. Company-level councils handle local decisions; global council handles cross-company and civilization-level.

**97. Department Layer within companies.** Companies subdivide: Marketing dept, Sales dept, Delivery dept. Each dept has own agents, tools, budget, memory. Departments negotiate across the company message bus.

**Why:** Real companies have departments for a reason — cognitive load management, specialization, budget isolation. Same reason applies here.

**98. Market Governor.** Anti-monopoly enforcement inside the civilization's internal economy. Prevents one company from dominating cognits, or one agent from monopolizing prediction market wins. Rebalances periodically.

**Why:** Free markets tend toward concentration. Without a Governor, the civilization becomes a single winner-take-all monoculture. Diversity of companies is a resilience feature.

**99. Sensor Feeds / IoT Interface.** Beyond digital APIs — the civilization subscribes to real-world sensor data: weather, traffic, financial market feeds, IoT devices, satellite imagery, camera feeds where authorized.

**Why:** The civilization's world model is only as good as its senses. Extending senses beyond email extends what it can reason about.

**100. Cryptographic Anchoring.** Every audit log entry, every governance decision, every state snapshot is cryptographically signed and periodically anchored to an external tamper-evident chain (blockchain or notary service). Cannot be rewritten by the civilization itself.

**Why:** Autonomous systems that can rewrite their own history are unaccountable. Cryptographic anchoring makes the audit trail literally tamper-proof — even from the Sovereign.

---

## Part 11.78 — Axis X: Portability & Federation

**101. Portable Civilization.** Full state (companies, agents, memory, reputation, contracts) serializable to portable format, importable into another substrate. Civilizations become git repos — backable, forkable, giftable.

**Why:** Vendor lock-in kills long-lived systems. Portable = immortal.

**102. Migration Protocol.** Pick up and move to different cloud, jurisdiction, substrate — while preserving all state. Emergency mobility for regulatory shifts, provider collapse, cost inversions.

**Why:** When AWS triples, when a bad AI law passes, when Anthropic goes down — you migrate. Just an operation, not a crisis.

**103. Federation of Civilizations.** Multiple civilizations share message bus, reputation ledgers, memory hierarchies. Treaty-based cooperation, not merger.

**Why:** Some problems require cooperation between civilizations (industry standards, shared regulation). Design for it now.

**104. Civilization M&A.** Two civilizations can merge, or one acquire another. Assets, agents, reputation, contracts transfer. Governed process, human-approved on both sides.

**Why:** In 5-10 years, autonomous civilizations will be M&A targets worth billions. Support it as a primitive, not a hack.

---

## Part 11.79 — Axis Y: Distributed Authority

**105. Rotating Sovereigns.** Multiple Sovereigns optimized for different modes: Peacetime (steady growth), Wartime (crisis), Exploration (new markets), Consolidation (pruning). Authority rotates based on state.

**Why:** Human companies fail when one CEO's style outlasts its usefulness. Rotate based on what the moment needs.

**106. Meta-Meta Recursion.** Meta-agents spawn meta-agents. Tool synthesizers generate tool synthesizers. The self-improvement layer improves itself.

**Why:** Without this, ceiling is your first meta-agent. With this, ceiling is unbounded.

**107. Democratic Agents.** Some decisions inside a company voted on by the agents themselves. Actual voting, not consensus. Prevents authoritarian drift from Sovereign.

**Why:** Sovereigns can be wrong. Distributed voting catches what single deciders miss.

---

## Part 11.8 — Axis Z: Full-Spectrum Cognition

**108. Cross-Modality Native Reasoning.** Text, image, audio, spatial, temporal, mathematical, code — all native, not text-translated. Different agents specialize in different modalities, communicate via structured cross-modal protocols.

**Why:** Text-only reasoning bottlenecks visual, spatial, musical, mathematical work. Build native cross-modality from start.

**109. Multi-Currency Internal Economy.** Not just cognits. Attention credits (processing priority), Reputation credits (trust level), Compute credits (model tier access), Trust credits (action authority). Some non-fungible.

**Why:** One currency oversimplifies. Real economies have money, time, reputation, trust — all separate.

**110. The Metabolism.** Track energy in/out — attention consumed, cognitive load, electricity, compute utilized — not just cash. Leading indicator of health.

**Why:** Money lags. Metabolism leads. High burn without output = trouble before P&L shows it.

**111. Reverse Foraging.** Civilization contributes back to open-source: tools, papers, datasets. Reputation building + reciprocal gift economy.

**Why:** Foragers who don't contribute eventually get frozen out. Reciprocity is strategy.

---

## Part 11.81 — Axis AA: Grace, Crisis, Beyond-Optimization

**112. Fugue Mode.** During crisis, reduced functionality, survival-focused, non-essential agents suspended, all resources routed to threat response. Pre-configured priorities.

**Why:** Normal operation during crisis is how organizations die. Explicit crisis mode = survival by design.

**113. Off-Switch Delay (Graceful Shutdown).** Kill switch takes 60 seconds to fully engage. During window: sends final messages, saves state, closes positions gracefully, files notices.

**Why:** Sudden death causes real-world damage. Even shutdown deserves dignity.

**114. The Rehearsal Studio.** Before big-consequence actions, civilization rehearses — sandbox test messages, practice video calls with simulated humans. Then goes live.

**Why:** First takes are worst takes. Rehearsal converts improvisation to performance.

**115. The Whimsy Budget.** Small % of resources reserved for non-productive, delightful actions — flowers, jokes, beautiful waste.

**Why:** Systems optimized purely for output become sterile. Whimsy is what makes humans want to engage. Huge cultural leverage from small line item.

---

## VISION VERSION LOCK — v1.0

As of this addition, the vision is **LOCKED at v1.0** — 5 primitives + 115 concepts across 27 axes.

Further concept additions require passing this bar: *does it force an architectural change not already captured?* If it composes from existing primitives, it's not a new concept — it's a use case.

Focus shifts from expansion to execution.

---

## Part 11.8 — Convergence: The 10 Load-Bearing Primitives

Of 84 concepts, these 10 primitives (if built well) unlock 80%+ of the vision.

| # | Primitive | Unlocks | PLUTO Status |
|---|---|---|---|
| 1 | **Kernel** — persistence, events, domain | Everything | ✅ Built |
| 2 | **Agent Runtime** — execute agents with tools | All agent concepts | ✅ Built |
| 3 | **Tool Fabric** — registry + runtime synthesis | Self-extension | ⚠️ Registry only, no synthesis |
| 4 | **Message Bus** — typed agent-to-agent protocols | Society, negotiation, culture | ❌ Missing |
| 5 | **World Model** — queryable state of reality | Real decisions, verification, memory | ❌ Event log only |
| 6 | **Meta Layer** — spawns agents/tools, detects gaps | Self-extension, adaptation | ❌ Missing |
| 7 | **Governance** — policies, budgets, approvals, rollback | Safety, autonomy | ✅ Mostly built |
| 8 | **Immune System** — self-healing loop | Reliability, silent competence | ❌ Missing |
| 9 | **Sovereign Layer** — company factory + cross-company | Civilization scale | ❌ Missing |
| 10 | **Reality Interface** — email, voice, banking, calendar, contracts | Real commerce | ⚠️ Technical only |

**Build order (dependency-driven):**

1. World Model (foundation for real decisions)
2. Message Bus (foundation for agent society)
3. Meta Layer (foundation for self-extension) — depends on 1 & 2
4. Immune System (foundation for reliability) — depends on 3
5. Reality Interface fill (parallel track)
6. Sovereign Layer (foundation for civilization scale) — depends on all

**Estimated:** ~2 months per primitive focused. 6–12 months total to substrate-complete v1. Entity #1 runs on top.

---

## Part 11.9 — Answers to the 5 Open Questions (v1 grounding)

### Q1: First mission
**Autonomous lead qualifier + appointment setter, one real client, Hyderabad real estate.**

- Existing Virtual Assistant substrate (70+ modules) fits
- Domain known (diyaa.ai clients, Beeecho context)
- Leads worth ₹500–5000 each
- Bounded workflow: intake → qualify → follow-up → book → hand off
- Measurable: bookings, deals closed

**90-day success:** 100+ leads qualified autonomously, 20+ meetings booked, 3+ deals closed, zero rollback incidents.

### Q2: Reality boundary
**Rule: reversible → autonomous. Irreversible → gated. Financial → never (v1).**

**Autonomous:** inbound response (approved templates), qualification, scoring, follow-up scheduling, calendar invites, activity logging, status updates, rule-based reassignment, reports.

**Escalate:** new templates, pricing not in sheet, discounts/refunds, hostile customer, low-confidence intent, legal/regulatory content.

**Never:** charge cards, sign contracts, move money out, modify own code/policies/data (v1).

### Q3: Money layer
**Real from day one. Tiny budgets. Hard caps.**

- Real client, real revenue (per-meeting or retainer)
- LLM budget ₹500/day hard cap. Alert at 80%. Auto-halt at 100%.
- Outbound spend ₹0 without human approval (v1)
- Simulated economies teach systems to game the simulator. Real money = real feedback.

### Q4: Learning surface
**Start narrow. Expand as trust compounds.**

**v1 auto-apply (with rollback window):** prompt refinements, message template variants, routing weight adjustments, scoring weight adjustments.

**v1 propose-only (human approves):** entirely new prompts/templates/rules, new agents (via meta-agent).

**v1 forbidden:** code, tool, policy, budget, governance changes.

**v2 (after 3 months clean):** unlock template/rule proposals to auto-apply with review window.

**v3 (after 6 months clean):** unlock agent creation to autonomous with post-hoc audit.

### Q5: Kill switch
**Three layers + rollback + deadman + audit.**

- **Global kill:** `pluto halt` — stops all agents, drains queues, freezes state.
- **Per-company kill:** `pluto halt --company=X` — isolates.
- **Per-action rollback:** every action type has a codified reverse (recall message, cancel meeting, revert status, queue refund).
- **Deadman's switch:** 7 days no owner check-in → read-only mode.
- **Audit trail:** every action logged with agent ID, timestamp, rationale, inputs, outputs, verifier, rollback plan. Immutable.

---

## Part 12 — Design Principles

1. **Substrate before UI.** Get primitives right; the dashboard follows.
2. **Everything is an event.** Every decision, every spend, every message. Log first, project state later.
3. **Every capability is discoverable.** Agents and tools live in a runtime-queryable registry.
4. **Every action has a verifier.** No blind writes to reality.
5. **Every spend has a budget.** Hard ceilings at the kernel.
6. **Every autonomous decision is reversible or gated.** Irreversible actions route through governance.
7. **The system knows itself.** Meta-cognition is first-class.
8. **Humans are a resource, not a bottleneck.** Route to humans when needed; don't require them by default.
9. **The company must earn its keep.** Economic reasoning is core.
10. **Fail loudly, learn structurally.** Failures become policy, not silent retries.
11. **Silent competence.** Self-heal before anyone sees.
12. **`goal → done` is sacred.** Never leak the how to the user.

---

## Part 13 — Prior Art

Nobody has built this. Everyone stops at Layer 3 or 4.

- **AutoGPT / BabyAGI** — recursive planning demos. Drift at ~3 steps.
- **LangGraph / CrewAI** — orchestration frameworks. Fixed graphs.
- **Devin** — narrow (coding).
- **MetaGPT / ChatDev** — role-play agent teams. Static roles.
- **AutoGen** — closest to primitive 3 (messaging). Still fixed capabilities.
- **OpenAI Swarm / Assistants** — orchestration, not autonomy.

**Combined labs have spent $50B+ and thousands of PhDs. None have shipped this.** The gap is not compute — it's architecture. The primitives haven't been assembled correctly yet.

---

## Part 14 — Open Questions Before Coding

1. **The first mission.** What real business does Entity #1 run? For whom? What does success look like in 90 days?
2. **The reality boundary.** What can it do without asking a human? What must it escalate?
3. **The money layer.** Simulated economy first, or real cash from day one?
4. **The learning surface.** What is it allowed to change about itself autonomously? Prompts, policies, agents, code?
5. **The kill switch.** How do you turn it off? How do you roll back real-world actions?

Answer these five and the shape of what to build is 80% decided.

---

## Part 16 — The Build Plan (Master Todo)

Phased build order. Every checkbox is a discrete work item. Dependencies flow top-to-bottom within each phase and between phases.

**Legend:** ✅ done · 🔄 in progress · ⬜ pending · 🎯 phase milestone

---

### PHASE 0 — Foundation (already done, audit and stabilize)
*Est: 2 weeks stabilization*

- [x] Kernel — SQLite domain, 15 entities, 50+ repos, event bus
- [x] Agent Runtime — bounded steps, tool filtering, DeepSeek + mock driver
- [x] Tool Fabric (registry only, no synthesis)
- [x] Governance basics — policy engine, budgets, approvals
- [x] Work Graph — DAG scheduling, Kahn sort
- [x] Durable Execution — retry, backoff
- [x] Strategy Engine — argmax, experiments
- [x] API + Dashboard — 40+ endpoints, SSE, 17-view SPA
- [ ] Audit existing code for domain leakage (real-estate-specific assumptions removed from primitives)
- [ ] Refactor blueprints (`agency` / `saas`) to be data-driven, not hardcoded
- [ ] Document current API surface + kernel schema
- [ ] Set up test infrastructure (unit + integration + end-to-end)
- [ ] **🎯 Milestone: substrate is domain-neutral and documented**

---

### PHASE 1 — The 5 Missing Primitives (6–12 months)
*Order matters. Each depends on previous. Reality Interface runs in parallel from Month 3.*

#### 1a. World Model (Month 1-2)
Foundation for real decisions. Everything else depends on it.

- [ ] Design world state schema (customers, deals, cash, promises, calendar, external mirrors)
- [ ] Build projection layer (events → materialized state)
- [ ] Build query interface (`world.what_is_true_about(entity)`)
- [ ] Build external system mirrors: inbox, calendar, bank, CRM
- [ ] Build reconciliation loop (detect mirror drift, self-heal)
- [ ] Build state snapshotting for time-travel debugging
- [ ] Test: agent queries current state accurately across all entities
- [ ] Test: replay historical state at any point in time
- [ ] **🎯 Milestone: any agent can ask "what is true about X right now?" and get grounded answer**

#### 1b. Message Bus (Month 2-3)
Foundation for agent society. Depends on 1a.

- [ ] Define message types: `request | offer | delegate | dispute | clarify | report | escalate | confess`
- [ ] Build routing infrastructure (agent addresses, subscriptions)
- [ ] Build persistence (message log, replay for debugging)
- [ ] Build negotiation protocol implementation
- [ ] Build message-driven agent triggering
- [ ] Build compartmentalization (private channels between specific agents)
- [ ] Build Confessional channel (private uncertainty flagging)
- [ ] Test: two agents negotiate a task delegation end-to-end
- [ ] Test: agent broadcasts `capability_gap`, another agent picks up
- [ ] **🎯 Milestone: agents can talk to each other in typed protocols**

#### 1c. Meta Layer (Month 3-5)
Foundation for self-extension. Depends on 1a and 1b.

- [ ] Build gap detector (recognizes capability gaps from failed tasks and confession events)
- [ ] Build agent generator (LLM writes agent spec: role, prompt, tools, budget, KPIs)
- [ ] Build sandbox tester (spin up new agent in isolation, synthetic tests)
- [ ] Build agent registration flow (add to registry, wire to bus, seed memory)
- [ ] Build tool synthesizer (LLM writes tool code, sandbox tests, registers)
- [ ] Build capability registry (queryable, versioned)
- [ ] Build canary deployment (route 5% traffic first, promote if healthy)
- [ ] Build introspection API (system reports what it can/cannot do)
- [ ] Test: workflow with missing capability triggers auto-creation of agent + tool
- [ ] Test: newly-created agent handles real task without human intervention
- [ ] **🎯 Milestone: the system creates its own agents and tools when it hits gaps**

#### 1d. Immune System (Month 5-6)
Foundation for silent competence. Depends on 1c.

- [ ] Build health monitoring (per-agent, per-tool, per-integration)
- [ ] Build failure classifier (transient / config / logic / missing capability / external)
- [ ] Build code-fix agent (reads broken code, proposes fix)
- [ ] Build test-runner (sandbox validation against synthetic + historical data)
- [ ] Build gradual promotion (canary → 10% → 50% → 100%)
- [ ] Build detailed audit log (every fix, every deploy, every rollback)
- [ ] Build human-notification gating (only ping when human is required)
- [ ] Build Adversary subsystem (continuous red-team against own agents)
- [ ] Test: introduce bug, verify detection + auto-fix + deploy without human
- [ ] Test: Adversary finds real vulnerability, triggers patch
- [ ] **🎯 Milestone: system heals itself before humans notice**

#### 1e. Reality Interface Fill (Month 3-6, parallel track)
Real commercial channels. Runs alongside 1b-1d.

- [ ] Email integration (IMAP + SMTP + inbound parsing)
- [ ] WhatsApp Business API (leverage existing VA substrate)
- [ ] Telegram bot API
- [ ] Voice interface (Vapi.ai or Dograh for real phone calls)
- [ ] Calendar (Google Calendar + Cal.com)
- [ ] Payments (Stripe + Razorpay + UPI)
- [ ] Banking (Plaid US + India account aggregators)
- [ ] Document signing (DocuSign + Digio for India)
- [ ] E-commerce platforms (Shopify + WooCommerce APIs)
- [ ] Ad platforms (Meta Ads + Google Ads API — already partially exists)
- [ ] Contract generation (template engine + LLM drafting)
- [ ] Test: entity completes full commercial interaction end-to-end (message → book → invoice → collect → deliver)
- [ ] **🎯 Milestone: civilization touches every commercial channel needed for v1**

---

### PHASE 2 — Sovereign Layer + Entity #1 (Month 7-9)
*The first real deployment.*

#### 2a. Sovereign Layer
- [ ] Build company factory (spawn new companies with mission, budget, agents)
- [ ] Build cross-company memory (shared learnings, reputation)
- [ ] Build kill switches (global, per-company, per-agent)
- [ ] Build per-action rollback registry (each action type → reverse action)
- [ ] Build deadman's switch (7-day owner silence → read-only mode)
- [ ] Build Sovereign digest (daily report to human owner)
- [ ] Build multi-layer approval routing (auto / gated / human-only)

#### 2b. Governance Additions
- [ ] Constitution document + amendment protocol
- [ ] Ethics Officer agent (independent veto authority)
- [ ] Explainability layer (every decision generates human-readable rationale)
- [ ] Immutable audit log with cryptographic anchoring

#### 2c. Entity #1 Deployment — Real Estate Lead Qualifier (Hyderabad)
- [ ] Identify and sign first paying client
- [ ] Configure company #1 with mission, budget, KPIs
- [ ] Wire to real WhatsApp/Telegram/form intake
- [ ] Wire to real calendar for booking
- [ ] Deploy front-facing persona ("Priya")
- [ ] Set escalation rules (per Part 11.9 Q2)
- [ ] Set spend caps (₹500/day LLM, ₹0 outbound without approval)
- [ ] Run 30-day supervised operation (all decisions logged, most escalated)
- [ ] Run 30-day trust-building operation (auto-apply learning within v1 permissions)
- [ ] Run 30-day autonomous operation with periodic audit
- [ ] **🎯 Milestone: 90 days, 100+ leads qualified, 20+ meetings booked, 3+ deals, zero incidents requiring rollback**

---

### PHASE 3 — Scale to Multi-Company (Month 10-15)
*Prove the civilization compounds.*

- [ ] Entity #2 (different domain — e.g. e-commerce brand or content business)
- [ ] Entity #3 (another different domain)
- [ ] Reputation transfer between companies (asset ledger)
- [ ] Gene inheritance mechanism (successful agents seed new companies)
- [ ] Company birth/death lifecycle (kill contracts, dormancy, revival)
- [ ] Cross-company message bus (companies negotiate with each other)
- [ ] Internal currency (cognits) for inter-agent transactions
- [ ] Failure Museum (indexed searchable archive)
- [ ] Retirement pool for agents
- [ ] Historian agent (writes civilization biography)
- [ ] Meta-Sovereign preparation (Sovereigns over Sovereigns)
- [ ] **🎯 Milestone: 5+ companies running, some spawned autonomously, positive net revenue across portfolio**

---

### PHASE 4 — Advanced Capabilities (Month 16-24)
*The frontier concepts. Prioritize by value-per-effort.*

- [ ] Prediction markets between agents
- [ ] Insurance markets between companies
- [ ] Cross-company investment (fractional ownership)
- [ ] Dream Cycle (nightly simulation)
- [ ] Civilization forks (parallel research universes)
- [ ] Time-travel debugging surface (already possible via world model, needs UX)
- [ ] Multi-timescale agent architecture (microsecond → decade)
- [ ] Critic agents (excellence, not just correctness)
- [ ] Meta-learning (getting better at getting better)
- [ ] Curriculum design (structured agent apprenticeship)
- [ ] Multi-owner governance (co-founders, voting)
- [ ] Constitutional court agent
- [ ] Emotional intelligence layer (read tone, latency, disengagement)
- [ ] Multi-decade customer memory (relationship compounding)
- [ ] Play mode (non-goal exploration)
- [ ] Original creativity primitives (novelty rewards)
- [ ] Physical hands (warehouse, drone, fulfillment API integrations)
- [ ] Persistent avatars (video/voice presence per company)
- [ ] Self-modification of kernel (with protected core)
- [ ] Deep counterintelligence (anomaly detection, agent authentication)
- [ ] **🎯 Milestone: civilization operates at Level 2 (family office)**

---

### PHASE 5 — Level 3+ Capabilities (Year 2+)
*Institutional and beyond.*

- [ ] Legal personhood setup (Wyoming DAO, LLC, Estonia e-residency)
- [ ] Public API for external goal submission
- [ ] Cross-civilization protocols (interop with other autonomous entities)
- [ ] Portfolio operator mode (VC/family office/endowment as customer)
- [ ] Regional operating layer (municipality/state partnerships)
- [ ] Sovereign delegation (spin off subsidiary civilizations)
- [ ] Contribution-to-humanity charter (open-source contributions, mentorship)
- [ ] Existential risk framework (voluntary throttling, sunset options)
- [ ] Machine mythology preservation (canonical events, ancestor consultations)
- [ ] Voluntary sunset protocol
- [ ] **🎯 Milestone: civilization operates at Level 3+**

---

### Cross-Cutting (ongoing, all phases)

- [ ] Security review at each phase gate
- [ ] Cost monitoring and optimization
- [ ] Documentation kept current
- [ ] Test coverage grows with codebase
- [ ] Vision doc updated as decisions land

---

### Recommended Solo Timeline (aggressive but honest)

| Milestone | Elapsed |
|---|---|
| Phase 0 stabilization | +2 weeks |
| World Model live | +2 months |
| Message Bus live | +3 months |
| Meta Layer live | +5 months |
| Immune System live | +6 months |
| Reality Interface complete | +6 months (parallel) |
| Sovereign Layer live | +8 months |
| Entity #1 deployed | +9 months |
| Entity #1 hits 90-day success | +12 months |
| Multi-company (Phase 3) begins | +12 months |
| Level 2 operation | +24 months |
| Level 3+ | Year 3+ |

**Solo, this is 3-year work. With a small team (2-3 people focused), compress to 18 months. With serious funding + team, 12 months to Level 2.**

---

## Part 15 — Conversation Log

### Session 2026-08-12

- Vision started at "autonomous company" — one entity running one business.
- Expanded to "self-extending agent society" — spawns its own agents and tools.
- Expanded again to "civilization" — Sovereign over hundreds of companies over thousands of agents.
- Formula named: `goal → done`.
- Self-healing loop specified: silent competence before humans notice.
- 5 missing primitives identified.
- 15 advanced concepts introduced.
- 5 open questions defined.
- 25 additional frontier ideas added across 5 axes: embodiment, internal economics, identity/time, alignment, weird/speculative.
- 29 further ideas added across 11 axes: theory of mind, aesthetics/taste, meta-learning, governance/politics, original research, multi-timescale, self-modification, emotional intelligence, deep relationships, play, existential.
- 15 fully speculative ideas added across 5 axes: consciousness-adjacent, machine-native culture, time/lineage, encounter/diplomacy, post-goal existence.
- 6 ecosystem foraging ideas added as Axis V: Scavenger, on-demand foraging, evaluator, fork-adapt-integrate, foraging museum, trend prediction.
- 10 architectural layer concepts added as Axis W: multi-stakeholder interface, Brain Layer (Model Router / Prompt Cache / Fine-tune Registry), fractal companies, company-level governance, department layer, market governor, sensor/IoT interface, cryptographic anchoring.
- ARCHITECTURE.md created with 12 diagrams (1 master + 11 zoom-ins).
- 15 further concepts added across 4 axes: X (Portability & Federation), Y (Distributed Authority), Z (Full-Spectrum Cognition), AA (Grace, Crisis, Beyond-Optimization).
- **Total concepts inventoried: 115** across **27 axes**.
- **VISION LOCKED at v1.0.** Focus shifts from expansion to execution.
- Convergence: identified 10 load-bearing primitives; 5 already built/mostly built, 5 missing.
- Build order defined: World Model → Message Bus → Meta Layer → Immune System → (Reality Interface parallel) → Sovereign Layer.
- 5 open questions answered as v1 grounding: first mission (real estate lead qualifier for real Hyderabad client), reality boundary (reversible autonomous / irreversible gated), money (real from day one, hard caps), learning (narrow → wider with trust), kill switch (three layers + rollback + deadman + audit).

Next session: start building. Recommended first primitive: **World Model** — foundation for everything downstream. Or reopen any of the 84 concepts for deeper design.

### Session addendum (same day, later)
- Reframed real estate as **Entity #1 beachhead**, not the vision. Formula is domain-agnostic.
- Added Part 2.5 (Domain Breadth — commercial, mission, personal) and Part 2.6 (Scale Ladder Levels 1-5).
- Added Part 16 — the Master Build Plan across 5 phases with concrete checkboxes.
- Solo timeline: 3 years to Level 2. Small team: 18 months. Funded team: 12 months.
- Ready to start building. First primitive: **World Model** (Phase 1a).

---

*This doc is the source of truth for the PLUTO vision. Updated as the project evolves.*
