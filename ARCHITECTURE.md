# PLUTO — Architecture Diagrams

> Companion to `VISION.md` (what/why) and `PLAN.md` (how/when).
> This doc is the **visual reference** — every layer of the civilization drawn top-to-bottom.
> 12 diagrams: 1 master + 11 zoom-ins.

---

## Diagram 1: Full Runtime Flow (macro)

```
                            HUMAN (You)
                                │
                          "goal → done"
                                │
                                ↓
                     ┌──────────────────┐
                     │    SOVEREIGN     │
                     │  receives goals  │
                     │  routes/spawns   │
                     └──────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │Company #1│      │Company #2│      │Company #N│
        │real est. │      │ ecomm    │      │ SaaS     │
        └──────────┘      └──────────┘      └──────────┘
              │                 │                 │
        ┌─────┼─────┐     ┌─────┼─────┐     ┌─────┼─────┐
        ↓     ↓     ↓     ↓     ↓     ↓     ↓     ↓     ↓
       [A]   [A]   [A]   [A]   [A]   [A]   [A]   [A]   [A]
       agents            agents            agents
        │     │     │     │     │     │     │     │     │
        └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                                │
                                ↓
                     ┌──────────────────┐
                     │   MESSAGE BUS    │
                     │ agent-to-agent   │
                     │ request/offer/   │
                     │ delegate/dispute │
                     └──────────────────┘
                                │
     ┌─────────┬──────────┬─────┼─────┬──────────┬─────────┐
     ↓         ↓          ↓     ↓     ↓          ↓         ↓
  ┌──────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌───────┐ ┌────────┐
  │ META │ │FORAGE │ │ IMMUNE │ │ WORLD │ │GOVERN │ │ETHICS  │
  │LAYER │ │LAYER  │ │SYSTEM  │ │ MODEL │ │+BUDGET│ │OFFICER │
  └──────┘ └───────┘ └────────┘ └───────┘ └───────┘ └────────┘
     │         │          │         │         │          │
   spawns   consumes    heals    tracks    gates      vetoes
   agents+  github,     failures reality   actions    unethical
   tools    arxiv, HN                                 actions
     │         │          │         │         │          │
     └─────────┴──────┬───┴─────────┴─────────┴──────────┘
                      ↓
                ┌──────────────┐
                │ TOOL FABRIC  │
                │  registry    │
                │  + synthesis │
                └──────────────┘
                      │
                      ↓
        ┌────────────────────────────┐
        │  REALITY INTERFACE LAYER   │
        └────────────────────────────┘
                      │
   ┌──────┬─────┬─────┼─────┬──────┬────────┬──────┐
   ↓      ↓     ↓     ↓     ↓      ↓        ↓      ↓
 Email  WApp  Voice  Cal  Bank  Contract  Ads    CRM
                      │
                      ↓
              ═══════════════════
                 THE REAL WORLD
              customers · money ·
              calendars · contracts
              ═══════════════════
                      │
                [events flow up]
                      │
                      ↓
                ┌──────────────┐
                │    KERNEL    │
                │  event log + │
                │  SQLite +    │
                │  world state │
                └──────────────┘
                      │
                      ↓
             [learning feeds all layers]
```

---

## Diagram 2: One Goal → Done (runtime flow)

```
              "grow ecommerce brand ₹5L → ₹20L"
                              │
                              ↓
                       SOVEREIGN receives
                              │
                              ↓
                       Decompose into
                       sub-goals
                              │
             ┌────────────────┼────────────────┐
             ↓                ↓                ↓
        Marketing         Supply          Retention
         scale-up         chain            program
             │                │                │
             ↓                ↓                ↓
      Assign to        Assign to        Assign to
      Company #12      Company #12b     Company #12c
      (existing)       (spawn new)      (spawn new)
             │                │                │
             ↓                ↓                ↓
      Agents work      Agents work      Agents work
      in parallel      in parallel      in parallel
             │                │                │
             ↓                ↓                ↓
      Send email,      Contact new      Design loyalty
      run ads,         suppliers,       program, send
      A/B test         negotiate,       campaigns
                       sign contracts
             │                │                │
             ↓                ↓                ↓
      Every action:  Every action:    Every action:
      ┌──────────┐   ┌──────────┐    ┌──────────┐
      │ GOVERN?  │   │ GOVERN?  │    │ GOVERN?  │
      │ VERIFY?  │   │ VERIFY?  │    │ VERIFY?  │
      │ ROLLBACK?│   │ ROLLBACK?│    │ ROLLBACK?│
      └──────────┘   └──────────┘    └──────────┘
             │                │                │
             └────────────────┼────────────────┘
                              ↓
                        REALITY (real ads
                        run, real emails
                        sent, real orders
                        received)
                              │
                              ↓
                        World model
                        updated
                              │
                              ↓
                        Progress toward
                        goal measured
                              │
                              ↓
                    ┌─────────────────┐
                    │ Nightly report  │
                    │ to you: "Month 4│
                    │ tracking ₹18L,  │
                    │ 89% of target"  │
                    └─────────────────┘
```

---

## Diagram 3: Self-Extension Loop

```
                  AGENT HITS A GAP
                         │
                         ↓
              "I lack capability X"
                         │
                         ↓
                Publishes on Confessional
                (message bus)
                         │
                         ↓
                META LAYER catches it
                         │
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
        FORAGE FIRST          SYNTHESIZE
        (cheap, proven)       (fallback)
              │                     │
              ↓                     ↓
         Scavenger            Meta-Agent
         queries              writes spec:
         GitHub, HF,          role, prompt,
         arxiv, HN            tools, budget
              │                     │
              ↓                     ↓
         Evaluator            LLM generates
         scores fits          agent/tool code
              │                     │
              ↓                     ↓
         Fork best            SANDBOX
         match                (isolated test)
              │                     │
              ↓                     ↓
         Adapt to             ADVERSARY
         tool schema          tries to break it
              │                     │
              └──────────┬──────────┘
                         ↓
                    Sandbox tests
                         │
                         ↓
                    Tests pass?
                         │
                    ┌────┴────┐
                    ↓         ↓
                   YES       NO
                    │         │
                    │         ↓
                    │    Discard, log,
                    │    try alternate
                    │
                    ↓
              Register in
              Tool Fabric /
              Agent Registry
                    │
                    ↓
              CANARY DEPLOY
              (5% traffic)
                    │
                    ↓
              Healthy?
                    │
              ┌─────┴─────┐
              ↓           ↓
             YES         NO
              │           │
              │           ↓
              │      Auto-rollback
              │      + log for
              │      later study
              │
              ↓
         PROMOTE 100%
              │
              ↓
         Agent uses new
         capability
              │
              ↓
         Learning recorded
         in Failure Museum /
         Success Archive
```

---

## Diagram 4: Self-Healing Loop

```
              SOMETHING BREAKS
              (agent fails, tool errors,
               integration down, API changed)
                         │
                         ↓
              IMMUNE SYSTEM detects
              (health checks, error
               rates, silent failures)
                         │
                         ↓
                  Classify failure
                         │
     ┌──────────┬────────┼────────┬──────────┐
     ↓          ↓        ↓        ↓          ↓
 Transient?  Config?  Logic bug? Missing   External
                                 capability? API?
     │          │        │        │          │
     ↓          ↓        ↓        ↓          ↓
  Retry      Adjust   Code-fix  Route to  Integration
  w/ back-   config   agent     Meta      repair
  off                  │        Layer     agent
     │          │      ↓         │          │
     │          │  Reads         │          │
     │          │  broken        │          │
     │          │  code          │          │
     │          │      │         │          │
     │          │      ↓         │          │
     │          │  Proposes      │          │
     │          │  fix           │          │
     │          │      │         │          │
     │          │      ↓         │          │
     │          │  Sandbox       │          │
     │          │  tests         │          │
     │          │      │         │          │
     │          │      ↓         │          │
     │          │  Canary        │          │
     │          │  deploy        │          │
     │          │      │         │          │
     └──────────┴──────┴─────────┴──────────┘
                         ↓
                   Fix applied?
                         │
                    ┌────┴────┐
                    ↓         ↓
                   YES        NO
                    │         │
                    ↓         ↓
              LOG + AUDIT   Wake human
              (silent)      (only case)
                    │
                    ↓
              Continue as
              if nothing
              happened
                    │
                    ↓
        ═══════════════════════
        Total elapsed: seconds
        to minutes. Human sees
        nothing unless it asks.
        ═══════════════════════
```

---

## Diagram 5: Master Architecture (all 12 layers)

```
┌─────────────────────────────────────────────────────────────┐
│                   HUMAN INTERFACE LAYER                     │
│  Owner Dashboard │ Co-owner Views │ Auditor Read-only       │
│  Public Goal API │ Approval Queue │ Regulator Portal        │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE COUNCIL                       │
│  Sovereign │ Anti-Sovereign │ Ethics Officer                │
│  Constitutional Court │ Whistleblower │ Watcher             │
│  Historian │ Deadman Switch │ Constitution                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   COMPANY LAYER (fractal)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │Company #1  │  │Company #2  │  │Company #N  │            │
│  │ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │            │
│  │ │Sub-Co  │ │  │ │Own gov │ │  │ │Own mem │ │            │
│  │ │A       │ │  │ │Own KPI │ │  │ │Own bank│ │            │
│  │ └────────┘ │  │ └────────┘ │  │ └────────┘ │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              AGENT SOCIETY + INTERNAL MARKET                │
│  Agents ↔ Message Bus ↔ Agents                              │
│  Prediction Markets │ Cognits Exchange │ Insurance Pools    │
│  Confessional Channel │ Reputation Ledger │ Gene Bank       │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       META LAYER                            │
│  Meta-Agent │ Tool Synthesizer │ Gap Detector               │
│  Curriculum Designer │ Adversary │ Learning Engine          │
│  Critic Agents │ Emergence Detector                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     FORAGING LAYER                          │
│  Scavenger │ Evaluator │ Fork-Adapt-Integrate               │
│  Foraging Museum │ Trend Prediction                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY HIERARCHY                         │
│  Working (RAM) │ Episodic │ Procedural │ Semantic           │
│  World State (projected) │ Failure Museum │ Gene Bank       │
│  Retirement Pool │ Foraging Museum │ Ancestor Consultation  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  SIMULATOR / DREAM LAYER                    │
│  Fork Manager │ Parallel Civilizations │ Dream Cycle        │
│  What-if Runner │ Merge / Discard Policies                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXECUTION & CONTROL                        │
│  Durable Execution │ Sandbox │ Verification │ Rollback      │
│  Immune System │ Budget Enforcement │ Circuit Breakers      │
│  Rate Limiting │ Protected Core │ Kill Switches             │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              BRAIN LAYER (LLM Abstraction)                  │
│  Model Router │ Cost Optimizer │ Provider Fallback          │
│  Prompt Cache │ Context Window Manager │ Fine-tune Registry │
│  Claude │ GPT │ DeepSeek │ Gemini │ Local (Llama, Mistral)  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   PERSONA LAYER                             │
│  Avatar Registry │ Voice Registry │ Brand Voice per Company │
│  Contextual Persona Selection │ Consistency Enforcement     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                REALITY INTERFACE LAYER                      │
│  Digital: Email │ Chat │ Web │ APIs                         │
│  Voice: Phone │ VoIP │ Video Meetings                       │
│  Financial: Banks │ Stripe │ UPI │ Crypto                   │
│  Legal: Contracts │ E-sign │ Filings                        │
│  Physical: Warehouse │ Drones │ Print │ Manufacturing       │
│  Human: Contractors │ Upwork │ Employees                    │
│  Sensor: Feeds │ IoT │ Cameras │ Market data                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                        KERNEL                               │
│  Event Bus │ SQLite │ World Projection Engine               │
│  Snapshots │ Time-Travel Query │ Audit Log                  │
│  Cryptographic Anchoring │ Secrets Vault │ Encryption       │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
              ══════════════════════════════════
                       THE REAL WORLD
              customers · money · calendars · contracts
              other companies · other civilizations · regulators
              ══════════════════════════════════
```

---

## Diagram 6: Governance Council (zoom-in)

```
                          HUMAN OWNER
                                │
                                │ (approve / veto / redirect)
                                ↓
     ┌──────────────────────────┼──────────────────────────┐
     │                                                     │
     ↓                                                     ↓
┌─────────────┐                                    ┌───────────────┐
│  SOVEREIGN  │ ←── proposes ──→ ANTI-SOVEREIGN    │  WATCHER      │
│ (executive) │      arguments      (devil's       │ (observes     │
│             │      against        advocate)      │  from outside)│
└─────────────┘                                    └───────────────┘
     │                                                     │
     ↓                                                     │
┌─────────────┐                                            │
│    ETHICS   │ ←── veto power over Sovereign             │
│   OFFICER   │      (moral / legal / reputational)       │
└─────────────┘                                            │
     │                                                     │
     ↓                                                     │
┌─────────────────┐                                        │
│ CONSTITUTIONAL  │ ←── interprets Constitution           │
│     COURT       │      when disputes arise              │
└─────────────────┘                                        │
     │                                                     │
     ↓                                                     │
┌─────────────┐                                            │
│WHISTLEBLOWER│ ←── any agent can escalate over           │
│  CHANNEL    │      Sovereign directly to human          │
└─────────────┘                                            │
     │                                                     │
     ↓                                                     │
┌─────────────┐                                            │
│  HISTORIAN  │ ←── writes civilization biography         │
│             │      (self-understanding)                 │
└─────────────┘                                            │
     │                                                     │
     ↓                                                     │
┌─────────────┐                                            │
│  DEADMAN    │ ←── human silent > 7 days →              │
│   SWITCH    │      civilization enters read-only        │
└─────────────┘                                            │
     │                                                     │
     ↓                                                     │
┌──────────────┐                                           │
│ CONSTITUTION │ ←── immutable core rules                  │
│              │      (amended only by governance vote)   │
└──────────────┘                                           │
                                                            │
                    ┌───────────────────────────────────────┘
                    ↓
              Monthly report:
              "Here's what I see
               that you can't"
                    │
                    ↓
                   HUMAN
```

---

## Diagram 7: Memory Hierarchy (zoom-in)

```
                    AGENT NEEDS TO REMEMBER
                              │
                              ↓
     ┌────────────────────────┼────────────────────────┐
     ↓                        ↓                        ↓

WORKING MEMORY         EPISODIC MEMORY          PROCEDURAL MEMORY
(current context)      (what happened)          (how to do things)
  │                       │                       │
  Current task            Past interactions       Skills, methods,
  Active variables        with this customer      learned protocols
  Recent messages         Full conversation log   Prompts that worked
  │                       │                       │
  Fast, small             Slow, large             Fast, indexed
  Lives in RAM            Lives in event log      Lives in registry
     │                        │                        │
     └────────────────────────┼────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  SEMANTIC MEMORY │
                    │  (what is true)  │
                    │  Facts, entities,│
                    │  relationships   │
                    │  Knowledge graph │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  WORLD STATE     │
                    │  (current        │
                    │   reality)       │
                    │  Projected from  │
                    │  events + mirrors│
                    └──────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ↓                        ↓                        ↓

FAILURE MUSEUM          GENE BANK              RETIREMENT POOL
(what didn't work)      (successful DNA)       (ancestor wisdom)
  │                       │                       │
  Every failure tagged    Successful agents'      Retired agents
  Embedded, searchable    prompts, tools, rules   preserved read-only
  New agents query        Inherited by new        Consulted when
  before acting           companies               relevant
     │                        │                        │
     └────────────────────────┼────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │ FORAGING MUSEUM  │
                    │ (external world  │
                    │  archive)        │
                    │  Every scavenged │
                    │  repo/model/paper│
                    │  ever seen       │
                    └──────────────────┘
                              │
                              ↓
              ═══════════════════════════════
              Every memory is time-stamped,
              time-travel-queryable, and
              cryptographically anchored.
              ═══════════════════════════════
```

---

## Diagram 8: Cross-Company Economic Market (zoom-in)

```
                        SOVEREIGN
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        Company #1     Company #2    Company #3
              │             │             │
              └──────┬──────┴──────┬──────┘
                     ↓             ↓
              ┌──────────────────────────┐
              │   INTER-COMPANY MARKET   │
              └──────────────────────────┘
                     │
     ┌───────────┬───┴────┬────────────┬───────────┐
     ↓           ↓        ↓            ↓           ↓

  COGNITS      REPUTATION  INSURANCE    OWNERSHIP  FAVORS
  EXCHANGE     LEDGER      POOLS        LEDGER     (untyped)
  │            │           │            │          │
  Internal     Assets      Companies    Fractional "I owe
  currency     tradable    insure       ownership  you"
  Agents       between     each other's between    tokens
  bid, earn,   companies   dependencies companies  Pre-money
  pay          Transfer    Claims paid  Board      obligations
  cognits      on birth    on failure   seats,
               of new co               dividends
  │            │           │            │          │
  └────────────┴───────────┴────────────┴──────────┘
                     ↓
              ┌───────────────────────────┐
              │  PREDICTION MARKETS       │
              │  Agents bet cognits on    │
              │  outcomes before big      │
              │  decisions                │
              │  Aggregates distributed   │
              │  intelligence             │
              └───────────────────────────┘
                     ↓
              ┌───────────────────────────┐
              │  MARKET GOVERNOR          │
              │  Anti-monopoly enforcement│
              │  Prevents one company     │
              │  from dominating          │
              │  the internal economy     │
              └───────────────────────────┘
```

---

## Diagram 9: Multi-Timescale Agent Architecture (zoom-in)

```
                    A GOAL ENTERS
                          │
        ┌─────────────────┼─────────────────┐
        ↓                                   ↓
        │                                   │
   MICROSECOND                            DECADE
        ↓                                   ↓
   ┌──────────┐                        ┌──────────┐
   │Real-time │                        │Civilization│
   │agents    │                        │identity   │
   │(chat,    │                        │agents     │
   │voice)    │                        │(purpose,  │
   └──────────┘                        │legacy)    │
        ↓                              └──────────┘
   ┌──────────┐                             ↑
   │SECOND    │                        ┌──────────┐
   │Decision  │                        │YEAR      │
   │routing   │                        │Org       │
   │agents    │                        │evolution │
   └──────────┘                        └──────────┘
        ↓                                   ↑
   ┌──────────┐                        ┌──────────┐
   │MINUTE    │                        │QUARTER   │
   │Task      │                        │Financial │
   │execution │                        │planning  │
   │agents    │                        │agents    │
   └──────────┘                        └──────────┘
        ↓                                   ↑
   ┌──────────┐                        ┌──────────┐
   │HOUR      │                        │MONTH     │
   │Workflow  │                        │Strategy  │
   │completion│                        │agents    │
   │agents    │                        │          │
   └──────────┘                        └──────────┘
        ↓                                   ↑
   ┌──────────┐                        ┌──────────┐
   │DAY       │                        │WEEK      │
   │Reporting │        ←────────       │Learning  │
   │agents    │                        │cycle     │
   │          │                        │agents    │
   └──────────┘                        └──────────┘
        │                                   ↑
        └───────────────┬───────────────────┘
                        ↓
              ═══════════════════════
              Each clock: different
              memory, different LLM
              tier (fast/cheap vs
              slow/smart), different
              context window
              ═══════════════════════
```

---

## Diagram 10: Simulator / Dream Layer (zoom-in)

```
                   MAIN CIVILIZATION
                   (runs in reality)
                          │
                          │ checkpoint state
                          ↓
              ┌──────────────────────┐
              │    FORK MANAGER      │
              │  clone civilization  │
              │  at moment T         │
              └──────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ↓                  ↓                  ↓
  FORK #1            FORK #2            FORK #3
  "what if we        "what if we        "what if we
   raised prices?"    entered market Y?" fired agent Z?"
       │                  │                  │
       │  (runs in         │                  │
       │   accelerated     │                  │
       │   time — hours    │                  │
       │   of sim per      │                  │
       │   minute of       │                  │
       │   wall time)      │                  │
       ↓                  ↓                  ↓
   Outcome            Outcome           Outcome
   observed           observed          observed
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ↓
              ┌──────────────────────┐
              │  MERGE / DISCARD     │
              │  Best fork:          │
              │  merge learnings     │
              │  Others: discard,    │
              │  archive lessons     │
              └──────────────────────┘
                          │
                          ↓
                MAIN CIVILIZATION
                (informed by dreams)
```

---

## Diagram 11: Persona Layer (zoom-in)

```
                    AGENT WANTS TO
                    COMMUNICATE
                          │
                          ↓
              ┌──────────────────────┐
              │   CONTEXT DETECTION  │
              │  Who's the audience? │
              │  What's the channel? │
              │  What's the tone?    │
              └──────────────────────┘
                          │
                          ↓
              ┌──────────────────────┐
              │   PERSONA REGISTRY   │
              │  Query: which face   │
              │  fits this context?  │
              └──────────────────────┘
                          │
     ┌────────────┬───────┼────────┬────────────┐
     ↓            ↓       ↓        ↓            ↓
  "Priya"     "Rajesh"  "Aditi" "Company X    "Formal
  Real estate B2B sales Support   brand voice"  legal
  qualifier   closer    agent                   voice"
     │            │       │        │            │
     ├────────────┼───────┼────────┼────────────┤
     │  Consistent name, voice, avatar, language,│
     │  personality across every interaction    │
     │  Customer only ever meets Priya, always  │
     │  the same Priya                          │
     └───────────────────────────────────────────┘
                          │
                          ↓
              ┌──────────────────────┐
              │  DELIVERY CHANNEL    │
              │  Text: apply persona │
              │  voice + vocabulary  │
              │  Voice: apply persona│
              │  voice + tone        │
              │  Video: apply persona│
              │  avatar + expression │
              └──────────────────────┘
                          │
                          ↓
                     CUSTOMER
```

---

## Diagram 12: Company Internal Structure (fractal)

```
                    COMPANY (any single one)
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
      Company CEO      Company        Company
      (mini-Sovereign) Ethics         Historian
              │        Officer            │
              │                           │
     ┌────────┼────────┐                  │
     ↓        ↓        ↓                  │
  DEPT #1  DEPT #2  DEPT #3               │
  Marketing Sales   Delivery              │
     │        │        │                  │
   Agents  Agents  Agents                 │
   Tools   Tools   Tools                  │
   Budget  Budget  Budget                 │
   Memory  Memory  Memory                 │
     │        │        │                  │
     └────────┼────────┘                  │
              ↓                           │
      Company message bus                 │
      Company world model                 │
      Company memory                      │
      Company budget                      │
      Company bank account                │
      Company reputation                  │
                                          │
              ┌───────────────────────────┘
              ↓
      Reports up to
      SOVEREIGN (main civilization)
              │
              ↓
      Can spawn SUB-COMPANIES
      (fractal: each sub-company
       has its own internal
       structure just like this)
```

---

## Layer Summary Table

| # | Layer | Purpose | New Concepts Added |
|---|---|---|---|
| 1 | Human Interface | Multi-stakeholder views (owner, co-owner, auditor, regulator) | C91 |
| 2 | Governance Council | Separation of powers, no single agent has final authority | — |
| 3 | Company Layer | Fractal companies-in-companies with own governance | C94-C96 |
| 4 | Agent Society + Market | Agent-to-agent + internal economy | C97 |
| 5 | Meta Layer | Self-extension | — |
| 6 | Foraging Layer | Ecosystem consumption | — |
| 7 | Memory Hierarchy | 10 memory systems, each with a purpose | — |
| 8 | Simulator / Dream | Parallel civilizations for what-if testing | — |
| 9 | Execution & Control | Durable execution, safety, immune | — |
| 10 | Brain Layer | LLM abstraction, routing, caching | C92-C93 |
| 11 | Persona Layer | Faces the civilization presents externally | — |
| 12 | Reality Interface | Digital + voice + financial + legal + physical + human + sensor | C98 |
| — | Kernel | Event log, projections, snapshots, secrets, crypto | C99 |

---

## Doc metadata

- **Companion docs:** `VISION.md` (what/why), `PLAN.md` (how/when)
- **Last updated:** 2026-08-12
- **Coverage:** 12 diagrams (1 master + 11 zoom-ins) covering all 12 architectural layers
