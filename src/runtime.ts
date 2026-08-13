import { PlutoState } from './kernel/state.ts';
import type { Company, ToolDef } from './kernel/types.ts';
import { OrgEngine, StrategyEngine } from './org/engines.ts';
import { Workforce } from './org/workforce.ts';
import type { WorkItem } from './org/workforce.ts';
import { Governance, describeOrg } from './plane/governance.ts';
import { ResourceEngine } from './plane/resources.ts';
import { LearningEngine, AgentFactory } from './learn/engine.ts';
import { VerificationEngine, defaultVerifiers } from './verify/engine.ts';
import { EventBus } from './events/bus.ts';
import { WorkGraphEngine } from './work/graph.ts';
import { ExecutionFabric } from './work/fabric.ts';
import { CapabilityFactory, seedCapabilities } from './capability/factory.ts';
import { CompanyIntelligence } from './intel/engine.ts';
import { PolicyEngine } from './plane/policy.ts';
import { MetaAgent } from './meta/engine.ts';
import { BrainLayer } from './brain/index.ts';
import { makeDriver } from './agents/llm.ts';
import { WorldModel } from './world/engine.ts';
import { MessageBus } from './bus/engine.ts';
import { ToolSynthesizer } from './meta/synthesizer.ts';
import { CanaryDeploy } from './meta/canary.ts';
import { ImmuneSystem } from './immune/engine.ts';
import { ForageEngine } from './forage/engine.ts';
import { RealityInterface, buildRealityInterface } from './reality/engine.ts';
import { Sovereign } from './sovereign/engine.ts';
import { Civilization } from './governance/civilization.ts';
import { EntityRuntime } from './entity/engine.ts';
import { EcommerceRuntime } from './entity/ecommerce.ts';
import { ContentRuntime } from './entity/content.ts';
import { CrossCompany } from './crosscompany/engine.ts';
import { CompanyLifecycle } from './lifecycle/engine.ts';
import { WisdomEngine } from './wisdom/engine.ts';
import { HumanEngine } from './human/engine.ts';
import { DreamEngine } from './dream/engine.ts';
import { FractalEngine } from './fractal/engine.ts';
import { AuthorityEngine } from './authority/engine.ts';
import { MetaSovereign } from './metasovereign/engine.ts';
import { GraceRehearsal } from './grace/engine.ts';
import { OpsRuntime } from './ops/engine.ts';
import { EconomyEngine } from './economy/engine.ts';
import { PhysicalEngine } from './physical/engine.ts';
import { TimeArchEngine } from './timearch/engine.ts';
import { AestheticsEngine } from './aesthetics/engine.ts';
import { MetaLearningEngine } from './metalearning/engine.ts';
import { MindModelEngine } from './mindmodel/engine.ts';
import { ResearchEngine } from './research/engine.ts';
import { CultureEngine } from './culture/engine.ts';
import { Governance2Engine } from './governance2/engine.ts';
import { SpeculativeEngine } from './speculative/engine.ts';
import { LegalEngine } from './legal/engine.ts';
import { InstitutionalEngine } from './institutional/engine.ts';
import { FederationEngine } from './federation/engine.ts';
import { ExistentialEngine } from './existential/engine.ts';
import { SelfModEngine } from './selfmod/engine.ts';

import type { MCPAdapter } from './adapters/mcp.ts';
import type { A2AAdapter } from './adapters/a2a.ts';
import type { TemporalAdapter } from './adapters/temporal.ts';
import type { GraphitiAdapter } from './adapters/graphiti.ts';
import type { LettaAdapter } from './adapters/letta.ts';
import type { E2BAdapter } from './adapters/e2b.ts';
import type { PhoenixAdapter } from './adapters/phoenix.ts';
import type { LangGraphAdapter } from './adapters/langgraph.ts';
import type { OpenHandsAdapter } from './adapters/openhands.ts';
import type { AgentSandboxAdapter } from './adapters/agent-sandbox.ts';
import type { AgentFileAdapter } from './adapters/agent-file.ts';
import type { FoundationProtocolAdapter } from './adapters/foundation-protocol.ts';
import type { AILinkNetAdapter } from './adapters/ai-link-net.ts';
import type { AOrchestraAdapter } from './adapters/aorchestra.ts';
import type { AFlowAdapter } from './adapters/aflow.ts';
import type { ReCodeAdapter } from './adapters/recode.ts';
import type { OpenManusAdapter } from './adapters/openmanus.ts';
import type { BrowserGymAdapter } from './adapters/browsergym.ts';
import type { SPOAdapter } from './adapters/spo.ts';
import type { CAREAdapter } from './adapters/care.ts';
import type { DeepResearchAdapter } from './adapters/deep-research.ts';
import type { DeepAnalyzeAdapter } from './adapters/deep-analyze.ts';
import type { MSAgentFrameworkAdapter } from './adapters/ms-agent-framework.ts';
import type { OpenHandsSDKAdapter } from './adapters/openhands-sdk.ts';
import type { LettaSkillsAdapter } from './adapters/letta-skills.ts';
import type { AgencyAgentsAdapter } from './adapters/agency-agents.ts';
import type { RAGFlowAdapter } from './adapters/ragflow.ts';
import type { PrimeAgentAdapter } from './adapters/prime-agent.ts';
import type { SemanticaAdapter } from './adapters/semantica.ts';
import type { CloudflareComputerAdapter } from './adapters/cloudflare-computer.ts';
import type { LoopXAdapter } from './adapters/loopx.ts';
import type { DrawDBAdapter } from './adapters/drawdb.ts';
import type { ReverseSkillAdapter } from './adapters/reverse-skill.ts';
import type { ComfyUIAdapter } from './adapters/comfyui.ts';
import type { TencentDbMemoryAdapter } from './adapters/tencent-db-memory.ts';
import type { HallmarkAdapter } from './adapters/hallmark.ts';
import type { OrcaAdapter } from './adapters/orca.ts';
import type { ArchifyAdapter } from './adapters/archify.ts';
import type { StripeAdapter } from './adapters/stripe.ts';
import type { PaymentsAdapter } from './adapters/payments.ts';
import type { PostgresAdapter } from './adapters/postgres.ts';
import type { EmailAdapter } from './adapters/email.ts';
import type { SlackAdapter } from './adapters/slack.ts';
import type { WhatsAppAdapter } from './adapters/whatsapp.ts';

/** Adapter seams — every external system (MCP, Temporal, Graphiti, Letta, OpenHands…) plugs in behind these. */
export interface PlutoAdapters {
  /** Replaces the built-in graph store with Graphiti or any graph backend. */
  graph?: GraphitiAdapter | { nodes(): unknown[]; edges(): unknown[]; upsertNode(id: string, kind: string, name: string, props: Record<string, unknown>): void };
  /** Replaces in-process event fan-out with a durable event store (e.g. Postgres outbox). */
  bus?: never | null;
  /** Replaces ExecutionFabric's inline runner with Temporal. */
  scheduler?: TemporalAdapter | { enqueue(jobId: string): Promise<void> } | null;
  mcp?: MCPAdapter;
  a2a?: A2AAdapter;
  letta?: LettaAdapter;
  e2b?: E2BAdapter;
  phoenix?: PhoenixAdapter;
  langgraph?: LangGraphAdapter;
  openhands?: OpenHandsAdapter;
  sandbox?: AgentSandboxAdapter;
  agentFile?: AgentFileAdapter;
  foundationProtocol?: FoundationProtocolAdapter;
  aiLinkNet?: AILinkNetAdapter;
  aorchestra?: AOrchestraAdapter;
  aflow?: AFlowAdapter;
  recode?: ReCodeAdapter;
  openmanus?: OpenManusAdapter;
  browsergym?: BrowserGymAdapter;
  spo?: SPOAdapter;
  care?: CAREAdapter;
  deepResearch?: DeepResearchAdapter;
  deepAnalyze?: DeepAnalyzeAdapter;
  msAgentFramework?: MSAgentFrameworkAdapter;
  openhandsSDK?: OpenHandsSDKAdapter;
  lettaSkills?: LettaSkillsAdapter;
  agencyAgents?: AgencyAgentsAdapter;
  ragflow?: RAGFlowAdapter;
  primeAgent?: PrimeAgentAdapter;
  semantica?: SemanticaAdapter;
  cloudflareComputer?: CloudflareComputerAdapter;
  loopx?: LoopXAdapter;
  drawdb?: DrawDBAdapter;
  reverseSkill?: ReverseSkillAdapter;
  comfyui?: ComfyUIAdapter;
  tencentDbMemory?: TencentDbMemoryAdapter;
  hallmark?: HallmarkAdapter;
  orca?: OrcaAdapter;
  archify?: ArchifyAdapter;
  stripe?: StripeAdapter;
  payments?: PaymentsAdapter;
  postgres?: PostgresAdapter;
  email?: EmailAdapter;
  slack?: SlackAdapter;
  whatsapp?: WhatsAppAdapter;
}

export interface PlutoRuntime {
  state: PlutoState;
  company: Company;
  workforce: Workforce;
  governance: Governance;
  resources: ResourceEngine;
  verifier: VerificationEngine;
  learning: LearningEngine;
  factory: AgentFactory;
  org: OrgEngine;
  strategy: StrategyEngine;
  bus: EventBus;
  workGraph: WorkGraphEngine;
  fabric: ExecutionFabric;
  capabilities: CapabilityFactory;
  intel: CompanyIntelligence;
  policies: PolicyEngine;
  meta: MetaAgent;
  brain: BrainLayer;
  world: WorldModel;
  messages: MessageBus;
  synthesizer: ToolSynthesizer;
  canary: CanaryDeploy;
  immune: ImmuneSystem;
  forage: ForageEngine;
  reality: RealityInterface;
  sovereign: Sovereign;
  civ: Civilization;
  entity: EntityRuntime;
  grace: GraceRehearsal;
  ops: OpsRuntime;
  ecommerce: EcommerceRuntime;
  content: ContentRuntime;
  cross: CrossCompany;
  lifecycle: CompanyLifecycle;
  wisdom: WisdomEngine;
  human: HumanEngine;
  dream: DreamEngine;
  fractal: FractalEngine;
  authority: AuthorityEngine;
  metasovereign: MetaSovereign;
  economy: EconomyEngine;
  physical: PhysicalEngine;
  timearch: TimeArchEngine;
  aesthetics: AestheticsEngine;
  metalearning: MetaLearningEngine;
  mindmodel: MindModelEngine;
  research: ResearchEngine;
  culture: CultureEngine;
  governance2: Governance2Engine;
  speculative: SpeculativeEngine;
  legal: LegalEngine;
  institutional: InstitutionalEngine;
  federation: FederationEngine;
  existential: ExistentialEngine;
  selfmod: SelfModEngine;
  tools: ToolDef[];
  adapters: PlutoAdapters;
}

/** Bootstraps a company from an intent and wires all subsystems. */
export function createRuntime(dataDir: string, name: string, mission: string, tools: ToolDef[]): PlutoRuntime {
  const state = PlutoState.open(dataDir);
  const company = state.repos.createCompany(name, mission);
  const org = new OrgEngine(state);
  const strategy = new StrategyEngine(state);
  const governance = new Governance(state);
  const resources = new ResourceEngine(state);
  const learning = new LearningEngine(state);
  const factory = new AgentFactory(state);
  const verifier = new VerificationEngine(state);
  for (const [k, fn] of defaultVerifiers()) verifier.register(k, fn);
  const bus = new EventBus(state);
  const brain = new BrainLayer({ defaultDriver: makeDriver() });
  const world = new WorldModel(state.store);
  const messages = new MessageBus(state, bus);
  const reality = buildRealityInterface(world, { bus: messages });
  const synthesizer = new ToolSynthesizer();
  const canary = new CanaryDeploy();
  const immune = new ImmuneSystem(state, { synth: synthesizer, canary });
  const workforce = new Workforce(state, tools, brain);
  const workGraph = new WorkGraphEngine(state);
  const fabric = new ExecutionFabric(state);
  const capabilities = new CapabilityFactory(state);
  const forage = new ForageEngine({
    store: state.store, synth: synthesizer, canary,
    registerVersion: (companyId, name) => capabilities.registerVersion(companyId, name),
  });
  const intel = new CompanyIntelligence(state);
  const policies = new PolicyEngine(state);
  const meta = new MetaAgent(state, { tools, forage });
  const sovereign = new Sovereign(state);
  const civ = new Civilization(state);
  civ.seedConstitution();
  const entity = new EntityRuntime(state);
  const grace = new GraceRehearsal(state);
  const ops = new OpsRuntime(state);
  const ecommerce = new EcommerceRuntime(state);
  const content = new ContentRuntime(state);
  const cross = new CrossCompany(state);
  const lifecycle = new CompanyLifecycle(state);
  const wisdom = new WisdomEngine(state);
  const human = new HumanEngine(state);
  const dream = new DreamEngine(state);
  const fractal = new FractalEngine(state);
  const authority = new AuthorityEngine(state);
  const metasovereign = new MetaSovereign(state);
  const economy = new EconomyEngine(state);
  const physical = new PhysicalEngine(state);
  const timearch = new TimeArchEngine(state);
  const aesthetics = new AestheticsEngine(state);
  const metalearning = new MetaLearningEngine(state);
  const mindmodel = new MindModelEngine(state);
  const research = new ResearchEngine(state);
  const culture = new CultureEngine(state);
  const governance2 = new Governance2Engine(state);
  const speculative = new SpeculativeEngine(state);
  const legal = new LegalEngine(state);
  const institutional = new InstitutionalEngine(state);
  const federation = new FederationEngine(state);
  const existential = new ExistentialEngine(state);
  const selfmod = new SelfModEngine(state);

  resources.defaults(company.id);
  seedCapabilities(state, company.id);
  sovereign.addOwner({ company_id: company.id, name: 'Civilization', role: 'sovereign', email: 'owner@pluto.local', authority: ['all'] });

  const runtime: PlutoRuntime = {
    state, company, workforce, governance, resources, verifier, learning, factory,
    org, strategy, bus, workGraph, fabric, capabilities, intel, policies, meta, brain, world, messages, synthesizer, canary, immune, forage, reality, sovereign, civ, entity, grace, ops, ecommerce, content, cross, lifecycle, wisdom, human, dream, fractal, authority, metasovereign, economy, physical, timearch, aesthetics, metalearning, mindmodel, research, culture, governance2, speculative, legal, institutional, federation, existential, selfmod, tools,
    adapters: {},
  };

  // default wiring: capability needs create agents pre-emptively on company formation
  bus.on(['task.failed'], (ev) => {
    if (ev.entity_kind === 'task' && ev.entity_id) {
      const t = state.repos.task(ev.entity_id);
      if (t) learning.observeTaskOutcome(t, false);
    }
  });

  // P3 wiring: `capability_gap` message broadcast triggers the meta-agent to spawn a capability
  messages.subscribe({ contract: 'request', handler: async (m) => {
    const row = m as unknown as { from_agent: string; payload: Record<string, unknown> };
    if (typeof (row.payload as any)?.kind === 'string' && String((row.payload as any).kind) === 'capability_gap') {
      const gap: string = String((row.payload as any).capability ?? '');
      if (gap) {
        try { await meta.spawnForGap(m.company_id, gap, 'capability_gap broadcast'); } catch { /* spawn failures are non-fatal to the bus */ }
      }
    }
  }});

  state.companyEvent(company, 'company.created', { mission });
  return runtime;
}

export function orgSummary(r: PlutoRuntime): string {
  return describeOrg(r.state, r.company.id);
}

/** The full organization formation: intent -> intelligence -> org -> cascade. */
export function formOrganization(r: PlutoRuntime, objective: string) {
  const { deps, objective: missionObj } = r.org.build(r.company, objective);
  const cascades = r.strategy.cascade(r.company.id, missionObj, deps);
  r.state.repos.logDecision({
    company_id: r.company.id, kind: 'org_design', summary: `Formed organization for: ${objective}`,
    reasoning: 'Objective-to-organization mapping produced departments and managers, each with scoped tools and permissions.',
    alternatives: deps.map(d => d.name),
    confidence: 0.85, actor_id: 'pluto-hq',
  });
  return { deps, missionObj, cascades };
}

export type { WorkItem };