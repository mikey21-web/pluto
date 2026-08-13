// REPO: https://github.com/zhaoxuya520/reverse-skill
// CAPABILITY: Cybersecurity skill router for AI agents — routes APK/binary/JS/CTF/pentest tasks to the right methodology, toolchain, and playbook
// INSTALL: self-host (clone repo, copy skills/ into AI agent harness)
// INTEGRATION: http-client (reverse-skill can expose a local routing API) | research (primarily a skill/CLAUDE.md pack)

export type ReverseSkillTarget = 'apk' | 'elf' | 'js' | 'pcap' | 'ctf' | 'pentest' | 'firmware' | 'unknown';

export interface ReverseSkillRouteResult {
  target: ReverseSkillTarget;
  methodology: string;
  recommendedTools: string[];
  playbook: string[];
  ruleId?: string;
}

export interface ReverseSkillFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence?: string;
  path?: string;
}

export interface ReverseSkillAdapter {
  route(task: string, targetType?: ReverseSkillTarget): Promise<ReverseSkillRouteResult>;
  analyzeTarget(targetPath: string, targetType: ReverseSkillTarget): Promise<{ jobId: string; status: 'queued' | 'running' | 'complete' }>;
  getFindings(jobId: string): Promise<ReverseSkillFinding[]>;
  listPlaybooks(): Promise<Array<{ id: string; name: string; targetType: ReverseSkillTarget }>>;
  getStatus(): Promise<{ connected: boolean; rulesLoaded?: number }>;
}

export function makeReverseSkillAdapter(config?: { baseUrl?: string; apiKey?: string }): ReverseSkillAdapter {
  const { baseUrl, apiKey } = config ?? {};

  if (baseUrl) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async route(task, targetType) {
        const r = await fetch(`${baseUrl}/api/route`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ task, target_type: targetType }),
        });
        if (!r.ok) throw new Error(`reverse-skill route: ${r.status}`);
        return r.json() as Promise<ReverseSkillRouteResult>;
      },
      async analyzeTarget(targetPath, targetType) {
        const r = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ target_path: targetPath, target_type: targetType }),
        });
        if (!r.ok) throw new Error(`reverse-skill analyzeTarget: ${r.status}`);
        return r.json() as Promise<{ jobId: string; status: 'queued' | 'running' | 'complete' }>;
      },
      async getFindings(jobId) {
        const r = await fetch(`${baseUrl}/api/jobs/${jobId}/findings`, { headers: headers() });
        if (!r.ok) throw new Error(`reverse-skill getFindings: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.findings ?? []);
      },
      async listPlaybooks() {
        const r = await fetch(`${baseUrl}/api/playbooks`, { headers: headers() });
        if (!r.ok) throw new Error(`reverse-skill listPlaybooks: ${r.status}`);
        const j = await r.json() as any;
        return Array.isArray(j) ? j : (j.playbooks ?? []);
      },
      async getStatus() {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers: headers() });
          if (!r.ok) return { connected: false };
          const j = await r.json() as any;
          return { connected: true, rulesLoaded: j.rules_loaded };
        } catch {
          return { connected: false };
        }
      },
    };
  }

  return {
    async route(task) {
      console.log(`[ReverseSkill stub] route: ${task.slice(0, 80)}`);
      return {
        target: 'unknown',
        methodology: '[ReverseSkill not configured — set baseUrl]',
        recommendedTools: [],
        playbook: [],
      };
    },
    async analyzeTarget(targetPath) {
      console.log(`[ReverseSkill stub] analyzeTarget: ${targetPath}`);
      return { jobId: 'stub-job', status: 'queued' };
    },
    async getFindings() { return []; },
    async listPlaybooks() { return []; },
    async getStatus() { return { connected: false }; },
  };
}
