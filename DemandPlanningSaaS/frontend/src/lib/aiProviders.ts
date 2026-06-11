// ─────────────────────────────────────────────────────────────────────────────
// Planora AI — AI Provider Abstraction & local Persistence
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderId = 'claude' | 'openai' | 'gemini' | 'mistral' | 'kimi' | 'grok' | 'cohere' | 'azure' | 'mscopilot';

export interface ProviderConfig {
  providerId: ProviderId;
  apiKey: string;
  modelId: string;
  endpoint?: string;
  enabled: boolean;
}

export interface AdminConfig {
  defaultProviderId: ProviderId;
  allowUserOverride: boolean;
  providers: Partial<Record<ProviderId, ProviderConfig>>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: ProviderId;
  model?: string;
}

export const AI_PROVIDERS = [
  {
    id: 'claude' as ProviderId,
    name: 'Anthropic Claude',
    logo: '▲',
    color: '#d97706',
    bgColor: '#fffbeb',
    models: [
      { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', tier: 'balanced', contextWindow: 200000 },
      { id: 'claude-3-opus', label: 'Claude 3 Opus', tier: 'powerful', contextWindow: 200000 },
      { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', tier: 'fast', contextWindow: 200000 }
    ],
    docsUrl: 'https://console.anthropic.com/',
    keyPlaceholder: 'sk-ant-...',
    requiresEndpoint: false,
  },
  {
    id: 'openai' as ProviderId,
    name: 'OpenAI GPT',
    logo: '●',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', tier: 'powerful', contextWindow: 128000 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'fast', contextWindow: 128000 }
    ],
    docsUrl: 'https://platform.openai.com/',
    keyPlaceholder: 'sk-...',
    requiresEndpoint: false,
  },
  {
    id: 'gemini' as ProviderId,
    name: 'Google Gemini',
    logo: '✦',
    color: '#2563eb',
    bgColor: '#eff6ff',
    models: [
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tier: 'powerful', contextWindow: 1000000 },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tier: 'fast', contextWindow: 1000000 }
    ],
    docsUrl: 'https://aistudio.google.com/',
    keyPlaceholder: 'AIzaSy...',
    requiresEndpoint: false,
  },
  {
    id: 'mistral' as ProviderId,
    name: 'Mistral AI',
    logo: '◆',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    models: [
      { id: 'mistral-large', label: 'Mistral Large', tier: 'powerful', contextWindow: 32000 },
      { id: 'mistral-small', label: 'Mistral Small', tier: 'fast', contextWindow: 32000 }
    ],
    docsUrl: 'https://console.mistral.ai/',
    keyPlaceholder: 'Key...',
    requiresEndpoint: false,
  },
  {
    id: 'grok' as ProviderId,
    name: 'xAI Grok',
    logo: '✕',
    color: '#000000',
    bgColor: '#f3f4f6',
    models: [
      { id: 'grok-beta', label: 'Grok Beta', tier: 'balanced', contextWindow: 128000 }
    ],
    docsUrl: 'https://console.x.ai/',
    keyPlaceholder: 'xai-...',
    requiresEndpoint: false,
  },
  {
    id: 'azure' as ProviderId,
    name: 'Azure OpenAI',
    logo: '❖',
    color: '#0078d4',
    bgColor: '#f3f9fe',
    models: [
      { id: 'azure-gpt-4o', label: 'Azure GPT-4o', tier: 'powerful', contextWindow: 128000 }
    ],
    docsUrl: 'https://portal.azure.com/',
    keyPlaceholder: 'Key...',
    requiresEndpoint: true,
  }
];

export const PROVIDER_MAP = AI_PROVIDERS.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {} as Record<ProviderId, typeof AI_PROVIDERS[0]>);

// ── LocalStorage Helpers ──────────────────────────────────────────────────────

const KEYS = {
  USER_CONFIG: 'planora_user_config',
  ADMIN_CONFIG: 'planora_admin_config',
  HISTORY: 'planora_copilot_history',
};

export function saveUserConfig(
  providers: Partial<Record<ProviderId, ProviderConfig>>,
  activeProvider: ProviderId,
  activeModel: string
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    KEYS.USER_CONFIG,
    JSON.stringify({ providers, activeProvider, activeModel })
  );
}

export function loadUserConfig(): {
  providers: Partial<Record<ProviderId, ProviderConfig>>;
  activeProvider: ProviderId;
  activeModel: string;
} | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.USER_CONFIG);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAdminConfig(config: AdminConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.ADMIN_CONFIG, JSON.stringify(config));
}

export function loadAdminConfig(): AdminConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.ADMIN_CONFIG);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(messages));
}

export function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEYS.HISTORY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.HISTORY);
}

// ── Prompt Builders ──────────────────────────────────────────────────────────

export function buildSystemPrompt(context: {
  activeModule: string;
  activeTab: string;
  selectedSku?: { id: string; name: string; category: string; base: number };
  horizon?: number;
  model?: string;
  selectedDataset?: string;
  kpiSummary?: Record<string, string | number>;
}): string {
  return `You are Planora AI Copilot, an enterprise supply chain expert and tactical demand assistant.
The user is currently browsing the Planora AI demand planning platform.

CURRENT SESSION CONTEXT:
- Active Module: ${context.activeModule || 'None'}
- Active Tab: ${context.activeTab || 'None'}
- Selected SKU: ${context.selectedSku ? `${context.selectedSku.name} (${context.selectedSku.id})` : 'None'}
- Forecasting Algorithm: ${context.model || 'None'}
- Forecast Horizon: ${context.horizon || 6} periods
- Loaded Dataset: ${context.selectedDataset || 'None'}

Please provide concise, executive-level summaries, calculations, and recommendations. Support decisions with metrics like WMAPE, Safety Stock, Turns, and Working Capital.`;
}

// ── Streaming API Call Interface ──────────────────────────────────────────────

export async function callProvider(
  config: ProviderConfig,
  history: ChatMessage[],
  systemPrompt: string,
  onChunk: (data: { delta: string; done: boolean }) => void
): Promise<void> {
  const userMessage = history[history.length - 1]?.content || '';
  
  // Custom mock replies for common supply chain planning questions
  const query = userMessage.toLowerCase().trim();
  let reply = '';

  if (query.includes('summarise') || query.includes('summarize') || query.includes('inventory risk')) {
    reply = `Based on the active dataset ${config.modelId ? `processed by ${config.modelId}` : ''}:

1. **Excess & Obsolete (E&O) Risk**: We have approximately **$300,000** in capital trapped in slow-moving items, primarily driven by 85" OLED TVs and standing desks (Inventory Turns < 1.8x).
2. **Stockout Exposures**: High stockout vulnerability detected for **Wireless Gaming Mouse** due to a projected 35% online promotional demand spike. Days of Supply stands at **4 days** against a lead time of 30 days.
3. **Supplier Variabilities**: Inbound lead time variance for Apex Electronics has breached 3-sigma thresholds (±14 days), risking the high-end monitor Q4 launch.

**Recommended Action**: Shift 30% of incoming order allocation from Apex Electronics to Tech Assembly Partners to de-risk the Q4 revenue target.`;
  } else if (query.includes('mape') || query.includes('why is error high')) {
    reply = `The forecast error (MAPE) is elevated for this SKU due to the following factors:

1. **High Volatility (CV = 0.35)**: The demand signal has significant noise, exhibiting intermittent, lumpy sales rather than smooth trends.
2. **Promotional Spikes**: Uncoordinated promotional events created abnormal demand peaks that standard statistical models (SES and Moving Average) failed to capture.
3. **Model Selection**: Switching from standard Moving Average to **XGBoost** or a **LightGBM Ensemble** reduces forecast error by **4.6%** (improving MAPE from 8.5% down to 3.9%).

**Recommendation**: Shift planning baseline from Moving Average to the ML Ensemble model for Q4 cycles.`;
  } else if (query.includes('safety stock') || query.includes('recommend a safety stock')) {
    reply = `Based on a target service level of 95%, I recommend the following safety stock adjustments:

1. **Ergonomic Office Chair**: **Reduce safety stock from 250 to 220 units** (a 12% reduction). The demand coefficient of variation (CV) smoothed from 0.45 to 0.15, liberating **$14,000** in working capital.
2. **Wireless Gaming Mouse**: **Increase safety stock by 15%** immediately to act as a buffer against upcoming online channel campaigns.

Would you like me to draft these safety stock overrides for the replenishment workbench?`;
  } else if (query.includes('revenue') || query.includes('lost sales')) {
    reply = `Our current estimated Lost Sales stand at **$432,500** across the network, primarily due to backorders on accessories. 

The category breakdown:
* **Accessories**: $280,000 (driven by Wireless Gaming Mouse stockouts)
* **Electronics**: $120,500 (OLED TV inbound transport delays)
* **Furniture**: $32,000 (minor office chair stockouts)

Expediting Inbound PO #4992 will resolve the Accessories bottleneck and capture $180k of this margin this month.`;
  } else {
    // General supply chain expert assistant response
    reply = `Planora Copilot here! I've analyzed your current workspace context.

* **Context SKU**: ${history.length > 2 ? 'Active SKU' : 'Global portfolio'}
* **AI Model Analysis**: Applying ${config.modelId} to compute optimal coefficients.

Based on current demand curves, I recommend monitoring your Q4 promotional schedule closely as raw baseline metrics indicate a potential capacity bottleneck at warehouse WH_MAIN.

How can I help you adjust your consensus parameters or inventory models?`;
  }

  // Simulate streaming response to make it look realistic and dynamic
  const words = reply.split(' ');
  let currentText = '';

  for (let i = 0; i < words.length; i++) {
    currentText += words[i] + ' ';
    onChunk({ delta: words[i] + ' ', done: false });
    // small delay to simulate generation
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
  }

  onChunk({ delta: '', done: true });
}
