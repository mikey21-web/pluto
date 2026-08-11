import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime, formOrganization } from '../src/runtime.ts';
import type { PlutoRuntime } from '../src/runtime.ts';
import { buildToolFabric, fsTools, httpTool } from '../src/tools/fabric.ts';

/** Build an isolated runtime on a fresh temp dir; call dispose() when done. */
export function makeRuntime(name = 'TestCo', mission = 'Deliver 10 paying client engagements for a professional services company.'): { r: PlutoRuntime; dispose: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'pluto-test-'));
  const tools = [...buildToolFabric(), httpTool(), ...fsTools(join(dir, 'workspace'))];
  const r = createRuntime(dir, name, mission, tools);
  return {
    r,
    dispose: () => {
      try { r.state.close(); rmSync(dir, { recursive: true, force: true }); } catch { /* noop */ }
    },
  };
}

export function withOrg(name = 'TestCo', mission = 'Deliver 10 paying client engagements for a professional services company.') {
  const { r, dispose } = makeRuntime(name, mission);
  const { cascades } = formOrganization(r, mission);
  return { r, cascades, dispose };
}

/** Resolve the manager agent for a department by name. */
export function deptAgent(r: PlutoRuntime, deptName: string) {
  const dept = r.state.repos.departments(r.company.id).find(d => d.name === deptName);
  return dept?.manager_id ? r.state.repos.agent(dept.manager_id) : null;
}

export { httpTool };