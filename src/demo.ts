import { createRuntime, formOrganization, orgSummary } from './runtime.ts';
import type { PlutoRuntime } from './runtime.ts';
import { buildToolFabric, fsTools, httpTool } from './tools/fabric.ts';
import { Governance } from './plane/governance.ts';

const DATA_DIR = process.env.PLUTO_DATA_DIR ?? './data';
const MISSION = process.env.PLUTO_MISSION ?? 'Deliver 10 paying client engagements for a professional services company.';

async function main(): Promise<void> {
  const tools = [...buildToolFabric(), httpTool(), ...fsTools('./data/workspace')];
  const r = createRuntime(DATA_DIR, 'Acme Services Co (PLUTO)', MISSION, tools);
  const companyId = r.company.id;
  console.log(`\n[PLUTO] company created: ${r.company.name} (${companyId})`);
  console.log(`[PLUTO] mission: ${MISSION}`);
  console.log(`[PLUTO] model lane: ${process.env.DEEPSEEK_API_KEY ? 'deepseek-v4-flash' : 'mock-v4-flash (add DEEPSEEK_API_KEY for real execution)'}\n`);

  // 1. intelligence + organization formation
  const { missionObj, cascades } = formOrganization(r, MISSION);
  console.log('[PLUTO] organization formed:');
  console.log(orgSummary(r));
  console.log(`[PLUTO] ${cascades.length} department objectives cascaded from mission.`);

  // 2. workforce: run a real working day across departments
  const salesDept = r.state.repos.departments(companyId).find(d => d.name === 'Sales');
  const salesAgent = salesDept?.manager_id ? r.state.repos.agent(salesDept.manager_id) : null;
  const financeDept = r.state.repos.departments(companyId).find(d => d.name === 'Finance');
  const financeAgent = financeDept?.manager_id ? r.state.repos.agent(financeDept.manager_id) : null;
  const deliveryDept = r.state.repos.departments(companyId).find(d => d.name === 'Delivery');
  const deliveryAgent = deliveryDept?.manager_id ? r.state.repos.agent(deliveryDept.manager_id) : null;

  const salesObj = cascades.find(o => o.department_id === salesDept?.id);
  const financeObj = cascades.find(o => o.department_id === financeDept?.id);
  const deliveryObj = cascades.find(o => o.department_id === deliveryDept?.id);

  // simulate a day of leads -> outreach -> reply -> qualify -> propose -> invoice -> deliver
  const pipeline: Array<{ kind: string; summary: string; input: Record<string, unknown>; objective_id: string | null; agent_id: string | null }> = [
    { kind: 'research', summary: 'Research 3 prospect companies for ICP fit', input: { targets: ['https://en.wikipedia.org/wiki/Acme_Corporation', 'https://www.reuters.com', 'https://example.com'] }, objective_id: salesObj?.id ?? null, agent_id: salesAgent?.id ?? null },
    { kind: 'outreach', summary: 'Draft personalized outreach for qualified prospects', input: { offer: 'Website + conversion optimization, $2.5k/site' }, objective_id: salesObj?.id ?? null, agent_id: salesAgent?.id ?? null },
    { kind: 'qualify', summary: 'Score incoming replies for fit and priority', input: { replies: ['interested', 'maybe'], icp: 'SMB 20-200 employees needing web presence' }, objective_id: salesObj?.id ?? null, agent_id: salesAgent?.id ?? null },
    { kind: 'propose', summary: 'Draft proposal for the strongest qualified lead', input: { lead: 'northwind.tech', scope: '7-page site, CMS, basic SEO' }, objective_id: salesObj?.id ?? null, agent_id: salesAgent?.id ?? null },
    { kind: 'invoice', summary: 'Create invoice for accepted proposal', input: { lead: 'northwind.tech', amount: 2500, terms: '50% deposit, 50% on launch' }, objective_id: financeObj?.id ?? null, agent_id: financeAgent?.id ?? null },
    { kind: 'deliver', summary: 'Scaffold delivery workspace for northwind.tech project', input: { lead: 'northwind.tech', phases: ['design', 'build', 'qa', 'launch'] }, objective_id: deliveryObj?.id ?? null, agent_id: deliveryAgent?.id ?? null },
  ];

  console.log('\n[PLUTO] executing the working day across departments...');
  const results = await r.workforce.runAll(companyId, pipeline);

  const ok = results.filter(x => x.ok).length;
  console.log(`\n[PLUTO] ${ok}/${results.length} tasks succeeded.`);

  for (const res of results) {
    const ev = res.task.evidence.map(e => `${e.name}:${e.ok ? 'pass' : 'fail'}`).join(', ') || 'none';
    console.log(`  ${res.task.kind.padEnd(10)} ${res.task.status.padEnd(10)} evidence[${ev}] $${res.cost_usd.toFixed(4)}`);
  }

  // 3. human-in-the-loop: a risky action requires approval
  const gov = new Governance(r.state);
  const approval = gov.approveOrBlock(companyId, salesAgent?.id ?? 'sys', 'spend $1,200 on enterprise acquisition campaign', 'Campaign expansion across 4 verticals.', { cost_usd: 1200, risk: 'high' });
  if (approval !== 'approved') {
    console.log(`\n[PLUTO] approval requested (${approval.risk}): "${approval.summary}" — pending in Approval Center.`);
    gov.decide(approval.id, 'approved', 'founder');
    console.log('[PLUTO] founder approved. Campaign funded.');
  }

  // 4. learning + evolution audit
  const proposals = r.learning.auditCompany(companyId);
  if (proposals.length) {
    console.log(`\n[PLUTO] evolution proposals: ${proposals.map(p => p.summary).join('; ')}`);
    for (const p of proposals) r.learning.apply(companyId, p);
  }

  // 5. verification sample
  const lastTask = r.state.repos.tasks(companyId)[0];
  if (lastTask) {
    const ev = await r.verifier.verify(lastTask);
    console.log(`\n[PLUTO] verification of "${lastTask.summary}": ${ev.map(e => `${e.name}=${e.ok}`).join(', ')}`);
  }

  // 6. strategy: formulate options, choose, run an experiment (§16)
  const strat = r.strategy.formulate(companyId, 'Market-entry', 'market_entry', [
    { name: 'Vertical SEO + outreach', expected: 12, confidence: 0.6, cost_usd: 1500, summary: 'Double down on niche SEO and outbound' },
    { name: 'Referral partners', expected: 7, confidence: 0.5, cost_usd: 300, summary: 'Partner with 3 dev firms for referrals' },
    { name: 'Paid ads', expected: 9, confidence: 0.4, cost_usd: 2000, summary: 'Google Ads on high-intent keywords' },
  ]);
  console.log(`\n[PLUTO] strategy "${strat.name}": chose "${strat.options.find(o => o.id === strat.chosen)?.name}"`);

  const exp = r.strategy.startExperiment(companyId, missionObj.id, 'SEO content wins more qualified leads than cold outreach', 'seo-content', 'reply_rate', 0.02);
  console.log(`[PLUTO] experiment "${exp.variant}" running (baseline ${exp.baseline})`);
  const concluded = r.strategy.concludeExperiment(companyId, exp.id, 0.047);
  console.log(`[PLUTO] experiment ${concluded.status} (observed ${concluded.current} vs baseline ${concluded.baseline})`);

  // 7. work graph with dependencies (7.8)
  const wg = r.workGraph.create(companyId, 'Client Delivery');
  const deliverNode = { id: 'wn_deliver', kind: 'deliver', summary: 'Ship deliverable to customer', input: {}, agent_id: deliveryAgent?.id ?? null, objective_id: deliveryObj?.id ?? null, project_id: null, depends_on: ['wn_propose'], priority: 1 };
  const proposeNode = { id: 'wn_propose', kind: 'propose', summary: 'Approve final proposal', input: {}, agent_id: salesAgent?.id ?? null, objective_id: salesObj?.id ?? null, project_id: null, depends_on: [], priority: 2 };
  const designNode = { id: 'wn_design', kind: 'design', summary: 'Design the site (blocked by proposal)', input: {}, agent_id: deliveryAgent?.id ?? null, objective_id: deliveryObj?.id ?? null, project_id: null, depends_on: ['wn_propose'], priority: 3 };
  const qaNode = { id: 'wn_qa', kind: 'qa', summary: 'QA the build (after design)', input: {}, agent_id: deliveryAgent?.id ?? null, objective_id: deliveryObj?.id ?? null, project_id: null, depends_on: ['wn_design'], priority: 4 };
  try {
    r.workGraph.addNode(wg, proposeNode); r.workGraph.addNode(wg, designNode); r.workGraph.addNode(wg, qaNode); r.workGraph.addNode(wg, deliverNode);
    const order = r.workGraph.topoOrder(wg).map(id => wg.nodes.get(id)!.summary);
    console.log(`\n[PLUTO] work graph "${wg.name}": ${wg.nodes.size} nodes → ${order.join(' → ')}`);
    const done = new Set(['wn_propose', 'wn_design']);
    const ready = r.workGraph.available(wg, done).map(n => n.summary);
    console.log(`[PLUTO] after propose+design: ready to run → ${ready.join(', ')}`);
  } catch (e) {
    console.log(`[PLUTO] work graph error: ${e instanceof Error ? e.message : e}`);
  }

  // 8. policy + capability factory (§33)
  r.policies.seedDefaults(companyId);
  const verdict = r.policies.evaluate(companyId, 'sales_manager', 'http.get');
  console.log(`[PLUTO] policy check http.get for sales_manager → ${verdict.effect} (${verdict.policy ?? 'default'})`);
  const block = r.policies.evaluate(companyId, 'sales_manager', 'external.transfer_funds');
  console.log(`[PLUTO] policy check external.transfer_funds → ${block.effect}`);

  const acquisition = r.capabilities.acquire(companyId, { name: 'seo_audit', description: 'technical SEO audit of a live site', cost_ceiling_usd: 50, urgency: 0.7 });
  console.log(`[PLUTO] capability "seo_audit" → ${acquisition.decision}${acquisition.decision === 'buy' ? ` via ${(acquisition as any).provider} ($${(acquisition as any).est_cost_usd})` : ''}`);
  const reacquire = r.capabilities.acquire(companyId, { name: 'web_research', description: 'browse/search the web', cost_ceiling_usd: 5, urgency: 0.3 });
  console.log(`[PLUTO] capability "web_research" → ${reacquire.decision}`);

  // 9. intelligence brief
  const brief = r.intel.brief(companyId);
  console.log(`\n[PLUTO] intelligence: ${brief.summary}`);
  const facts = brief.facts.slice(0, 3);
  for (const f of facts) console.log(`  ${f.subject} ${f.predicate} ${f.object} (${f.confidence})`);

  // summary
  const cost = r.resources.totalSpend(companyId);
  const events = r.state.repos.recentEvents(companyId);
  const pending = gov.pending(companyId).length;
  console.log(`\n[PLUTO] --- summary ---`);
  console.log(`  events: ${events.length} · tasks: ${r.state.repos.tasks(companyId).length} · approvals pending: ${pending}`);
  console.log(`  spend: $${cost.toFixed(2)} across ${r.resources.ledger(companyId).length} budget scopes`);
  console.log(`  org: ${r.state.repos.agents(companyId).length} agents · ${r.state.repos.departments(companyId).length} departments`);
  console.log(`  decision log: ${r.state.repos.decisions(companyId).length} decisions`);
  console.log(`  capabilities: ${r.state.repos.capabilities(companyId).length} · strategies: ${r.state.repos.strategies(companyId).length} · experiments: ${r.state.repos.experiments(companyId).length}`);
  console.log(`\nNow run: npm run api  →  open http://localhost:4000\n`);

  r.state.close();
}

main().catch(err => { console.error(err); process.exit(1); });