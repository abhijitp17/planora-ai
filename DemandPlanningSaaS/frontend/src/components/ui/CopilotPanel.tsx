'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Settings, Trash2, ChevronDown, ChevronUp, ExternalLink,
  Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, RotateCcw,
  Shield, User, Copy, ChevronRight,
} from 'lucide-react';
import {
  AI_PROVIDERS, PROVIDER_MAP, ProviderId, ProviderConfig, AdminConfig,
  ChatMessage, callProvider, buildSystemPrompt,
  saveUserConfig, loadUserConfig, saveAdminConfig, loadAdminConfig,
  saveHistory, loadHistory, clearHistory,
} from '@/lib/aiProviders';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface CopilotContext {
  activeModule: string;
  activeTab: string;
  selectedSku?: { id: string; name: string; category: string; base: number };
  horizon?: number;
  model?: string;
  selectedDataset?: string;
  kpiSummary?: Record<string, string | number>;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: CopilotContext;
}

type PanelView = 'chat' | 'settings' | 'admin';

const TIER_LABELS: Record<string, string> = { fast: '⚡ Fast', balanced: '⚖ Balanced', powerful: '🧠 Powerful' };
const TIER_COLORS: Record<string, string> = { fast: '#16a34a', balanced: '#d97706', powerful: '#7c3aed' };

// ─────────────────────────────────────────────────────────────────────────────
// Streaming message renderer
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, providerColor }: { msg: ChatMessage; providerColor: string }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{
          maxWidth: '80%', background: 'var(--accent-primary)', color: '#fff',
          borderRadius: '14px 14px 2px 14px', padding: '10px 14px',
          fontSize: '0.875rem', lineHeight: 1.55,
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: providerColor + '22', border: `1.5px solid ${providerColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', color: providerColor, fontWeight: 700, marginTop: '2px',
      }}>
        {msg.provider ? (PROVIDER_MAP[msg.provider]?.logo ?? '◆') : '◆'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
          borderRadius: '2px 14px 14px 14px', padding: '10px 14px',
          fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-main)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content || <span style={{ color: 'var(--text-muted)' }}>…</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
          {msg.model && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {msg.model}
            </span>
          )}
          <button onClick={copy} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem',
          }}>
            {copied ? <CheckCircle2 size={11} color="var(--status-good)" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider settings row
// ─────────────────────────────────────────────────────────────────────────────
function ProviderRow({
  provider, config, onChange, isActive, onActivate,
}: {
  provider: typeof AI_PROVIDERS[0];
  config?: ProviderConfig;
  onChange: (cfg: ProviderConfig) => void;
  isActive: boolean;
  onActivate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(config?.apiKey ?? '');
  const [localEndpoint, setLocalEndpoint] = useState(config?.endpoint ?? '');
  const [localModel, setLocalModel] = useState(config?.modelId ?? provider.models[0]?.id ?? '');

  const hasKey = localKey.trim().length > 0;

  const save = () => {
    onChange({
      providerId: provider.id,
      apiKey: localKey,
      modelId: localModel,
      endpoint: localEndpoint || undefined,
      enabled: hasKey,
    });
    setExpanded(false);
  };

  return (
    <div style={{
      border: `1.5px solid ${isActive && hasKey ? provider.color : 'var(--border-color)'}`,
      borderRadius: '8px', overflow: 'hidden', marginBottom: '8px',
      background: isActive && hasKey ? provider.bgColor : 'var(--bg-panel)',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', cursor: 'pointer',
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: provider.color + '18', border: `1px solid ${provider.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', color: provider.color, fontWeight: 700,
        }}>{provider.logo}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{provider.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {hasKey ? `Key configured · ${provider.models.find(m => m.id === localModel)?.label ?? localModel}` : 'No API key — click to configure'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {hasKey && (
            <button
              onClick={e => { e.stopPropagation(); onActivate(); }}
              style={{
                fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600,
                background: isActive ? provider.color : 'var(--bg-hover)',
                color: isActive ? '#fff' : 'var(--text-muted)',
              }}
            >{isActive ? '✓ Active' : 'Use'}</button>
          )}
          {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
              API Key
              <a href={provider.docsUrl} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: provider.color, fontWeight: 500 }}>
                Get key <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
              </a>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={localKey}
                onChange={e => setLocalKey(e.target.value)}
                placeholder={provider.keyPlaceholder}
                style={{
                  width: '100%', padding: '8px 36px 8px 10px',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  background: 'var(--bg-main)', color: 'var(--text-main)',
                  fontSize: '0.8rem', fontFamily: 'monospace', boxSizing: 'border-box',
                }}
              />
              <button onClick={() => setShowKey(!showKey)} style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
              }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Model</label>
            <select
              value={localModel}
              onChange={e => setLocalModel(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--border-color)',
                borderRadius: '6px', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.8rem',
              }}
            >
              {provider.models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} — {TIER_LABELS[m.tier]} — {(m.contextWindow / 1000).toFixed(0)}K ctx
                </option>
              ))}
            </select>
          </div>

          {provider.requiresEndpoint && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                Endpoint URL
              </label>
              <input
                type="text"
                value={localEndpoint}
                onChange={e => setLocalEndpoint(e.target.value)}
                placeholder="https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2024-02-01"
                style={{
                  width: '100%', padding: '8px 10px',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.75rem',
                  fontFamily: 'monospace', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setExpanded(false)} style={{ padding: '6px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cancel</button>
            <button onClick={save} disabled={!localKey.trim()} style={{
              padding: '6px 14px', border: 'none', borderRadius: '6px',
              background: hasKey ? provider.color : 'var(--border-color)',
              color: hasKey ? '#fff' : 'var(--text-muted)',
              cursor: hasKey ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600,
            }}>Save & Enable</button>
          </div>

          <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <Shield size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Keys are stored only in your browser's localStorage and sent directly to the provider. Planora never receives or logs your API keys.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Copilot Panel
// ─────────────────────────────────────────────────────────────────────────────
export default function CopilotPanel({ isOpen, onClose, context }: CopilotPanelProps) {
  const [view, setView] = useState<PanelView>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Provider state
  const [activeProvider, setActiveProvider] = useState<ProviderId>('claude');
  const [activeModel, setActiveModel] = useState<string>('claude-sonnet-4-5');
  const [userConfigs, setUserConfigs] = useState<Partial<Record<ProviderId, ProviderConfig>>>({});
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  // Admin panel state
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminDefaultProvider, setAdminDefaultProvider] = useState<ProviderId>('claude');
  const [adminAllowOverride, setAdminAllowOverride] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load persisted state ────────────────────────────────────────────────────
  useEffect(() => {
    const userSaved = loadUserConfig();
    if (userSaved) {
      setUserConfigs(userSaved.providers);
      setActiveProvider(userSaved.activeProvider);
      setActiveModel(userSaved.activeModel);
    }
    const adminSaved = loadAdminConfig();
    if (adminSaved) {
      setAdminConfig(adminSaved);
      setAdminDefaultProvider(adminSaved.defaultProviderId);
      setAdminAllowOverride(adminSaved.allowUserOverride);
      // Apply admin defaults if no user config
      if (!userSaved && adminSaved.defaultProviderId) {
        setActiveProvider(adminSaved.defaultProviderId);
      }
    }
    const history = loadHistory();
    if (history.length) {
      setMessages(history);
    } else {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m Planora Copilot. Connect an AI provider in ⚙ Settings to get started with intelligent supply chain analysis.',
        timestamp: Date.now(),
      }]);
    }
  }, []);

  // ── Persist on change ───────────────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(userConfigs).length) {
      saveUserConfig(userConfigs, activeProvider, activeModel);
    }
  }, [userConfigs, activeProvider, activeModel]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Resolve active config (admin override > user config) ────────────────────
  const effectiveConfig = useCallback((): ProviderConfig | null => {
    // Admin override: if admin locked provider, use admin config
    if (adminConfig && !adminConfig.allowUserOverride) {
      const adminProviderCfg = adminConfig.providers[adminConfig.defaultProviderId];
      if (adminProviderCfg) return adminProviderCfg;
    }
    return userConfigs[activeProvider] ?? null;
  }, [adminConfig, userConfigs, activeProvider]);

  const activeProviderMeta = PROVIDER_MAP[activeProvider];
  const activeCfg = effectiveConfig();
  const isConfigured = !!(activeCfg?.apiKey);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const cfg = effectiveConfig();
    if (!cfg || !cfg.apiKey) {
      setStreamError('No AI provider configured. Open ⚙ Settings and add an API key.');
      return;
    }

    setStreamError(null);
    setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      provider: cfg.providerId,
      model: cfg.modelId,
    };

    const systemPrompt = buildSystemPrompt({
      ...context,
      model: cfg.modelId,
    });

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setIsStreaming(true);

    abortRef.current = new AbortController();
    let accumulated = '';

    try {
      await callProvider(cfg, history, systemPrompt, ({ delta, done }) => {
        if (done) return;
        accumulated += delta;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.id === assistantMsg.id) {
            updated[updated.length - 1] = { ...last, content: accumulated };
          }
          return updated;
        });
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setStreamError(err?.message ?? 'An error occurred. Check your API key and try again.');
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, effectiveConfig, context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleClearHistory = () => {
    clearHistory();
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: 'Conversation cleared. How can I assist you?',
      timestamp: Date.now(),
    }]);
  };

  const saveAdminSettings = () => {
    const cfg: AdminConfig = {
      defaultProviderId: adminDefaultProvider,
      allowUserOverride: adminAllowOverride,
      providers: adminConfig?.providers ?? {},
    };
    setAdminConfig(cfg);
    saveAdminConfig(cfg);
    setView('settings');
  };

  if (!isOpen) return null;

  // ── Suggestion chips ─────────────────────────────────────────────────────────
  const suggestions = [
    'Summarise the current inventory risk',
    'Why is MAPE high for this SKU?',
    'Recommend a safety stock adjustment',
    'What\'s the revenue at risk this month?',
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999,
        width: '440px', background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: activeProviderMeta.color + '18', border: `1px solid ${activeProviderMeta.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: activeProviderMeta.color, fontWeight: 700,
          }}>{activeProviderMeta.logo}</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>Planora Copilot</div>
            <div style={{ fontSize: '0.7rem', color: isConfigured ? activeProviderMeta.color : 'var(--text-muted)' }}>
              {isConfigured
                ? `${activeProviderMeta.name} · ${activeCfg!.modelId}`
                : 'Not configured — click Settings'
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setView(view === 'admin' ? 'chat' : 'admin')}
              title="Admin settings"
              style={{
                background: view === 'admin' ? 'var(--bg-hover)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px',
                color: 'var(--text-muted)', display: 'flex',
              }}
            ><Shield size={16} /></button>
            <button
              onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}
              title="Provider settings"
              style={{
                background: view === 'settings' ? 'var(--bg-hover)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px',
                color: view === 'settings' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex',
              }}
            ><Settings size={16} /></button>
            <button
              onClick={handleClearHistory}
              title="Clear conversation"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', display: 'flex' }}
            ><Trash2 size={16} /></button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', display: 'flex' }}
            ><X size={16} /></button>
          </div>
        </div>

        {/* ── Context badge ───────────────────────────────────────────────────── */}
        {view === 'chat' && context.selectedSku && (
          <div style={{
            padding: '6px 16px', background: 'var(--bg-hover)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Context:</span>
            <span style={{ fontSize: '0.72rem', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {context.selectedSku.id}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{context.activeModule} · {context.activeTab}</span>
            {context.selectedDataset && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DS: {context.selectedDataset}</span>
            )}
          </div>
        )}

        {/* ── Settings view ───────────────────────────────────────────────────── */}
        {view === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>AI Provider Configuration</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Configure one or more providers. Keys are stored locally in your browser.
                {adminConfig && !adminConfig.allowUserOverride && (
                  <span style={{ color: '#d97706', fontWeight: 600 }}> Admin has locked the provider — contact your administrator to change.</span>
                )}
              </div>
            </div>

            {AI_PROVIDERS.map(provider => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                config={userConfigs[provider.id]}
                onChange={cfg => setUserConfigs(prev => ({ ...prev, [provider.id]: cfg }))}
                isActive={activeProvider === provider.id && isConfigured}
                onActivate={() => {
                  setActiveProvider(provider.id);
                  setActiveModel(userConfigs[provider.id]?.modelId ?? provider.models[0]?.id ?? '');
                  setView('chat');
                }}
              />
            ))}
          </div>
        )}

        {/* ── Admin view ──────────────────────────────────────────────────────── */}
        {view === 'admin' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {!adminAuthed ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                  <Shield size={18} color="var(--accent-primary)" />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Admin Configuration</div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Set organisation-level defaults. Admin can pre-configure API keys and restrict users from changing providers.
                </p>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && adminPassword === 'admin123') setAdminAuthed(true); }}
                  placeholder="Enter admin password"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '8px', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => { if (adminPassword === 'admin123') setAdminAuthed(true); }}
                  style={{ width: '100%', padding: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Authenticate
                </button>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>Default password: admin123 — change in production</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CheckCircle2 size={16} color="var(--status-good)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Admin authenticated</span>
                  <button onClick={() => setAdminAuthed(false)} style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Lock</button>
                </div>

                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Organisation Default Provider</label>
                <select
                  value={adminDefaultProvider}
                  onChange={e => setAdminDefaultProvider(e.target.value as ProviderId)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '16px' }}
                >
                  {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Allow user override</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Users can switch to their own API keys</div>
                  </div>
                  <div
                    onClick={() => setAdminAllowOverride(!adminAllowOverride)}
                    style={{
                      width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
                      background: adminAllowOverride ? 'var(--accent-primary)' : 'var(--border-color)',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                      position: 'absolute', top: '3px', transition: 'left 0.2s',
                      left: adminAllowOverride ? '21px' : '3px',
                    }} />
                  </div>
                </div>

                <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-main)' }}>Note:</strong> To pre-configure an organisation API key, set it in the Users Settings panel while authenticated, then save. In production, keys should be injected via environment variables on the backend.
                </div>

                <button
                  onClick={saveAdminSettings}
                  style={{ width: '100%', padding: '9px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                >
                  Save Admin Settings
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Chat view ───────────────────────────────────────────────────────── */}
        {view === 'chat' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

              {/* Not configured banner */}
              {!isConfigured && (
                <div style={{
                  background: 'var(--bg-hover)', border: '1px dashed var(--border-color)',
                  borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '16px',
                }}>
                  <Sparkles size={28} color={activeProviderMeta.color} style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>Connect an AI Provider</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Add your API key to enable intelligent supply chain analysis using Claude, GPT-4, Gemini, or 6 other models.
                  </div>
                  <button
                    onClick={() => setView('settings')}
                    style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Open Settings
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} providerColor={activeProviderMeta.color} />
              ))}

              {/* Error */}
              {streamError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
                  padding: '10px 12px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start',
                }}>
                  <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626', marginBottom: '2px' }}>Error</div>
                    <div style={{ fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.5 }}>{streamError}</div>
                  </div>
                </div>
              )}

              {/* Suggestion chips — show when no user messages */}
              {isConfigured && messages.filter(m => m.role === 'user').length === 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Suggested prompts</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        style={{
                          textAlign: 'left', padding: '8px 12px', borderRadius: '8px',
                          border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
                          color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = activeProviderMeta.color; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-panel)'; }}
                      >
                        <span>{s}</span>
                        <ChevronRight size={13} color="var(--text-muted)" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ───────────────────────────────────────────────────── */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
              {/* Provider quick-switch */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {AI_PROVIDERS.filter(p => userConfigs[p.id]?.apiKey).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProvider(p.id); setActiveModel(userConfigs[p.id]!.modelId); }}
                    title={p.name}
                    style={{
                      padding: '3px 9px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                      fontSize: '0.7rem', fontWeight: 600,
                      background: activeProvider === p.id ? p.color : p.bgColor,
                      color: activeProvider === p.id ? '#fff' : p.color,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.logo} {p.name}
                  </button>
                ))}
                {!isConfigured && (
                  <button
                    onClick={() => setView('settings')}
                    style={{ padding: '3px 9px', borderRadius: '20px', border: '1px dashed var(--border-color)', cursor: 'pointer', fontSize: '0.7rem', background: 'transparent', color: 'var(--text-muted)' }}
                  >+ Add provider</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isConfigured ? 'Ask about your supply chain…  (Enter to send, Shift+Enter for newline)' : 'Configure a provider first…'}
                  disabled={!isConfigured || isStreaming}
                  rows={1}
                  style={{
                    flex: 1, padding: '9px 12px',
                    border: `1px solid ${isStreaming ? activeProviderMeta.color : 'var(--border-color)'}`,
                    borderRadius: '10px', resize: 'none', background: 'var(--bg-main)',
                    color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.5,
                    fontFamily: 'var(--font-sans)', maxHeight: '120px', overflow: 'auto',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                />
                <button
                  onClick={isStreaming ? stopStreaming : sendMessage}
                  disabled={!isConfigured || (!isStreaming && !input.trim())}
                  style={{
                    width: '38px', height: '38px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: isStreaming ? '#dc2626' : (isConfigured && input.trim() ? activeProviderMeta.color : 'var(--border-color)'),
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.2s',
                  }}
                  title={isStreaming ? 'Stop' : 'Send'}
                >
                  {isStreaming ? <RotateCcw size={15} /> : <Send size={15} />}
                </button>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                Keys stored locally · Never sent to Planora servers · {messages.length} messages in history
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
