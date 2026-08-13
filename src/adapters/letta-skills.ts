import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface LettaSkillsAdapter {
  listSkills(): string[];
  getSkillPrompt(name: string): string | null;
}

export function makeLettaSkillsAdapter(skillsDir?: string): LettaSkillsAdapter {
  if (skillsDir && existsSync(skillsDir)) {
    return {
      listSkills() { return readdirSync(skillsDir).filter(f => f.endsWith('.md') || f.endsWith('.txt')).map(f => f.replace(/\.\w+$/, '')); },
      getSkillPrompt(name) {
        for (const ext of ['.md', '.txt']) {
          const p = join(skillsDir, name + ext);
          if (existsSync(p)) return readFileSync(p, 'utf8');
        }
        return null;
      },
    };
  }

  return {
    listSkills() { console.log('[LettaSkills stub] listSkills (no skillsDir)'); return []; },
    getSkillPrompt(name) { console.log(`[LettaSkills stub] getSkillPrompt ${name}`); return null; },
  };
}
