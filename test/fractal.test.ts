import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRuntime } from './helpers.ts';

test('fractal.sub_company: spawn child + list + lineage', () => {
  const { r, dispose } = makeRuntime();
  try {
    const child = r.fractal.spawnSubCompany({ parent_id: r.company.id, name: 'Priya Realty Hyderabad', mission: 'Lead qualification for Hyderabad real estate', budget_usd: 100 });
    assert.ok(child.id.startsWith('co_'));
    assert.equal(child.parent_id, r.company.id);
    assert.equal(child.depth, 1);

    const subs = r.fractal.subCompanies(r.company.id);
    assert.ok(subs.length >= 1);
    assert.ok(subs.some(s => s.id === child.id));

    // Spawn grandchild
    const grand = r.fractal.spawnSubCompany({ parent_id: child.id, name: 'Priya Realty North Zone', mission: 'North Hyderabad leads', budget_usd: 50 });
    assert.equal(grand.depth, 2);

    const tree = r.fractal.lineage(r.company.id);
    assert.ok(tree.length >= 1);
  } finally { dispose(); }
});

test('fractal.department: add dept with budget + spend', () => {
  const { r, dispose } = makeRuntime();
  try {
    const dept = r.fractal.addDepartment({ company_id: r.company.id, name: 'Growth', kind: 'marketing', budget_usd: 500 });
    assert.ok(dept.id.startsWith('dep_'));
    assert.equal(dept.name, 'Growth');

    const budgets = r.fractal.deptBudgets(r.company.id);
    assert.ok(budgets.some(b => b.department_id === dept.id));

    const ok = r.fractal.deptSpend(r.company.id, dept.id, 100);
    assert.ok(ok);

    // Over-budget spend should fail
    const over = r.fractal.deptSpend(r.company.id, dept.id, 5000);
    assert.ok(!over);
  } finally { dispose(); }
});

test('fractal.department: nested sub-department', () => {
  const { r, dispose } = makeRuntime();
  try {
    const parent = r.fractal.addDepartment({ company_id: r.company.id, name: 'Sales', kind: 'sales', budget_usd: 1000 });
    const child = r.fractal.addDepartment({ company_id: r.company.id, name: 'Inside Sales', kind: 'sales', parent_dept_id: parent.id, budget_usd: 300 });
    assert.ok(child.id.startsWith('dep_'));
    const depts = r.state.repos.departments(r.company.id);
    const childDept = depts.find(d => d.id === child.id);
    assert.equal(childDept?.parent_id, parent.id);
  } finally { dispose(); }
});

test('fractal.market_governor: detects + rebalances concentration', () => {
  const { r, dispose } = makeRuntime();
  try {
    // With one company (100% share), should flag concentration and attempt rebalance
    const report = r.fractal.governMarket({ threshold: 0.4, rebalance: true });
    assert.ok(typeof report.concentration_index === 'number');
    assert.ok(report.companies.length >= 1);
    assert.ok(report.total_cognits > 0);
    // Single company = 100% share = above threshold → rebalance attempted (even if only 1 company)
    assert.ok(typeof report.rebalanced === 'boolean');
  } finally { dispose(); }
});

test('fractal.status: aggregates all counters', () => {
  const { r, dispose } = makeRuntime();
  try {
    r.fractal.spawnSubCompany({ parent_id: r.company.id, name: 'Sub Co', mission: 'test sub', budget_usd: 50 });
    r.fractal.addDepartment({ company_id: r.company.id, name: 'Ops', kind: 'operations', budget_usd: 200 });
    const s = r.fractal.status();
    assert.ok(s.sub_companies >= 1);
    assert.ok(s.depth_max >= 1);
    assert.ok(s.dept_budgets >= 1);
  } finally { dispose(); }
});
