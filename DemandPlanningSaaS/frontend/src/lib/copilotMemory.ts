/**
 * Copilot Memory System — Persistent preferences across sessions
 * Priority 3: Remembers user preferences, frequent actions, context
 */

interface CopilotMemory {
  preferences: Record<string, string>;  // "preferred_model": "xgboost"
  frequentActions: Array<{ action: string; count: number }>;
  lastContext: Record<string, any>;
  savedAt: string;
}

const MEMORY_KEY = 'planora_copilot_memory';

export function loadMemory(): CopilotMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : { preferences: {}, frequentActions: [], lastContext: {}, savedAt: '' };
  } catch { return { preferences: {}, frequentActions: [], lastContext: {}, savedAt: '' }; }
}

export function saveMemory(memory: CopilotMemory) {
  try {
    memory.savedAt = new Date().toISOString();
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {}
}

export function addPreference(key: string, value: string) {
  const mem = loadMemory();
  mem.preferences[key] = value;
  saveMemory(mem);
}

export function trackAction(action: string) {
  const mem = loadMemory();
  const existing = mem.frequentActions.find(a => a.action === action);
  if (existing) existing.count++;
  else mem.frequentActions.push({ action, count: 1 });
  mem.frequentActions.sort((a, b) => b.count - a.count);
  mem.frequentActions = mem.frequentActions.slice(0, 20);
  saveMemory(mem);
}

export function buildMemoryPrompt(): string {
  const mem = loadMemory();
  if (Object.keys(mem.preferences).length === 0 && mem.frequentActions.length === 0) return '';
  
  let prompt = '\n\nUSER MEMORY (from previous sessions):\n';
  if (Object.keys(mem.preferences).length > 0) {
    prompt += 'Preferences: ' + Object.entries(mem.preferences).map(([k,v]) => `${k}=${v}`).join(', ') + '\n';
  }
  if (mem.frequentActions.length > 0) {
    prompt += 'Frequent actions: ' + mem.frequentActions.slice(0, 5).map(a => a.action).join(', ') + '\n';
  }
  return prompt;
}
