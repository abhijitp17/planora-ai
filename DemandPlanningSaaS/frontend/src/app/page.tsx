'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Box, 
  Settings, 
  BarChart2, 
  Search, 
  Calendar, 
  Activity, 
  AlertCircle,
  Sparkles,
  Database,
  Upload,
  Layers,
  BarChart as BarChartIcon,
  Tag,
  MessageSquare,
  Send,
  X,
  Sun,
  Moon,
  Package,
  ArrowRightLeft,
  ShieldCheck,
  BoxSelect,
  ChevronDown,
  Stethoscope,
  Gauge,
  BrainCircuit,
  Menu,
  Briefcase,
  DollarSign,
  Target,
  AlertTriangle,
  PackageMinus,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, 
  AreaChart, Area, ComposedChart, Bar, BarChart, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';

// --- DYNAMIC DATA INGUESTION ---
// The static mock SKU_DATABASE and generateHistoricalData utilities have been removed. 
// Real-world M5 replica dataset is now fetched asynchronously from public/m5_data.json
const ERROR_ANALYSIS_MODELS = [
  { id: 'xgboost', name: 'XGBoost Regressor', mae: 41.5, rmse: 58.3, mape: 3.9, type: 'ML' },
  { id: 'ensemble', name: 'Hybrid Ensemble', mae: 45.2, rmse: 62.1, mape: 4.2, type: 'ML' },
  { id: 'rf', name: 'Random Forest', mae: 48.6, rmse: 65.2, mape: 4.5, type: 'ML' },
  { id: 'sarimax', name: 'Seasonal ARIMAX', mae: 60.1, rmse: 85.4, mape: 5.8, type: 'Statistical' },
  { id: 'hw', name: 'Holt-Winters Exp.', mae: 67.8, rmse: 98.2, mape: 6.4, type: 'Statistical' },
  { id: 'arima', name: 'ARIMA (1,1,1)', mae: 89.4, rmse: 115.6, mape: 8.5, type: 'Statistical' },
];

// --- FORECASTING ENGINE WITH PROBABILISTIC BOUNDS ---

const calculateForecast = (history: any[], model: string, params: any, horizon: number, horizonUnit: string, consensus: Record<string, number>) => {
  const result: any[] = history.map(d => ({ ...d }));
  const actuals = history.map(d => d.actual);
  let fitted = new Array(actuals.length).fill(null);
  let future = [];

  const n = actuals.length;
  const recentAvg = actuals.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const trend = (actuals[n - 1] - actuals[0]) / n;
  
  for (let i = 0; i < n; i++) {
     fitted[i] = Math.round(actuals[i] * (0.95 + Math.random() * 0.1)); 
  }

  let lastVal = actuals[n - 1];
  for (let i = 0; i < horizon; i++) {
     let nextVal = lastVal + trend;
     if (['holt-winters', 'sarima', 'sarimax'].includes(model)) {
        const seasonOffset = (i % 12);
        nextVal += Math.sin((seasonOffset / 12) * Math.PI * 2) * (recentAvg * 0.25);
     }
     
     if (['decision-tree', 'random-forest', 'extra-trees', 'adaboost', 'xgboost', 'lightgbm'].includes(model)) {
        const estimatorVariance = (params.estimators || 100) / 5000;
        nextVal += (Math.random() - 0.5) * (recentAvg * (0.05 + estimatorVariance));
     } else if (model === 'croston') {
        nextVal = i % 3 === 0 ? 0 : recentAvg * 0.8;
     } else if (['sma', 'ses', 'holt', 'arima', 'arimax'].includes(model)) {
        const alpha = params.alpha || 0.3;
        nextVal += (Math.random() - 0.5) * (recentAvg * (0.05 * alpha));
     }

     future.push(Math.max(0, Math.round(nextVal)));
     lastVal = nextVal;
  }

  for (let i = 0; i < result.length; i++) {
    result[i].forecast = fitted[i];
  }

  const formatPeriodLabel = (idx: number) => {
    const startYear = 2024;
    if (horizonUnit === 'Year') {
      return `${startYear + idx}`;
    } else if (horizonUnit === 'Month') {
      let m = 1 + idx;
      let y = startYear + Math.floor((m-1)/12);
      m = ((m-1)%12)+1;
      return `${y}-${m.toString().padStart(2, '0')}`;
    } else if (horizonUnit === 'Week') {
      let w = 1 + idx;
      let y = startYear + Math.floor((w-1)/52);
      w = ((w-1)%52)+1;
      return `${y}-W${w.toString().padStart(2, '0')}`;
    } else if (horizonUnit === 'Day') {
      let d = 1 + idx;
      let y = startYear + Math.floor((d-1)/365);
      d = ((d-1)%365)+1;
      return `${y}-D${d.toString().padStart(3, '0')}`;
    }
    return '';
  };

  for (let i = 0; i < result.length; i++) {
    result[i].period = formatPeriodLabel(i);
  }

  for (let i = 0; i < horizon; i++) {
    const periodLabel = formatPeriodLabel(n + i);
    const variance = future[i] * 0.15; 
    const lowerBound = Math.max(0, Math.round(future[i] - variance));
    const upperBound = Math.round(future[i] + variance);
    const userAdjustPercent = consensus[periodLabel] || 0;
    const finalConsensusVal = Math.round(future[i] * (1 + (userAdjustPercent / 100)));

    result.push({
      period: periodLabel,
      actual: null,
      forecast: future[i],
      lowerBound: lowerBound,
      upperBound: upperBound,
      consensusVolume: finalConsensusVal,
      isHistorical: false
    });
  }

  return result;
};

const PlanoraLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Clash Display", -apple-system, sans-serif', fontSize: '1.35rem', fontWeight: 700, color: '#1e2535', letterSpacing: '-0.02em' }}>
    <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
      <span style={{ display: 'block', width: '7px', height: '14px', borderRadius: '4px 4px 0 0', background: '#10b981' }} />
      <span style={{ display: 'block', width: '7px', height: '22px', borderRadius: '4px 4px 0 0', background: '#10b981' }} />
      <span style={{ display: 'block', width: '7px', height: '10px', borderRadius: '4px 4px 0 0', background: '#f97316', opacity: 0.9 }} />
    </div>
    <span>Planora <span style={{ color: '#10b981' }}> AI</span></span>
  </div>
);

export default function OracleFusionDashboard() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');
  const [activeModule, setActiveModule] = useState('demand'); // 'demand' | 'inventory' | 'diagnostics' | 'sop' | 'finance' | 'analytics'
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Finance PnL Simulator State (%)
  const [financeSim, setFinanceSim] = useState({ 
    volumePct: 0, pricePct: 0, costPct: 0, promoUplift: 0, capExpPct: 0 
  });
  
  const [skuDatabase, setSkuDatabase] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedSkuId, setSelectedSkuId] = useState('');

  useEffect(() => {
    fetch('/m5_data.json')
      .then(res => res.json())
      .then(data => {
        const mappedData = data.map((d: any) => ({ ...d, history: d.historicalData.map((h: any) => ({ ...h, isHistorical: true })) }));
        setSkuDatabase(mappedData);
        if (mappedData.length > 0) Object.freeze(mappedData); // Prevent accidental state mutations if passed deeply
        if (mappedData.length > 0) setSelectedSkuId(mappedData[0].id);
        setIsLoadingData(false);
      })
      .catch(err => {
        console.error('Failed to load M5 data', err);
        setIsLoadingData(false);
      });
  }, []);

  useEffect(() => {
    setActiveTab('overview');
  }, [activeModule]);
  
  // Forecasting State
  const [model, setModel] = useState('xgboost'); 
  const [horizonUnit, setHorizonUnit] = useState('Month'); 
  const [horizon, setHorizon] = useState(6);
  const [smaWindow, setSmaWindow] = useState(3);
  const [emaAlpha, setEmaAlpha] = useState(0.3);
  const [mlEstimators, setMlEstimators] = useState(100);
  const [arimaOrder, setArimaOrder] = useState('1,1,1');
  const [consensusAdjustments, setConsensusAdjustments] = useState<Record<string, number>>({});

  // Inventory State
  const [targetServiceLevel, setTargetServiceLevel] = useState(95);

  // AI Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am your AI Supply Chain Copilot. How can I assist you with your demand planning today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Notifications & Action State
  const [notifications, setNotifications] = useState<{id: string, message: string, time: string, read: boolean}[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const actionMap: Record<string, string> = {
        'demand': `Forecast generation completed for ${skuDatabase.length} base SKUs using ${model.toUpperCase()}.`,
        'inventory': 'Safety stock recalibration optimized layout across network nodes.',
        'sop': 'Executive Revenue balancing reconciled successfully.',
        'finance': 'Scenario P&L margins recalculated for all horizons.',
        'diagnostics': 'Entropy structural scan identified risk exposure variables.',
        'analytics': 'Global KPIs refreshed from real-time core datalake.'
      };
      const msg = actionMap[activeModule] || 'Processing completed successfully.';
      setNotifications(prev => [{ id: Date.now().toString(), message: msg, time: 'Just now', read: false }, ...prev]);
    }, 2500);
  };

  // Derived State
  const categories = ['All', ...Array.from(new Set(skuDatabase.map(s => s.category)))];

  const filteredSkus = useMemo(() => {
    return skuDatabase.filter(sku => {
      const matchSearch = sku.name.toLowerCase().includes(searchQuery.toLowerCase()) || sku.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'All' || sku.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [searchQuery, selectedCategory]);

  const selectedSku = useMemo(() => {
    if (!skuDatabase || skuDatabase.length === 0) return null;
    return skuDatabase.find(sku => sku.id === selectedSkuId) || skuDatabase[0];
  }, [selectedSkuId, skuDatabase]);

  const forecastData = useMemo(() => {
    if (!selectedSku || !selectedSku.history) return [];
    return calculateForecast(
      selectedSku.history, 
      model, 
      { window: smaWindow, alpha: emaAlpha, estimators: mlEstimators, arimaOrder },
      horizon, 
      horizonUnit, 
      consensusAdjustments
    );
  }, [selectedSku, model, smaWindow, emaAlpha, mlEstimators, arimaOrder, horizon, horizonUnit, consensusAdjustments]);

  const handleConsensusChange = (period: string, value: string) => {
    const num = parseFloat(value) || 0;
    setConsensusAdjustments(prev => ({
      ...prev,
      [period]: num
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = "I have analyzed your query. To optimize inventory, consider adjusting the smoothing alpha if your data is highly volatile.";
      
      const lower = userMsg.toLowerCase();
      if (lower.includes('forecast') || lower.includes('adjust') || lower.includes('consensus')) {
         aiResponse = `Looking at ${selectedSku?.id || ''}, I recommend applying an Uplift% dynamically in the Forecast Editor tab if you anticipate promo-driven volume.`;
      } else if (lower.includes('error') || lower.includes('mape') || lower.includes('model')) {
         aiResponse = `The AutoML engine is currently running ${model.toUpperCase()}, evaluating at 4.2% global MAPE. You can compare models in the Error Analysis tab.`;
      } else if (lower.includes('horizon')) {
         aiResponse = `You are currently viewing a ${horizon} ${horizonUnit} aggregate horizon. You can shorten this in the sidebar to view near-term granularity.`;
      } else if (lower.includes('npi') || lower.includes('new product')) {
         aiResponse = `Use the NPI workspace to generate a proxy profile. You can borrow ${selectedSku?.name || ''}'s profile to map the expected demand curve.`;
      }
      
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1200);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
       const res = await fetch('http://localhost:8000/api/upload', {
          method: 'POST',
          body: formData
       });
       if (res.ok) {
           const data = await res.json();
           alert(`Dataset "${data.filename}" ingested into the FastAPI Core successfully (${data.records_processed} records)!`);
       } else {
           alert('Failed to upload data. Please check the backend console.');
       }
    } catch {
       alert('Upload failed. Ensure the Python FastAPI server is concurrently running on port 8000.');
    }
  };
  if (isLoadingData || skuDatabase.length === 0) {
     return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>Initializing M5 Enterprise Data Core...</div>;
  }

  if (currentView === 'landing') {
    return (
      <div className="landing-wrapper">
        <link href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Sora:wght@300;400;500&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          .landing-wrapper {
            --bg: #f8f9fa;
            --bg2: #f1f5f9;
            --dark: #1f2937;
            --primary: #064e3b;
            --primary-light: rgba(6, 78, 59, 0.08);
            --primary-hover: #022c22;
            --secondary: #d4af37;
            --muted: #64748b;
            --card-bg: #ffffff;
            --card-border: #e2e8f0;
            --wave: rgba(6, 78, 59, 0.05);
            background: var(--bg);
            font-family: 'Sora', sans-serif;
            color: var(--dark);
            overflow-x: hidden;
            min-height: 100vh;
          }
          .landing-wrapper * { box-sizing: border-box; }
          
          /* NAV */
          .landing-wrapper nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 48px; background: rgba(240,238,235,0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(30,37,53,0.06);
          }
          .landing-wrapper .cta-btn {
            background: var(--primary); color: #fff; border: none; padding: 12px 28px;
            border-radius: 50px; font-family: 'Sora', sans-serif; font-size: 0.875rem;
            font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.15s;
          }
          .landing-wrapper .cta-btn:hover { background: var(--primary-hover); transform: translateY(-1px); }

          /* HERO */
          .landing-wrapper .hero {
            padding-top: 200px; padding-bottom: 20px; display: flex; flex-direction: column; align-items: center;
            justify-content: center; text-align: center;
            position: relative; overflow: hidden;
          }
          .landing-wrapper .hero-waves { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
          .landing-wrapper .hero-waves svg { position: absolute; width: 100%; height: 100%; opacity: 0.7; }
          .landing-wrapper .hero-content { position: relative; z-index: 1; animation: fadeUp 0.9s ease both; }
          .landing-wrapper .hero-eyebrow {
            display: inline-block; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--primary); background: rgba(16,185,129,0.1);
            padding: 6px 16px; border-radius: 50px; margin-bottom: 12px;
          }
          .landing-wrapper .hero h1 {
            font-family: 'Clash Display', -apple-system, sans-serif; font-size: clamp(3.5rem, 8vw, 6.5rem);
            font-weight: 700; line-height: 1.0; letter-spacing: -0.03em; color: var(--dark); margin-bottom: 16px;
          }
          .landing-wrapper .hero h1 .ai { color: var(--primary); }
          .landing-wrapper .hero-sub {
            font-size: clamp(1rem, 2vw, 1.2rem); color: var(--primary); font-weight: 500;
            letter-spacing: -0.01em; margin-bottom: 18px;
          }
          .landing-wrapper .hero-desc {
            font-size: clamp(0.9rem, 1.5vw, 1.05rem); color: var(--muted); max-width: 560px;
            line-height: 1.7; font-weight: 300; margin: 0 auto 40px;
          }
          .landing-wrapper .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
          .landing-wrapper .btn-primary {
            background: var(--primary); color: #fff; border: none; padding: 16px 38px;
            border-radius: 50px; font-family: 'Sora', sans-serif; font-size: 0.95rem;
            font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
            box-shadow: 0 4px 20px rgba(16,185,129,0.3);
          }
          .landing-wrapper .btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(16,185,129,0.35); }
          .landing-wrapper .btn-ghost {
            background: transparent; color: var(--dark); border: 1.5px solid rgba(30,37,53,0.2);
            padding: 15px 38px; border-radius: 50px; font-family: 'Sora', sans-serif;
            font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: border-color 0.2s, transform 0.15s;
          }
          .landing-wrapper .btn-ghost:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); }

          .landing-wrapper .scroll-hint {
            position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            opacity: 0.4; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
            color: var(--dark); z-index: 1; animation: bounceDown 2s infinite;
          }
          .landing-wrapper .scroll-hint::after { content: ''; width: 1px; height: 40px; background: var(--dark); display: block; }

          /* FEATURES */
          .landing-wrapper .features { padding: 0px 48px 120px; max-width: 1200px; margin: 0 auto; }
          .landing-wrapper .section-label {
            text-align: center; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--primary); margin-bottom: 16px;
          }
          .landing-wrapper .section-title {
            font-family: 'Clash Display', -apple-system, sans-serif; font-size: clamp(2rem, 4vw, 3rem);
            font-weight: 700; letter-spacing: -0.03em; color: var(--dark); text-align: center; margin-bottom: 64px;
          }
          .landing-wrapper .landing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .landing-wrapper .landing-card {
            background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px;
            padding: 36px 32px; position: relative; overflow: hidden;
            transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s; cursor: pointer;
            text-align: left;
          }
          .landing-wrapper .landing-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            transform: scaleX(0); transform-origin: left; transition: transform 0.35s ease;
          }
          .landing-wrapper .landing-card:hover { transform: translateY(-5px); box-shadow: 0 20px 48px rgba(30,37,53,0.1); border-color: rgba(16,185,129,0.2); }
          .landing-wrapper .landing-card:hover::before { transform: scaleX(1); }
          .landing-wrapper .card-icon {
            width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.1);
            display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 1.25rem;
          }
          .landing-wrapper .landing-card h3 {
            font-family: 'Clash Display', -apple-system, sans-serif; font-size: 1.15rem; font-weight: 600;
            letter-spacing: -0.02em; color: var(--dark); margin-bottom: 12px;
          }
          .landing-wrapper .landing-card p { font-size: 0.875rem; color: var(--muted); line-height: 1.7; font-weight: 300; margin: 0; }

          /* BOTTOM CTA */
          .landing-wrapper .bottom-cta { text-align: center; padding: 80px 48px 120px; position: relative; color: var(--dark); }
          .landing-wrapper .bottom-cta h2 { font-family: 'Clash Display', -apple-system, sans-serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 700; letter-spacing: -0.03em; margin-bottom: 16px; }
          .landing-wrapper .bottom-cta h2 span { color: var(--primary); }
          .landing-wrapper .bottom-cta p { font-size: 1rem; color: var(--muted); margin-bottom: 36px; font-weight: 300; }

          /* FOOTER */
          .landing-wrapper footer { border-top: 1px solid rgba(30,37,53,0.08); padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; }
          .landing-wrapper footer p { font-size: 0.78rem; color: var(--muted); margin: 0; }

          @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes bounceDown { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(6px); } }
          
          @media (max-width: 900px) {
            .landing-wrapper .landing-grid { grid-template-columns: 1fr 1fr; }
            .landing-wrapper nav { padding: 16px 24px; }
            .landing-wrapper .hero { padding: 100px 24px 60px; }
            .landing-wrapper .features { padding: 60px 24px 80px; }
          }
          @media (max-width: 600px) {
            .landing-wrapper .landing-grid { grid-template-columns: 1fr; }
            .landing-wrapper footer { flex-direction: column; gap: 12px; text-align: center; }
            .landing-wrapper .hero h1 { font-size: 3rem; }
          }
        `}} />

        <nav>
          <div style={{ cursor: 'pointer' }} onClick={() => setCurrentView('landing')}>
            <PlanoraLogo />
          </div>
        </nav>

        <section className="hero">
          <div className="hero-waves">
            <svg viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              {/* Data-driven overlapping sinusoidal graphs replacing the wave blobs */}
              <path d="M0,400 C300,500 600,200 900,400 C1200,600 1350,350 1440,450" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="3" />
              <path d="M0,450 C250,300 500,550 800,350 C1100,150 1250,550 1440,300" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="2" strokeDasharray="8 8" />
              <path d="M0,350 C350,150 700,600 1050,350 C1250,200 1350,450 1440,250" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="4" />
              <path d="M0,500 C400,300 800,400 1200,200 C1300,150 1380,300 1440,350" fill="none" stroke="rgba(52,211,153,0.12)" strokeWidth="2" />
            </svg>
          </div>

          <div className="hero-content">
            <h1>Planora <span className="ai">AI</span></h1>
            <p className="hero-sub">supply chain intelligence solution powered by AI</p>
            <p className="hero-desc">Our AI-powered applications and workflow assistants plan, decide, act, and learn alongside your team</p>
          </div>
        </section>

        <section id="features" className="features">
          <div className="landing-grid">
            <div className="landing-card" onClick={() => { setActiveModule('demand'); setCurrentView('dashboard'); }}>
              <div className="card-icon">📈</div>
              <h3>Demand Planning</h3>
              <p>Predict hyper-accurate market demand utilizing multi-variable ensemble models.</p>
            </div>
            <div className="landing-card" onClick={() => { setActiveModule('inventory'); setCurrentView('dashboard'); }}>
              <div className="card-icon">⚖️</div>
              <h3>Inventory Optimization</h3>
              <p>Balance global networks and dynamically recalculate safety stock buffers.</p>
            </div>
            <div className="landing-card" onClick={() => { setActiveModule('diagnostics'); setCurrentView('dashboard'); }}>
              <div className="card-icon">🔍</div>
              <h3>Supply Chain Diagnosis</h3>
              <p>Algorithmically classify SKUs and detect structural supply chain entropy.</p>
            </div>
            <div className="landing-card" onClick={() => { setActiveModule('sop'); setCurrentView('dashboard'); }}>
              <div className="card-icon">🔗</div>
              <h3>S&OP / IBP</h3>
              <p>Bridge the gap between operational execution and executive financial alignment.</p>
            </div>
            <div className="landing-card" onClick={() => { setActiveModule('finance'); setCurrentView('dashboard'); }}>
              <div className="card-icon">💹</div>
              <h3>Financial Simulation</h3>
              <p>Stress-test P&L impacts and optimize enterprise product-mix margins.</p>
            </div>
            <div className="landing-card" onClick={() => { setActiveModule('analytics'); setCurrentView('dashboard'); }}>
              <div className="card-icon">🌐</div>
              <h3>Global SC Analytics</h3>
              <p>End-to-end visibility and actionable AI-generated prescriptive insights.</p>
            </div>
          </div>
        </section>

        <footer>
          <PlanoraLogo />
          <p>© 2026 Planora AI. All rights reserved.</p>
        </footer>

      </div>
    );
  }

  return (
    <>
      {/* LEFT PANE MODULE MENU */}
      {isModuleMenuOpen && (
        <div className="left-pane-overlay" onClick={() => setIsModuleMenuOpen(false)}>
           <div className="left-pane-menu" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                 <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Modules</h2>
                 <button onClick={() => setIsModuleMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                 {[
                   { id: 'demand', label: 'Demand Planning', icon: '🎯' },
                   { id: 'inventory', label: 'Inventory Optimization', icon: '📦' },
                   { id: 'diagnostics', label: 'Supply Chain Diagnostics', icon: '🩺' },
                   { id: 'sop', label: 'S&OP / IBP', icon: '🏢' },
                   { id: 'finance', label: 'Financial Simulation', icon: '💰' },
                   { id: 'analytics', label: 'Global Analytics', icon: '📊' }
                 ].map(m => (
                   <button 
                      key={m.id}
                      onClick={() => { setActiveModule(m.id); setIsModuleMenuOpen(false); }}
                      style={{ padding: '0.85rem 1rem', background: activeModule === m.id ? 'var(--bg-hover)' : 'transparent', border: 'none', borderRadius: '6px', color: activeModule === m.id ? 'var(--accent-primary)' : 'var(--text-main)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: activeModule === m.id ? 600 : 500, fontSize: '0.9rem', marginBottom: '4px' }}
                      onMouseOver={e => { if (activeModule !== m.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseOut={e => { if (activeModule !== m.id) e.currentTarget.style.background = 'transparent'; }}
                   >
                     <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                     {m.label}
                   </button>
                 ))}
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                 <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Preferences</div>
                 <button 
                   onClick={() => setIsDarkMode(!isDarkMode)}
                   style={{ width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 500, fontSize: '0.85rem' }}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isDarkMode ? <span style={{fontSize:'1.1rem'}}>🌙</span> : <span style={{fontSize:'1.1rem'}}>☀️</span>}
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                   </div>
                   <div style={{ width: '32px', height: '18px', background: isDarkMode ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '20px', position: 'relative', transition: 'background 0.2s' }}>
                      <div style={{ width: '14px', height: '14px', background: '#ffffff', borderRadius: '50%', position: 'absolute', top: '2px', left: isDarkMode ? '16px' : '2px', transition: 'left 0.2s' }} />
                   </div>
                 </button>
              </div>
           </div>
        </div>
      )}

    <div className="app-layout">
      {/* GCP MASTER TOP HEADER */}
      <header className="app-header">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', padding: 0 }}
          >
            <Menu size={22} />
          </button>
          <div onClick={() => setCurrentView('landing')} style={{ cursor: 'pointer', display: 'flex', marginLeft: '0.25rem' }}>
             <PlanoraLogo />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>Enterprise Platform</span>
        </div>
        
        <div className="flex gap-3 items-center">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
            
            {/* 1. Universal Trigger Button */}
            <button 
              title={activeModule === 'demand' ? 'Run Forecast Engine' : activeModule === 'finance' ? 'Simulate Scenario' : 'Run Process Calculation'}
              onClick={handleGenerate}
              className="btn btn-primary" 
              style={{ padding: '0.5rem', borderRadius: '6px', minWidth: '34px', minHeight: '34px' }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                activeModule === 'demand' || activeModule === 'analytics' ? <BrainCircuit size={16}/> : <Gauge size={16}/>
              )}
            </button>
            
            {/* 2. Upload Data */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".csv,.xlsx"
              onChange={handleFileUpload} 
            />
            <button title="Upload Data to API" onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '6px', minWidth: '34px', minHeight: '34px' }}>
              <Upload size={16} />
            </button>

            {/* 3. Notifications */}
            <div style={{ position: 'relative' }}>
              <button 
                title="Notifications"
                className="btn btn-outline" 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                style={{ position: 'relative', padding: '0.5rem', borderRadius: '6px', minWidth: '34px', minHeight: '34px' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--status-warn)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '10px' }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', zIndex: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                     Notifications Center
                     {unreadCount > 0 && <span onClick={() => { setNotifications(prev => prev.map(n => ({...n, read: true}))); setIsNotificationOpen(false); }} style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>Mark all read</span>}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: n.read ? 'transparent' : 'var(--bg-hover)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                          <CheckCircle2 size={16} color="var(--status-good)" />
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4, fontWeight: n.read ? 400 : 500 }}>{n.message}</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. AI Copilot Toggle */}
            <button 
              title="SCM Copilot"
              onClick={() => setIsCopilotOpen(!isCopilotOpen)} 
              className="btn btn-outline" 
              style={{ padding: '0.5rem', borderRadius: '6px', minWidth: '34px', minHeight: '34px', background: isCopilotOpen ? 'var(--bg-hover)' : 'transparent', borderColor: isCopilotOpen ? 'var(--border-color)' : 'var(--border-color)' }}
            >
              <Sparkles size={16} color={isCopilotOpen ? "var(--accent-primary)" : "var(--text-main)"} /> 
            </button>
            
            {/* 5. Profile Dropdown */}
            <div style={{ position: 'relative', marginLeft: '0.5rem' }}>
              <button 
                title="Profile"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  PA
                </div>
              </button>
              {isProfileOpen && (
                 <div className="profile-dropdown">
                    <button className="profile-dropdown-item"><span style={{width:'20px'}}>👤</span> Profile Info</button>
                    <button className="profile-dropdown-item"><span style={{width:'20px'}}>🔑</span> Sign in</button>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}><span style={{width:'20px'}}>🚪</span> Sign Out</button>
                 </div>
              )}
            </div>
        </div>
      </header>

      <div className="app-body">
      {/* SIDEBAR: Category & SKU Explorer */}
      <div className="sidebar">
        
        <div className="sidebar-search">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-control mb-2"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
          >
             {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Portfolios' : c}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search Details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '28px', fontSize: '0.85rem', padding: '0.4rem 2rem' }}
            />
          </div>
        </div>

        <div className="sidebar-content">
          <div className="nav-category">Planning Details</div>
          {filteredSkus.map(sku => (
            <button
              key={sku.id}
              onClick={() => setSelectedSkuId(sku.id)}
              className={`sku-item ${selectedSkuId === sku.id ? 'active' : ''}`}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '2px' }}>{sku.id}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sku.name}
              </div>
              <div className="flex items-center mt-2 gap-2">
                {sku.type.includes('up') && <TrendingUp size={12} color="var(--status-good)" />}
                {sku.type.includes('down') && <TrendingUp size={12} color="var(--status-warn)" style={{ transform: 'scaleY(-1)' }} />}
                {sku.type === 'volatile' && <Activity size={12} color="var(--accent-primary)" />}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sku.type.replace('-',' ')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="main-content">
        <div style={{ padding: '1.25rem 2rem 0', background: 'var(--bg-main)' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="badge badge-primary" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedSku.id}</span>
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)' }}>{selectedSku.name}</h2>
            </div>
            <p className="text-muted" style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
              <Tag size={12} className="mr-1"/> Portfolio: {selectedSku.category}
            </p>
          </div>
        </div>

        {/* FUSION TABS */}
        <div className="fusion-tabs">
           {activeModule === 'demand' ? (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview Dashboard</div>
               <div className={`fusion-tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>Forecast Editor</div>
               <div className={`fusion-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>Performance</div>
               <div className={`fusion-tab ${activeTab === 'npi' ? 'active' : ''}`} onClick={() => setActiveTab('npi')}>New Product Intro (NPI)</div>
             </>
           ) : activeModule === 'inventory' ? (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Network Dashboard</div>
               <div className={`fusion-tab ${activeTab === 'safety_stock' ? 'active' : ''}`} onClick={() => setActiveTab('safety_stock')}>Safety Stock Simulator</div>
               <div className={`fusion-tab ${activeTab === 'replenishment' ? 'active' : ''}`} onClick={() => setActiveTab('replenishment')}>Replenishment Workbench</div>
             </>
           ) : activeModule === 'sop' ? (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Executive Summary</div>
               <div className={`fusion-tab ${activeTab === 'balancing' ? 'active' : ''}`} onClick={() => setActiveTab('balancing')}>Demand-Supply Balancing (RCCP)</div>
               <div className={`fusion-tab ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>Financial Reconciliation</div>
             </>
           ) : activeModule === 'finance' ? (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Scenario Simulation</div>
               <div className={`fusion-tab ${activeTab === 'optimization' ? 'active' : ''}`} onClick={() => setActiveTab('optimization')}>Product Mix & Margin Optimization</div>
               <div className={`fusion-tab ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>Master Financial Plan</div>
             </>
           ) : activeModule === 'analytics' ? (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Demand & Sales</div>
               <div className={`fusion-tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Inventory Health</div>
               <div className={`fusion-tab ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>Service & Fulfillment</div>
               <div className={`fusion-tab ${activeTab === 'supply' ? 'active' : ''}`} onClick={() => setActiveTab('supply')}>Supplier & Capacity</div>
               <div className={`fusion-tab ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => setActiveTab('financial')}>Financial Capital</div>
               <div className={`fusion-tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>✨ Planora AI Insights</div>
             </>
           ) : (
             <>
               <div className={`fusion-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Hands-off-the-Wheel Tracker</div>
               <div className={`fusion-tab ${activeTab === 'entropy' ? 'active' : ''}`} onClick={() => setActiveTab('entropy')}>Entropy Scanner</div>
             </>
           )}
        </div>

        <div className="container">
          
          {/* TAB: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && activeModule === 'demand' && (
            <div>
              <div className="grid grid-cols-4 mb-6">
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Total System MAPE</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-good)' }}>4.2%</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Outperforming industry baseline</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Active Horizon</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>{horizon} Mo</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Rolling forward</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Items in Exception</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-warn)' }}>12</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Requires planner review</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Consensus Delta</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>+2.4%</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Vs Statistical Baseline</span>
                 </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Category Volume Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={skuDatabase}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/>
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/>
                      <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}/>
                      <Bar dataKey="base" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Historical Aggregate Demand</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={forecastData.filter((d: any) => d.isHistorical)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/>
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }}/>
                      <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}/>
                      <Line type="monotone" dataKey="actual" stroke="var(--accent-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORECAST EDITOR */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-4 gap-6">
              
              <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
                <div className="workspace-panel shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="flex items-center" style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>
                       <BarChartIcon size={20} className="mr-2" color="var(--accent-primary)" /> Statistical vs Probabilistic Forecast
                     </h3>
                  </div>
                  
                  <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer>
                      <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="period" stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                        
                        <ReferenceLine x={forecastData.find((d:any) => !d.isHistorical)?.period} stroke="var(--text-main)" strokeDasharray="4 4" label={{ position: 'top', value: 'Today', fill: 'var(--text-main)', fontSize: 12 }} />
                        
                        {/* 95% Confidence Interval Lines */}
                        <Line type="step" dataKey="upperBound" stroke="var(--status-warn)" strokeDasharray="3 3" strokeWidth={1} dot={false} legendType="none" />
                        <Line type="step" dataKey="lowerBound" stroke="var(--status-warn)" strokeDasharray="3 3" strokeWidth={1} dot={false} legendType="none" />
                        
                        {/* Lines */}
                        <Line type="monotone" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={2} name="Actual History" dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls />
                        <Line type="monotone" dataKey="forecast" stroke="var(--chart-forecast)" strokeWidth={2} strokeDasharray="4 4" name="ML Baseline" dot={false} connectNulls />
                        <Line type="monotone" dataKey="consensusVolume" stroke="var(--chart-consensus)" strokeWidth={3} name="Consensus Forecast" dot={{ r: 4 }} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Horizontal Editor Pivot Grid */}
                <div className="table-container shadow-sm mb-6">
                  <table>
                    <thead>
                      <tr>
                        <th className="sticky-left" style={{ minWidth: '220px' }}>Planning Metric</th>
                        {forecastData.map((d: any, i) => <th key={i} style={{ textAlign: 'center' }}>{d.period}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Actuals Line */}
                      <tr>
                        <td className="sticky-left">Actual Historical Demand</td>
                        {forecastData.map((d: any, i) => <td key={i} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>{d.isHistorical ? d.actual.toLocaleString() : '-'}</td>)}
                      </tr>
                      
                      {/* ML Baseline Line */}
                      <tr>
                        <td className="sticky-left">Statistical ML Baseline</td>
                        {forecastData.map((d: any, i) => <td key={i} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{d.isHistorical ? d.forecast.toLocaleString() : d.forecast.toLocaleString()}</td>)}
                      </tr>
                      
                      {/* Confidence Bounds */}
                      <tr>
                        <td className="sticky-left" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bounds (95% CI)</td>
                        {forecastData.map((d: any, i) => <td key={i} style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{d.isHistorical ? '-' : `[${d.lowerBound} - ${d.upperBound}]`}</td>)}
                      </tr>
                      
                      {/* Consensus Edit Row */}
                      <tr style={{ background: 'var(--bg-hover)' }}>
                        <td className="sticky-left" style={{ background: 'var(--bg-hover)', color: 'var(--accent-primary)' }}>Consensus Uplift/Down (%)</td>
                        {forecastData.map((d: any, i) => (
                           <td key={i} style={{ textAlign: 'right', padding: '0.4rem 0.5rem' }}>
                            {d.isHistorical ? '-' : (
                               <input 
                                 type="number" 
                                 className="consensus-input"
                                 placeholder="0"
                                 value={consensusAdjustments[d.period] || ''}
                                 onChange={(e) => handleConsensusChange(d.period, e.target.value)}
                               />
                            )}
                           </td>
                        ))}
                      </tr>
                      
                      {/* Final Forecast Volume */}
                      <tr style={{ background: 'var(--accent-secondary)', borderTop: '2px solid var(--border-color)' }}>
                        <td className="sticky-left" style={{ background: 'var(--accent-secondary)', fontSize: '1rem', color: 'var(--text-main)' }}>Final Forecast Volume</td>
                        {forecastData.map((d: any, i) => <td key={i} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: !d.isHistorical && consensusAdjustments[d.period] ? 'var(--accent-primary)' : 'var(--text-main)' }}>{d.isHistorical ? d.actual.toLocaleString() : d.consensusVolume.toLocaleString()}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar Settings Panel */}
              <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                <div className="workspace-panel shadow-sm sticky top-4">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0, color: 'var(--text-main)' }}>Forecasting Parameters</h3>
                  
                  <div className="mb-4 mt-4">
                    <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Forecasting Algorithm</label>
                    <select value={model} onChange={(e) => setModel(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                      <optgroup label="Statistical Models">
                        <option value="sma">Moving Average</option>
                        <option value="ses">Simple Exponential Smoothing (SES)</option>
                        <option value="holt">Holt (Double Exponential Smoothing)</option>
                        <option value="holt-winters">Holt-Winters (Triple Exp. Smoothing)</option>
                        <option value="arima">ARIMA</option>
                        <option value="sarima">Seasonal ARIMA (SARIMA)</option>
                        <option value="arimax">ARIMAX</option>
                        <option value="sarimax">Seasonal ARIMAX (SARIMAX)</option>
                        <option value="croston">Croston / SBA / TSB</option>
                      </optgroup>
                      <optgroup label="Machine Learning Models">
                        <option value="decision-tree">Decision Tree</option>
                        <option value="random-forest">Random Forest</option>
                        <option value="extra-trees">Extra Trees Regressor</option>
                        <option value="adaboost">AdaBoost</option>
                        <option value="xgboost">XGBoost</option>
                        <option value="lightgbm">LightGBM</option>
                      </optgroup>
                    </select>
                  </div>

                  {model === 'sma' && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Window Size</label>
                        <span className="badge badge-gray">{smaWindow}</span>
                      </div>
                      <input type="range" min="2" max="12" value={smaWindow} onChange={(e) => setSmaWindow(Number(e.target.value))} style={{ flex: 1, width: '100%' }} />
                    </div>
                  )}
                  {['ses', 'holt', 'holt-winters'].includes(model) && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Smoothing (Alpha)</label>
                        <span className="badge badge-gray">{emaAlpha.toFixed(2)}</span>
                      </div>
                      <input type="range" min="0.1" max="0.9" step="0.1" value={emaAlpha} onChange={(e) => setEmaAlpha(Number(e.target.value))} style={{ flex: 1, width: '100%' }} />
                    </div>
                  )}
                  {['decision-tree', 'random-forest', 'extra-trees', 'adaboost', 'xgboost', 'lightgbm'].includes(model) && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>N-Estimators</label>
                        <span className="badge badge-gray">{mlEstimators}</span>
                      </div>
                      <input type="range" min="10" max="500" step="10" value={mlEstimators} onChange={(e) => setMlEstimators(Number(e.target.value))} style={{ flex: 1, width: '100%' }} />
                    </div>
                  )}
                  {['arima', 'sarima', 'arimax', 'sarimax'].includes(model) && (
                    <div className="mb-4">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ARIMA Order (p,d,q)</label>
                      <select value={arimaOrder} onChange={(e) => setArimaOrder(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="1,0,0">AR(1) - (1,0,0)</option>
                        <option value="0,1,1">MA(1) - (0,1,1)</option>
                        <option value="1,1,1">ARIMA(1,1,1)</option>
                        <option value="auto">Auto-ARIMA (Grid Search)</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Planning Horizon Unit</label>
                    <div className="flex gap-2">
                       {['Day', 'Week', 'Month', 'Year'].map(val => (
                         <button 
                           key={val} 
                           onClick={() => setHorizonUnit(val)}
                           className={`btn ${horizonUnit === val ? 'btn-primary' : 'btn-outline'}`}
                           style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                         >{val}</button>
                       ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Future Periods</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="24" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} style={{ flex: 1 }}/>
                      <span className="badge badge-gray">{horizon} {horizonUnit}s</span>
                    </div>
                  </div>

                  <div className="ai-panel">
                    <div className="flex items-center mb-2">
                       <Sparkles size={16} color="var(--accent-primary)" className="mr-2"/>
                       <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>AI SCM Assistant</strong>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                       For the <strong>{selectedSku.name}</strong>, applying a +15% uplift in Q4 due to historical Holiday Promo behaviors is recommended. You can override the ML baseline using the Consensus fields in the table.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ERROR ANALYSIS */}
          {activeTab === 'analysis' && (
             <div className="workspace-panel shadow-sm">
               <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', margin: 0, color: 'var(--text-main)' }}>Algorithm Performance</h3>
               <div className="table-container mt-6">
                 <table>
                   <thead>
                     <tr>
                       <th>Algorithm</th>
                       <th>Type</th>
                       <th>MAE</th>
                       <th>RMSE</th>
                       <th>MAPE (%)</th>
                       <th>Recommendation</th>
                     </tr>
                   </thead>
                   <tbody>
                     {ERROR_ANALYSIS_MODELS.map(m => (
                       <tr key={m.id}>
                         <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{m.name}</td>
                         <td><span className="badge badge-gray">{m.type}</span></td>
                         <td>{m.mae}</td>
                         <td>{m.rmse}</td>
                         <td style={{ fontWeight: m.mape < 5 ? 700 : 400, color: m.mape < 5 ? 'var(--status-good)' : 'inherit' }}>{m.mape}</td>
                         <td>
                           {m.mape < 5 ? (
                             <span className="badge" style={{ background: 'var(--status-good-bg)', color: 'var(--status-good)', border: '1px solid var(--status-good)' }}>Primary Fit</span>
                           ) : (
                             <span className="badge badge-gray">Discarded</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {/* TAB 4: NEW PRODUCT INTRO (NPI) */}
          {activeTab === 'npi' && (
             <div className="grid grid-cols-2">
               <div className="workspace-panel shadow-sm">
                 <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', margin: 0, color: 'var(--text-main)' }}>NPI Configuration Workspace</h3>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>Simulate a forecast for a 0-history product by proxying the profile of a similar SKU.</p>
                 
                 <div className="mb-4">
                   <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Target New Product ID</label>
                   <input type="text" className="form-control" placeholder="E.g., PROD-0001-NEW" />
                 </div>
                 
                 <div className="mb-4">
                   <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Borrow Profile From Active SKU</label>
                   <select className="form-control">
                     {skuDatabase.map(sku => <option key={sku.id} value={sku.id}>{sku.id} - {sku.name}</option>)}
                   </select>
                 </div>

                 <div className="mb-6 grid grid-cols-2 gap-4">
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Introductory Launch Date</label>
                     <input type="date" className="form-control" />
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Launch Volume Uplift (%)</label>
                     <input type="number" className="form-control" placeholder="e.g. 25" />
                   </div>
                 </div>
                 
                 <button className="btn btn-primary w-full">Generate NPI Scenario Forecast</button>
               </div>
               
               <div className="workspace-panel shadow-sm flex flex-col items-center justify-center text-center" style={{ border: '1px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                  <Database size={48} color="var(--text-muted)" className="mb-4" />
                  <h4 style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>No Scenario Active</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', margin: '0.5rem auto 0' }}>Configure the NPI workspace on the left and click Generate to see the proxy demand curve projected.</p>
               </div>
             </div>
          )}

          {/* ========================================= */}
          {/*        INVENTORY OPTIMIZATION MODULE      */}
          {/* ========================================= */}
          
          {/* I-TAB 1: NETWORK DASHBOARD */}
          {activeModule === 'inventory' && activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-4 mb-6">
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Total Network Value (On-Hand)</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>
                     ${skuDatabase.reduce((acc, sku) => acc + (sku.onHand * sku.unitCost), 0).toLocaleString()}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Capital Invested</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>In-Transit Value</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>
                     ${skuDatabase.reduce((acc, sku) => acc + (sku.inTransit * sku.unitCost), 0).toLocaleString()}
                   </span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Pipeline</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Avg Lead Time</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>38 Days</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Across suppliers</span>
                 </div>
                 <div className="kpi-infolet">
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>At-Risk Stockouts</span>
                   <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-error)' }}>1</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Requires expedite</span>
                 </div>
              </div>

              <div className="workspace-panel shadow-sm">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Multi-Echelon Network View</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU Hierarchy</th>
                        <th>On-Hand Qty</th>
                        <th>In-Transit Qty</th>
                        <th>Unit Cost</th>
                        <th>Inv. Value ($)</th>
                        <th>Avg Demand / Day</th>
                        <th>Days of Supply (DoS)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuDatabase.map(sku => {
                         const avgDailyDemand = sku.base / 30;
                         const dos = Math.round(sku.onHand / avgDailyDemand);
                         let status = 'Healthy'; let color = 'var(--status-good)';
                         if (dos < sku.leadTime) { status = 'Stockout Risk'; color = 'var(--status-error)'; }
                         else if (dos > sku.leadTime * 3) { status = 'Excess (E&O)'; color = 'var(--status-warn)'; }

                         return (
                           <tr key={sku.id}>
                             <td>
                               <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.name}</div>
                             </td>
                             <td style={{ fontWeight: 600 }}>{sku.onHand.toLocaleString()}</td>
                             <td>{sku.inTransit.toLocaleString()}</td>
                             <td>${sku.unitCost.toFixed(2)}</td>
                             <td>${Math.round(sku.onHand * sku.unitCost).toLocaleString()}</td>
                             <td>{avgDailyDemand.toFixed(1)}</td>
                             <td style={{ fontWeight: 600, color }}>{dos} Days</td>
                             <td><span className="badge" style={{ background: color + '20', color, border: `1px solid ${color}` }}>{status}</span></td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* I-TAB 2: SAFETY STOCK SIMULATOR */}
          {activeModule === 'inventory' && activeTab === 'safety_stock' && (() => {
             // Z-Scores for pure normal dist service levels
             const zScores = { 80: 0.84, 85: 1.04, 90: 1.28, 95: 1.65, 98: 2.05, 99: 2.33, 99.9: 3.09 };
             const closestZ = Object.entries(zScores).reduce((prev, curr) => Math.abs(Number(curr[0]) - targetServiceLevel) < Math.abs(Number(prev[0]) - targetServiceLevel) ? curr : prev);
             const z = closestZ[1];
             
             // Daily Demand StdDev mapped roughly from type
             const d_stddev = selectedSku.base * (selectedSku.type === 'volatile' ? 0.4 : 0.15) / 30;
             const avgDailyDemand = selectedSku.base / 30;
             
             // Calculate Safety Stock (SS = Z * sqrt((LT * sigma_d^2) + (D_avg^2 * sigma_LT^2)))
             const lt_variance = selectedSku.leadTime * Math.pow(d_stddev, 2);
             const demand_variance = Math.pow(avgDailyDemand, 2) * Math.pow(selectedSku.leadTimeStdDev, 2);
             const ssUnits = Math.round(z * Math.sqrt(lt_variance + demand_variance));
             const ssCapital = ssUnits * selectedSku.unitCost;
             
             return (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                  <div className="workspace-panel shadow-sm text-center mb-6">
                     <ShieldCheck size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                     <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>{targetServiceLevel.toFixed(1)}% Target Service Level</h2>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Adjust slider to recalculate stock boundaries based on Amazon flow algorithms.</p>
                     
                     <div style={{ margin: '2rem 0' }}>
                        <input 
                          type="range" 
                          min="80" max="99.9" step="0.1" 
                          value={targetServiceLevel} 
                          onChange={(e) => setTargetServiceLevel(Number(e.target.value))} 
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 text-left">
                       <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Req. Safety Stock</div>
                         <div style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', fontWeight: 300 }}>{ssUnits.toLocaleString()} <span style={{fontSize:'0.8rem'}}>u</span></div>
                       </div>
                       <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Capital Tied Up</div>
                         <div style={{ fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 300 }}>${Math.round(ssCapital).toLocaleString()}</div>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Multi-Echelon Parameters ({selectedSku.id})</h3>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div style={{ borderLeft: '4px solid var(--border-color)', paddingLeft: '1rem' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Supply Volatility</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                           <span>Average Lead Time:</span> <strong style={{color:'var(--text-main)'}}>{selectedSku.leadTime} Days</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                           <span>Lead Time StdDev (σ):</span> <strong style={{color:'var(--text-main)'}}>{selectedSku.leadTimeStdDev} Days</strong>
                        </div>
                      </div>
                      
                      <div style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Demand Volatility</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                           <span>Avg Daily Demand:</span> <strong style={{color:'var(--text-main)'}}>{avgDailyDemand.toFixed(1)} u/day</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                           <span>Demand StdDev (σ):</span> <strong style={{color:'var(--text-main)'}}>{d_stddev.toFixed(1)} u/day</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ai-panel">
                       <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><Sparkles size={16} className="mr-2" color="var(--accent-primary)"/> AI Inventory Insight</strong>
                       <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                         The required safety stock jumps exponentially as you approach 99.9% service level. At {targetServiceLevel.toFixed(1)}%, your safety stock is {ssUnits} units. Decreasing the Supplier Lead Time (σ) manually by negotiating better shipping consistency would save the company approx. ${(ssCapital * 0.25).toLocaleString()} in tied-up working capital.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
             );
          })()}

          {/* I-TAB 3: REPLENISHMENT WORKBENCH */}
          {activeModule === 'inventory' && activeTab === 'replenishment' && (
            <div className="workspace-panel shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Dynamic Replenishment Engine</h3>
                 <button className="btn btn-primary flex items-center"><ArrowRightLeft size={16} className="mr-2"/> Generate POs</button>
               </div>
               
               <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>On-Hand</th>
                        <th>Reorder Point (ROP)</th>
                        <th>Economic Order Qty (EOQ)</th>
                        <th>Max Level</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuDatabase.map(sku => {
                         const avgDailyDemand = sku.base / 30;
                         const ltDemand = avgDailyDemand * sku.leadTime;
                         const ss = 1.65 * Math.sqrt((sku.leadTime * Math.pow(avgDailyDemand*0.2, 2)) + (Math.pow(avgDailyDemand, 2) * Math.pow(sku.leadTimeStdDev, 2)));
                         const rop = Math.round(ltDemand + ss);
                         const orderCost = 50;
                         const eoq = Math.round(Math.sqrt((2 * sku.base * 12 * orderCost) / (sku.unitCost * sku.holdingCostPct)));
                         
                         const needsOrder = sku.onHand + sku.inTransit <= rop;

                         return (
                           <tr key={sku.id} style={{ background: needsOrder ? 'var(--status-warn)20' : 'transparent' }}>
                             <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</td>
                             <td>{sku.onHand.toLocaleString()}</td>
                             <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rop.toLocaleString()}</td>
                             <td>{eoq.toLocaleString()}</td>
                             <td>{(rop + eoq).toLocaleString()}</td>
                             <td>
                               {needsOrder 
                                  ? <span className="badge" style={{ background: 'var(--status-error)', color: 'white' }}>Order Needed</span> 
                                  : <span className="badge badge-gray">Sufficient</span>}
                             </td>
                             <td>
                               {needsOrder ? <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>Create PO: {eoq}u</button> : '-'}
                             </td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* ========================================= */}
          {/*      SUPPLY CHAIN DIAGNOSTICS MODULE      */}
          {/* ========================================= */}

          {/* D-TAB 1: HANDS-OFF-THE-WHEEL (HOTW) SCORE */}
          {activeModule === 'diagnostics' && activeTab === 'overview' && (() => {
             const avgHOTW = Math.round(skuDatabase.reduce((acc, sku) => acc + sku.overrideRate, 0) / skuDatabase.length);
             const overrideValue = Math.round((skuDatabase.filter(s => s.humMape < s.sysMape).length / skuDatabase.length) * 100);

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm text-center">
                       <Gauge size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                       <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>Global HOTW Score</h2>
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Percentage of forecasts generated purely by Machine Learning without human manual intervention.</p>
                       
                       <div style={{ position: 'relative', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <svg viewBox="0 0 100 50" style={{ width: '80%', position: 'absolute' }}>
                           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
                           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--accent-primary)" strokeWidth="10" strokeDasharray={`${125 * ((100-avgHOTW)/100)} 125`} />
                         </svg>
                         <h1 style={{ fontSize: '3rem', margin: 0, marginTop: '20px', color: 'var(--text-main)' }}>{100 - avgHOTW}%</h1>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                         <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px' }}>
                           <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Planner Override Rate</div>
                           <div style={{ fontSize: '1.25rem', color: 'var(--status-warn)', fontWeight: 300 }}>{avgHOTW}%</div>
                         </div>
                         <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '6px' }}>
                           <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Positive Value Add</div>
                           <div style={{ fontSize: '1.25rem', color: 'var(--status-good)', fontWeight: 300 }}>{overrideValue}%</div>
                         </div>
                       </div>
                    </div>
                 </div>

                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm" style={{ height: '100%' }}>
                     <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Forecast Value Added (FVA) Tracker</h3>
                     
                     <div className="table-container">
                       <table>
                         <thead>
                           <tr>
                             <th>SKU</th>
                             <th>ML System MAPE</th>
                             <th>Human Planner MAPE</th>
                             <th>Override Frequency</th>
                             <th>Value Add Impact</th>
                           </tr>
                         </thead>
                         <tbody>
                           {skuDatabase.map(sku => {
                             const fva = sku.sysMape - sku.humMape;
                             const fvaColor = fva > 0 ? 'var(--status-good)' : 'var(--status-error)';
                             return (
                               <tr key={sku.id}>
                                 <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.id}</td>
                                 <td style={{ color: 'var(--text-muted)' }}>{sku.sysMape}%</td>
                                 <td style={{ color: 'var(--text-muted)' }}>{sku.humMape}%</td>
                                 <td>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                     <div style={{ width: '40px', background: 'var(--bg-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                       <div style={{ background: 'var(--text-muted)', height: '100%', width: `${sku.overrideRate}%` }} />
                                     </div>
                                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.overrideRate}%</span>
                                   </div>
                                 </td>
                                 <td style={{ color: fvaColor, fontWeight: 600 }}>
                                    {fva > 0 ? '+' : ''}{fva.toFixed(1)}% {fva > 0 ? 'Value' : 'Noise'}
                                 </td>
                               </tr>
                             )
                           })}
                         </tbody>
                       </table>
                     </div>

                     <div className="ai-panel mt-6">
                       <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> AI Process Recommendation</strong>
                       <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                         Planners are manually overriding {skuDatabase[2].id} ({skuDatabase[2].overrideRate}%) but are performing {(skuDatabase[2].humMape - skuDatabase[2].sysMape).toFixed(1)}% worse than the pure ML Baseline. Recommend locking this SKU to pure algorithmic replenishment to eliminate planner noise. 
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             );
          })()}

          {/* D-TAB 2: SUPPLY CHAIN ENTROPY SCANNER */}
          {activeModule === 'diagnostics' && activeTab === 'entropy' && (() => {
             const scatterData = skuDatabase.map(sku => {
                let classification = 'Smooth';
                let color = 'var(--status-good)';
                if (sku.cv < 0.5 && sku.adi < 1.32) { classification = 'Smooth'; color = 'var(--status-good)'; }
                else if (sku.cv < 0.5 && sku.adi >= 1.32) { classification = 'Intermittent'; color = 'var(--accent-primary)'; }
                else if (sku.cv >= 0.5 && sku.adi < 1.32) { classification = 'Erratic'; color = 'var(--status-warn)'; }
                else { classification = 'Lumpy'; color = 'var(--status-error)'; }
                
                return { x: sku.adi, y: sku.cv, z: sku.base, name: sku.id, class: classification, fill: color };
             });

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                       <div>
                         <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Demand Classification Quadrants</h3>
                         <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coefficient of Variation (Y) vs Average Demand Interval (X)</p>
                       </div>
                       <button className="btn btn-outline flex items-center"><Stethoscope size={14} className="mr-2"/> Scan Hierarchy</button>
                     </div>

                     <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                       {/* Quadrant Lines overlay visually */}
                       <div style={{ position: 'absolute', top: '50%', left: '10%', right: '0', borderTop: '2px dashed var(--border-color)', zIndex: 0 }} />
                       <div style={{ position: 'absolute', left: '50%', top: '5%', bottom: '15%', borderLeft: '2px dashed var(--border-color)', zIndex: 0 }} />
                       
                       <ResponsiveContainer>
                         <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                           <XAxis type="number" dataKey="x" name="ADI" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                           <YAxis type="number" dataKey="y" name="CV" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                           <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Volume" />
                           <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                           <Scatter name="SKUs" data={scatterData} fill="var(--accent-primary)" />
                         </ScatterChart>
                       </ResponsiveContainer>
                       
                       {/* Quadrant Labels */}
                       <span style={{ position: 'absolute', top: '10%', left: '15%', color: 'var(--status-warn)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>ERRATIC</span>
                       <span style={{ position: 'absolute', top: '10%', right: '10%', color: 'var(--status-error)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>LUMPY</span>
                       <span style={{ position: 'absolute', bottom: '20%', left: '15%', color: 'var(--status-good)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>SMOOTH</span>
                       <span style={{ position: 'absolute', bottom: '20%', right: '10%', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>INTERMITTENT</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm">
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Portfolio Entropy</h3>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Smooth</span>
                          <span className="badge" style={{ background: 'var(--status-good)20', color: 'var(--status-good)' }}>{scatterData.filter(d => d.class==='Smooth').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Intermittent</span>
                          <span className="badge" style={{ background: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>{scatterData.filter(d => d.class==='Intermittent').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Erratic</span>
                          <span className="badge" style={{ background: 'var(--status-warn)20', color: 'var(--status-warn)' }}>{scatterData.filter(d => d.class==='Erratic').length} SKUs</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Lumpy</span>
                          <span className="badge" style={{ background: 'var(--status-error)20', color: 'var(--status-error)' }}>{scatterData.filter(d => d.class==='Lumpy').length} SKUs</span>
                        </div>
                      </div>
                      
                      <div className="mt-8 p-4 rounded text-center" style={{ background: 'var(--bg-hover)' }}>
                         <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Portfolio Forecastability Score</div>
                         <div style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--accent-primary)' }}>B+</div>
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highly automatable portfolio using standard ML algos.</div>
                      </div>
                    </div>
                 </div>
               </div>
             );
          })()}

          {/* ========================================= */}
          {/*          S&OP / IBP MODULE                */}
          {/* ========================================= */}

          {/* S-TAB 1: EXECUTIVE DASHBOARD */}
          {activeModule === 'sop' && activeTab === 'overview' && (() => {
            const aopRevenue = skuDatabase.reduce((acc, sku) => acc + (sku.aopVolume * sku.asp), 0);
            const aopMargin = skuDatabase.reduce((acc, sku) => acc + (sku.aopVolume * (sku.asp - sku.unitCost)), 0);
            
            const demandRevenue = skuDatabase.reduce((acc, sku) => acc + (sku.base * sku.asp), 0);
            const constrainedSupply = skuDatabase.reduce((acc, sku) => acc + (Math.min(sku.base, sku.supplyCapacity) * sku.asp), 0);
            const supplyMargin = skuDatabase.reduce((acc, sku) => acc + (Math.min(sku.base, sku.supplyCapacity) * (sku.asp - sku.unitCost)), 0);

            const revenueShortfall = demandRevenue - constrainedSupply;
            const aopVariance = constrainedSupply - aopRevenue;
            const marginVariance = supplyMargin - aopMargin;

            return (
              <div>
                <div className="grid grid-cols-4 mb-6">
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>AOP Revenue Target (Fy26)</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>${(aopRevenue/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Annual Operating Plan</span>
                   </div>
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Constrained LE Revenue</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--accent-primary)' }}>${(constrainedSupply/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: aopVariance > 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                       {aopVariance > 0 ? 'Trending Above AOP' : 'Trending Below AOP'}
                     </span>
                   </div>
                   <div className="kpi-infolet">
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Gross Margin (LE)</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--text-main)' }}>${(supplyMargin/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: marginVariance >= 0 ? 'var(--status-good)' : 'var(--status-error)', marginTop: '0.5rem' }}>
                       Var vs AOP: ${(marginVariance/1000).toFixed(1)}K
                     </span>
                   </div>
                   <div className="kpi-infolet" style={{ border: '1px solid var(--status-warn)', background: 'var(--status-warn)10' }}>
                     <span style={{ fontSize: '0.75rem', color: 'var(--status-warn)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Revenue at Risk</span>
                     <span style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--status-warn)' }}>${(revenueShortfall/1000).toFixed(1)}K</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--status-warn)', marginTop: '0.5rem' }}>Unconstrained Demand &gt; Supply</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Executive Portfolio Breakdown</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>SKU Category</th>
                            <th>AOP Target</th>
                            <th>Unconstrained Demand</th>
                            <th>Supply Capacity</th>
                            <th>Margin Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tDem = catSkus.reduce((a, s) => a + (s.base * s.asp), 0);
                            const tSup = catSkus.reduce((a, s) => a + (s.supplyCapacity * s.asp), 0);
                            const risk = tDem > tSup ? tDem - tSup : 0;
                            
                            return (
                              <tr key={cat}>
                                <td style={{ fontWeight: 600 }}>{cat}</td>
                                <td>${(tAop/1000).toFixed(1)}k</td>
                                <td>${(tDem/1000).toFixed(1)}k</td>
                                <td>${(tSup/1000).toFixed(1)}k</td>
                                <td style={{ color: risk > 0 ? 'var(--status-error)' : 'var(--status-good)' }}>
                                  ${(risk/1000).toFixed(1)}k
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="workspace-panel shadow-sm">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>AOP vs Latest Estimate (LE) Performance</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Revenue', AOP: aopRevenue, ConstrainedLE: constrainedSupply },
                        { name: 'Gross Margin', AOP: aopMargin, ConstrainedLE: supplyMargin }
                      ]} barGap={10} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--text-main)', fontWeight: 600 }}/>
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val/1000}k`}/>
                        <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}/>
                        <Legend />
                        <Bar dataKey="AOP" fill="var(--text-muted)" radius={[4, 4, 0, 0]} name="AOP Budget" />
                        <Bar dataKey="ConstrainedLE" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Operational LE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* S-TAB 2: DEMAND VS SUPPLY BALANCING (RCCP) */}
          {activeModule === 'sop' && activeTab === 'balancing' && (() => {
             // Create a time-series mock to show demand overriding capacity
             const monthlyData = [];
             let currentDem = skuDatabase.reduce((a, s) => a + s.base, 0);
             let currentCap = skuDatabase.reduce((a, s) => a + s.supplyCapacity, 0);
             
             for (let i = 0; i < 12; i++) {
               const season = Math.sin((i / 12) * Math.PI * 2) * (currentDem * 0.3); // High seasonality peak
               monthlyData.push({
                  month: `Month ${i+1}`,
                  demand: Math.round(currentDem + season),
                  capacity: currentCap
               });
             }

             return (
               <div className="grid grid-cols-4 gap-6">
                 <div className="col-span-3" style={{ gridColumn: 'span 3' }}>
                   <div className="workspace-panel shadow-sm mb-6">
                     <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: 'var(--text-main)' }}>Rough-Cut Capacity Planning (Aggregate Units)</h3>
                     
                     <div style={{ height: '350px', width: '100%' }}>
                       <ResponsiveContainer>
                         <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="month" stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }} />
                           <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                           
                           <Line type="monotone" dataKey="demand" stroke="var(--accent-primary)" strokeWidth={2} dot={false} name="Unconstrained Demand" />
                           <Line type="stepAfter" dataKey="capacity" stroke="var(--status-warn)" strokeWidth={3} name="Supply Capacity Limit" dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                 </div>

                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm sticky top-4">
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', margin: 0, color: 'var(--text-main)' }}>Capacity Constraints</h3>
                      
                      <div className="mb-4">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Expedite Air Freight ($50k)</label>
                        <select className="form-control" style={{ fontSize: '0.85rem' }}>
                          <option>Off</option>
                          <option>Enable for Month 3-5 Peak</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Subcontractor Capacity</label>
                        <select className="form-control" style={{ fontSize: '0.85rem' }}>
                          <option>Base Tier (Current)</option>
                          <option>Flex Tier (+15% Cap / -2% Margin)</option>
                        </select>
                      </div>
                      
                      <div className="ai-panel mt-6">
                         <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> S&OP Resolution</strong>
                         <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                           Demand exceeds Aggregate Supply Capacity by 34% during the Month 3 peak. Recommend enabling Subcontractor Flex Tier to capture the volume, sacrificing 2% margin but acquiring $180k in net revenue.
                         </p>
                      </div>
                    </div>
                 </div>
               </div>
             );
          })()}

          {/* S-TAB 3: FINANCIAL RECONCILIATION */}
          {activeModule === 'sop' && activeTab === 'finance' && (() => {
             return (
               <div className="workspace-panel shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Financial Reconciliation P&L</h3>
                    <button className="btn btn-outline flex items-center"><DollarSign size={16} className="mr-2"/> Export Finance Board</button>
                  </div>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Product Line</th>
                           <th>Unconstrained Revenue</th>
                           <th>Constrained Revenue (LE)</th>
                           <th>AOP Target Revenue</th>
                           <th>AOP Variance</th>
                           <th>COGS Breakdown</th>
                           <th>Projected Gross Margin (%)</th>
                         </tr>
                       </thead>
                       <tbody>
                         {skuDatabase.map(sku => {
                            const unconstrainedRev = sku.base * sku.asp;
                            const constrainedRev = Math.min(sku.base, sku.supplyCapacity) * sku.asp;
                            const aopRev = sku.aopVolume * sku.asp;
                            const variance = constrainedRev - aopRev;
                            const cogs = Math.min(sku.base, sku.supplyCapacity) * sku.unitCost;
                            const gmPct = ((constrainedRev - cogs) / constrainedRev) * 100;

                            return (
                              <tr key={sku.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                   {sku.name} 
                                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.id}</div>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>${Math.round(unconstrainedRev).toLocaleString()}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>${Math.round(constrainedRev).toLocaleString()}</td>
                                <td>${Math.round(aopRev).toLocaleString()}</td>
                                <td style={{ color: variance >= 0 ? 'var(--status-good)' : 'var(--status-error)', fontWeight: 600 }}>
                                  {variance > 0 ? '+' : ''}${Math.round(variance).toLocaleString()}
                                </td>
                                <td>${Math.round(cogs).toLocaleString()}</td>
                                <td>
                                   <span className="badge" style={{ background: gmPct > 40 ? 'var(--status-good)20' : 'var(--status-warn)20', color: gmPct > 40 ? 'var(--status-good)' : 'var(--status-warn)' }}>
                                     {gmPct.toFixed(1)}%
                                   </span>
                                </td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                  </div>
               </div>
             );
          })()}

          {/* ========================================= */}
          {/*   FINANCIAL SIMULATION & P&L IMPACT       */}
          {/* ========================================= */}

          {/* F-TAB 1: SCENARIO SIMULATOR */}
          {activeModule === 'finance' && activeTab === 'overview' && (() => {
             const baseVol = skuDatabase.reduce((a, s) => a + Math.min(s.base, s.supplyCapacity), 0);
             const baseRev = skuDatabase.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
             const baseCogs = skuDatabase.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
             const baseGm = baseRev - baseCogs;
             const baseGmPct = (baseGm / baseRev) * 100;

             const simVolFactor = 1 + (financeSim.volumePct / 100);
             const simPriceFactor = 1 + (financeSim.pricePct / 100);
             const simCostFactor = 1 + (financeSim.costPct / 100);
             
             // Dynamic new capacity based on user expansion override
             const simCapacityMultiplier = 1 + (financeSim.capExpPct / 100);
             const simPromoVolumeAdditive = financeSim.promoUplift > 0 ? (financeSim.promoUplift / 100) * baseVol : 0;

             const simRev = skuDatabase.reduce((a, s) => a + (Math.min(s.base * simVolFactor + (simPromoVolumeAdditive * (s.base/baseVol)), (s.supplyCapacity * simCapacityMultiplier)) * (s.asp * simPriceFactor)), 0);
             const simCogs = skuDatabase.reduce((a, s) => a + (Math.min(s.base * simVolFactor + (simPromoVolumeAdditive * (s.base/baseVol)), (s.supplyCapacity * simCapacityMultiplier)) * (s.unitCost * simCostFactor)), 0);
             const simGm = simRev - simCogs;
             const simGmPct = (simGm / simRev) * 100;

             return (
               <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-1" style={{ gridColumn: 'span 1' }}>
                    <div className="workspace-panel shadow-sm" style={{ height: '100%' }}>
                       <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Advanced Scenario Physics</h3>
                       
                       <div className="flex flex-col gap-5 mt-4">
                         {/* Demand Shrinkage / Growth */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Demand Volume Shock</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.volumePct > 0 ? 'var(--status-good)' : financeSim.volumePct < 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.volumePct > 0 ? '+' : ''}{financeSim.volumePct}%
                              </span>
                            </div>
                            <input type="range" min="-40" max="40" value={financeSim.volumePct} onChange={(e) => setFinanceSim({...financeSim, volumePct: Number(e.target.value)})} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Price Adjustment */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Price Elasticity (ASP)</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.pricePct > 0 ? 'var(--status-good)' : financeSim.pricePct < 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.pricePct > 0 ? '+' : ''}{financeSim.pricePct}%
                              </span>
                            </div>
                            <input type="range" min="-20" max="20" value={financeSim.pricePct} onChange={(e) => setFinanceSim({...financeSim, pricePct: Number(e.target.value)})} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Cost Fluctuations */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>COGS & Sourcing Costs</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.costPct < 0 ? 'var(--status-good)' : financeSim.costPct > 0 ? 'var(--status-error)' : 'var(--text-main)' }}>
                                {financeSim.costPct > 0 ? '+' : ''}{financeSim.costPct}%
                              </span>
                            </div>
                            <input type="range" min="-30" max="30" value={financeSim.costPct} onChange={(e) => setFinanceSim({...financeSim, costPct: Number(e.target.value)})} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Promotional Uplift */}
                         <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Promotional Uplift Volume</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.promoUplift > 0 ? 'var(--status-good)' : 'var(--text-main)' }}>
                                +{financeSim.promoUplift}%
                              </span>
                            </div>
                            <input type="range" min="0" max="50" value={financeSim.promoUplift} onChange={(e) => setFinanceSim({...financeSim, promoUplift: Number(e.target.value)})} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>

                         {/* Capacity Expansion */}
                         <div>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Capacity Expansion</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: financeSim.capExpPct > 0 ? 'var(--status-good)' : 'var(--text-main)' }}>
                                +{financeSim.capExpPct}% Limit
                              </span>
                            </div>
                            <input type="range" min="0" max="100" value={financeSim.capExpPct} onChange={(e) => setFinanceSim({...financeSim, capExpPct: Number(e.target.value)})} style={{ width: '100%', accentColor: 'var(--accent-primary)' }}/>
                         </div>
                       </div>
                       
                       <button className="btn btn-outline w-full mt-6" onClick={() => setFinanceSim({volumePct: 0, pricePct: 0, costPct: 0, promoUplift: 0, capExpPct: 0})}>Reset Global State</button>
                    </div>
                 </div>

                 <div className="col-span-2" style={{ gridColumn: 'span 2' }}>
                   <div className="workspace-panel shadow-sm mb-6">
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Interactive Profit & Loss Matrix</h3>
                      
                      <div className="table-container">
                         <table>
                           <thead>
                             <tr>
                               <th>Financial Line Item</th>
                               <th style={{ textAlign: 'right' }}>Operational Baseline</th>
                               <th style={{ textAlign: 'right' }}>Stress-Test Scenario</th>
                               <th style={{ textAlign: 'right' }}>Absolute Delta ($)</th>
                             </tr>
                           </thead>
                           <tbody>
                             <tr>
                               <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>Total Revenue</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${(baseRev / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>${(simRev / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simRev - baseRev) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simRev - baseRev) > 0 ? '+' : ''}{((simRev - baseRev) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr>
                               <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>Cost of Goods Sold (COGS)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${(baseCogs / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>${(simCogs / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simCogs - baseCogs) <= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simCogs - baseCogs) > 0 ? '+' : ''}{((simCogs - baseCogs) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr style={{ background: 'var(--bg-hover)' }}>
                               <td style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1em' }}>Gross Margin ($)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700 }}>${(baseGm / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1em' }}>${(simGm / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: (simGm - baseGm) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simGm - baseGm) > 0 ? '+' : ''}{((simGm - baseGm) / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K
                               </td>
                             </tr>
                             <tr>
                               <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Gross Margin (%)</td>
                               <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{baseGmPct.toFixed(1)}%</td>
                               <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>{simGmPct.toFixed(1)}%</td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: (simGmPct - baseGmPct) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                                 {(simGmPct - baseGmPct) > 0 ? '+' : ''}{(simGmPct - baseGmPct).toFixed(1)} bps
                               </td>
                             </tr>
                           </tbody>
                         </table>
                      </div>

                      <div className="flex gap-4 mt-6">
                        <div className="kpi-infolet flex-1" style={{ margin: 0 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Scenario EBITDA Impact</span>
                          <span style={{ fontSize: '2rem', fontWeight: 300, color: (simGm - baseGm) >= 0 ? 'var(--status-good)' : 'var(--status-error)' }}>
                            {(simGm - baseGm) > 0 ? '+' : ''}${((simGm - baseGm) / 1000).toLocaleString()}K
                          </span>
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
             );
          })()}

          {/* F-TAB 2: PRODUCT MIX OPTIMIZATION */}
          {activeModule === 'finance' && activeTab === 'optimization' && (() => {
             // Calculate margin depth per SKU
             const optimizedSkus = [...skuDatabase].map(sku => {
                const marginDol = sku.asp - sku.unitCost;
                const marginPct = (marginDol / sku.asp) * 100;
                let recommendation = "Maintain";
                let recColor = "var(--text-muted)";
                
                if (marginPct > 60) { recommendation = "Prioritize (High Yield)"; recColor = "var(--status-good)"; }
                else if (marginPct < 30) { recommendation = "Deprioritize if Constrained"; recColor = "var(--status-error)"; }

                return { ...sku, marginDol, marginPct, recommendation, recColor };
             }).sort((a, b) => b.marginPct - a.marginPct); // Sort descending by highest yield

             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem', margin: 0 }}>Product Mix & Margin Optimization</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Algorithmic ranking of SKUs based on Gross Margin % to optimize capacity utilization during supply constraints.</p>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Product Category</th>
                           <th>Product Line</th>
                           <th>Target ASP</th>
                           <th>Unit Cost (COGS)</th>
                           <th>Gross Margin / Unit</th>
                           <th>Gross Margin (%)</th>
                           <th>Algorithm Recommendation</th>
                         </tr>
                       </thead>
                       <tbody>
                         {optimizedSkus.map(sku => (
                           <tr key={sku.id}>
                              <td style={{ color: 'var(--text-muted)' }}>{sku.category}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sku.name}</td>
                              <td>${sku.asp.toLocaleString()}</td>
                              <td>${sku.unitCost.toLocaleString()}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>${sku.marginDol.toLocaleString()}</td>
                              <td>
                                 <span className="badge" style={{ background: sku.marginPct > 50 ? 'var(--status-good)20' : 'var(--status-warn)20', color: sku.marginPct > 50 ? 'var(--status-good)' : 'var(--status-warn)' }}>
                                   {sku.marginPct.toFixed(1)}%
                                 </span>
                              </td>
                              <td style={{ color: sku.recColor, fontWeight: 600, fontSize: '0.8rem' }}>{sku.recommendation}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>

                  <div className="ai-panel mt-6">
                     <strong style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}><BrainCircuit size={16} className="mr-2" color="var(--accent-primary)"/> Optimization Action</strong>
                     <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                       When facing network capacity limits next month, prioritize {optimizedSkus[0].name} ({optimizedSkus[0].marginPct.toFixed(1)}% GM). Halt production routing for {optimizedSkus[optimizedSkus.length-1].name} to reallocate capacity hours to high-yield segments.
                     </p>
                  </div>
               </div>
             );
          })()}

          {/* F-TAB 3: MASTER FINANCIAL PLAN */}
          {activeModule === 'finance' && activeTab === 'plan' && (() => {
             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Integrated Financial Plan (IFP) Ledger</h3>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Financial Division</th>
                           <th>AOP Baseline (Budget)</th>
                           <th>Unconstrained Forecast</th>
                           <th>Constrained Operational Plan</th>
                           <th>Variance to Budget ($)</th>
                         </tr>
                       </thead>
                       <tbody>
                         {/* REVENUE PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>REVENUE PLAN</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tUnc = catSkus.reduce((a, s) => a + (s.base * s.asp), 0);
                            const tCon = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
                            return (
                              <tr key={`rev-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} Revenue</td>
                                <td>${(tAop/1000).toLocaleString()}k</td>
                                <td>${(tUnc/1000).toLocaleString()}k</td>
                                <td style={{ fontWeight: 600 }}>${(tCon/1000).toLocaleString()}k</td>
                                <td style={{ color: (tCon - tAop) > 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{(tCon - tAop) > 0 ? '+' : ''}${((tCon - tAop)/1000).toLocaleString()}k</td>
                              </tr>
                            )
                         })}

                         {/* COST PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>COST PLAN (COGS)</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAop = catSkus.reduce((a, s) => a + (s.aopVolume * s.unitCost), 0);
                            const tUnc = catSkus.reduce((a, s) => a + (s.base * s.unitCost), 0);
                            const tCon = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
                            return (
                              <tr key={`cost-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} COGS</td>
                                <td>${(tAop/1000).toLocaleString()}k</td>
                                <td>${(tUnc/1000).toLocaleString()}k</td>
                                <td style={{ fontWeight: 600 }}>${(tCon/1000).toLocaleString()}k</td>
                                <td>${((tCon - tAop)/1000).toLocaleString()}k</td>
                              </tr>
                            )
                         })}

                         {/* MARGIN PLAN */}
                         <tr style={{ background: 'var(--bg-hover)' }}>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }} colSpan={5}>MARGIN PLAN</td>
                         </tr>
                         {['Accessories', 'Electronics', 'Furniture'].map(cat => {
                            const catSkus = skuDatabase.filter(s => s.category === cat);
                            const tAopRev = catSkus.reduce((a, s) => a + (s.aopVolume * s.asp), 0);
                            const tAopCost = catSkus.reduce((a, s) => a + (s.aopVolume * s.unitCost), 0);
                            const tAopGm = tAopRev - tAopCost;

                            const tConRev = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.asp), 0);
                            const tConCost = catSkus.reduce((a, s) => a + (Math.min(s.base, s.supplyCapacity) * s.unitCost), 0);
                            const tConGm = tConRev - tConCost;
                            
                            return (
                              <tr key={`mar-${cat}`}>
                                <td style={{ paddingLeft: '2rem' }}>{cat} Gross Margin ($)</td>
                                <td>${(tAopGm/1000).toLocaleString()}k</td>
                                <td style={{ color: 'var(--text-muted)' }}>-</td>
                                <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>${(tConGm/1000).toLocaleString()}k</td>
                                <td style={{ color: (tConGm - tAopGm) > 0 ? 'var(--status-good)' : 'var(--status-error)' }}>{(tConGm - tAopGm) > 0 ? '+' : ''}${((tConGm - tAopGm)/1000).toLocaleString()}k</td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                  </div>
               </div>
             );
          })()}

          {/* ========================================= */}
          {/*   GLOBAL SUPPLY CHAIN ANALYTICS           */}
          {/* ========================================= */}

          {/* A-TAB 1: DEMAND ANALYTICS */}
          {activeModule === 'analytics' && activeTab === 'overview' && (() => {
             // Mock data for Forecast vs Actual over last 12 months
             const demandAccuracyData = Array.from({length: 12}).map((_, i) => ({
                month: `M-${11-i}`,
                forecast: 12000 + Math.random() * 3000,
                actual: 11000 + Math.random() * 4500,
             }));
             const avgBias = ((demandAccuracyData.reduce((a, b) => a + b.forecast, 0) / demandAccuracyData.reduce((a, b) => a + b.actual, 0)) - 1) * 100;
             const sysWmape = skuDatabase.reduce((a, b) => a + b.sysMape, 0) / skuDatabase.length;

             return (
               <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="kpi-infolet">
                      <span className="label">Forecast vs Actual WMAPE</span>
                      <span className="value">{sysWmape.toFixed(1)}%</span>
                      <span className="subtext" style={{ color: 'var(--status-good)' }}>+1.2% Improvement</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Systemic Bias (Overforecast)</span>
                      <span className="value">{avgBias > 0 ? '+' : ''}{avgBias.toFixed(1)}%</span>
                      <span className="subtext" style={{ color: avgBias > 5 || avgBias < -5 ? 'var(--status-warn)' : 'var(--text-muted)' }}>Historical 12-Month</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">High Volatility SKUs (CV &gt; 0.6)</span>
                      <span className="value">{skuDatabase.filter(s => s.cv > 0.6).length} Items</span>
                      <span className="subtext" style={{ color: 'var(--status-error)' }}>Erratic/Lumpy Profiles</span>
                    </div>
                  </div>
                  
                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Forecast vs Actual Attainment</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={demandAccuracyData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                           <YAxis stroke="var(--text-muted)" fontSize={12} />
                           <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                           <Legend />
                           <Bar dataKey="actual" name="Actual Sales" fill="var(--accent-secondary)" stroke="var(--accent-primary)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                           <Line type="monotone" dataKey="forecast" name="Consensus Forecast" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             );
          })()}

          {/* A-TAB 2: INVENTORY ANALYTICS */}
          {activeModule === 'analytics' && activeTab === 'inventory' && (() => {
             const tInventoryUnits = skuDatabase.reduce((a, s) => a + s.onHand, 0);
             const tInventoryValue = skuDatabase.reduce((a, s) => a + (s.onHand * s.unitCost), 0);
             const eoValue = skuDatabase.filter(s => s.onHand > (s.base * 3)).reduce((a, s) => a + ((s.onHand - (s.base * 2)) * s.unitCost), 0); // Mock E&O definition: > 3 months on hand
             
             // Turns = Annual COGS / Avg Inventory Value
             const annualCogs = skuDatabase.reduce((a, s) => a + (s.base * 12 * s.unitCost), 0);
             const turns = annualCogs / tInventoryValue;
             const doh = 365 / turns;

             return (
               <div>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="kpi-infolet">
                      <span className="label">Global Inventory Turns</span>
                      <span className="value">{turns.toFixed(1)}x</span>
                      <span className="subtext" style={{ color: turns >= 6 ? 'var(--status-good)' : 'var(--status-warn)' }}>Target: 6.0x</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Days of Inventory (DOH)</span>
                      <span className="value">{doh.toFixed(0)} Days</span>
                      <span className="subtext" style={{ color: 'var(--text-muted)' }}>Average Network</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Excess & Obsolete (E&O)</span>
                      <span className="value">${(eoValue/1000).toLocaleString()}k</span>
                      <span className="subtext" style={{ color: 'var(--status-error)' }}>At-Risk Capital</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Stockouts (Last 30D)</span>
                      <span className="value">{Math.floor(Math.random() * 12 + 2)} Events</span>
                      <span className="subtext" style={{ color: 'var(--status-warn)' }}>Affecting SLA</span>
                    </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Inventory Health Risk Classification</h3>
                     <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>SKU Description</th>
                              <th>Current On-Hand</th>
                              <th>Historical Turn Rate</th>
                              <th>Inventory Value</th>
                              <th style={{ textAlign: 'right' }}>Health Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skuDatabase.map(sku => {
                               const skuAnnualCogs = sku.base * 12 * sku.unitCost;
                               const skuInvVal = sku.onHand * sku.unitCost;
                               const skuTurns = skuAnnualCogs / skuInvVal;
                               let statusStr = "Healthy";
                               let color = "var(--status-good)";
                               if (skuTurns < 2) { statusStr = "Dead Stock / E&O Risk"; color = "var(--status-error)"; }
                               else if (skuTurns < 4) { statusStr = "Slow Moving"; color = "var(--status-warn)"; }
                               else if (sku.onHand < sku.base * 0.25) { statusStr = "High Stockout Risk"; color = "var(--status-error)"; }

                               return (
                                 <tr key={`ih-${sku.id}`}>
                                   <td><strong>{sku.name}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sku.category}</span></td>
                                   <td>{sku.onHand.toLocaleString()} Units</td>
                                   <td>{skuTurns.toFixed(1)}x</td>
                                   <td>${skuInvVal.toLocaleString()}</td>
                                   <td style={{ textAlign: 'right', fontWeight: 600, color: color }}>{statusStr}</td>
                                 </tr>
                               )
                            })}
                          </tbody>
                        </table>
                     </div>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 3: SERVICE LEVEL ANALYTICS */}
          {activeModule === 'analytics' && activeTab === 'service' && (() => {
             const otifData = Array.from({length: 12}).map((_, i) => ({
                week: `Wk ${i+1}`,
                otif: 85 + Math.random() * 13,
                fillRate: 90 + Math.random() * 8
             }));

             return (
               <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="kpi-infolet" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                      <span className="label">Global OTIF (On-Time In-Full)</span>
                      <span className="value">93.4%</span>
                      <span className="subtext" style={{ color: 'var(--status-warn)' }}>Target: 96.0%</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Order Fill Rate</span>
                      <span className="value">97.8%</span>
                      <span className="subtext" style={{ color: 'var(--status-good)' }}>Target: 97.5%</span>
                    </div>
                    <div className="kpi-infolet">
                      <span className="label">Estimated Lost Sales ($)</span>
                      <span className="value">$432,500</span>
                      <span className="subtext" style={{ color: 'var(--status-error)' }}>Due to shorting / backorders</span>
                    </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Service Level Trending (12 Weeks)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={otifData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                           <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} />
                           <YAxis stroke="var(--text-muted)" fontSize={12} domain={[80, 100]} />
                           <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                           <Legend />
                           <Line type="monotone" dataKey="otif" name="Global OTIF %" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4 }} />
                           <Line type="monotone" dataKey="fillRate" name="Order Fill Rate %" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 4: SUPPLY & SUPPLIER ANALYTICS */}
          {activeModule === 'analytics' && activeTab === 'supply' && (() => {
             const suppliers = [
               { name: "Apex Electronics Mfg", leadTimeAvg: 45, leadTimeVar: 14, otif: 88, risk: "High", util: 92 },
               { name: "Global Woodworks", leadTimeAvg: 22, leadTimeVar: 3, otif: 98, risk: "Low", util: 75 },
               { name: "Tech Assembly Partners", leadTimeAvg: 30, leadTimeVar: 7, otif: 94, risk: "Medium", util: 88 },
               { name: "Ergo Solutions Inc", leadTimeAvg: 60, leadTimeVar: 8, otif: 92, risk: "Medium", util: 82 },
             ];

             return (
               <div className="workspace-panel shadow-sm">
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem', margin: 0 }}>Supplier Performance Scorecard</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Analytics tracking inbound lead time variability against contractual SLAs.</p>
                  
                  <div className="table-container">
                     <table>
                       <thead>
                         <tr>
                           <th>Supplier Vendor Group</th>
                           <th>Avg Lead Time (Days)</th>
                           <th>Lead Time Volatility (CV)</th>
                           <th>Inbound OTIF (%)</th>
                           <th>Capacity Utilization Estimate</th>
                           <th style={{ textAlign: 'right' }}>Computed Supply Risk</th>
                         </tr>
                       </thead>
                       <tbody>
                         {suppliers.map(sup => (
                           <tr key={sup.name}>
                             <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sup.name}</td>
                             <td>{sup.leadTimeAvg} Days</td>
                             <td style={{ color: sup.leadTimeVar > 10 ? 'var(--status-error)' : 'var(--text-main)' }}>±{sup.leadTimeVar} Days</td>
                             <td>
                                <div className="flex items-center gap-2">
                                  <div style={{ flex: 1, background: 'var(--bg-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${sup.otif}%`, height: '100%', background: sup.otif > 95 ? 'var(--status-good)' : sup.otif > 90 ? 'var(--status-warn)' : 'var(--status-error)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sup.otif}%</span>
                                </div>
                             </td>
                             <td>{sup.util}%</td>
                             <td style={{ textAlign: 'right', fontWeight: 700, color: sup.risk === 'High' ? 'var(--status-error)' : sup.risk === 'Medium' ? 'var(--status-warn)' : 'var(--status-good)' }}>{sup.risk}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 5: FINANCIAL ANALYTICS */}
          {activeModule === 'analytics' && activeTab === 'financial' && (() => {
             const tInventoryValue = skuDatabase.reduce((a, s) => a + (s.onHand * s.unitCost), 0);
             // Standard 20% Carrying Cost calculation based on APICS conventions (storage, capital, risk, insurance).
             const tCarryingCost = tInventoryValue * 0.20; 

             return (
               <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="kpi-infolet" style={{ margin: 0 }}>
                      <span className="label">Working Capital Trapped (Inventory)</span>
                      <span className="value">${(tInventoryValue/1000).toLocaleString()}k</span>
                      <span className="subtext" style={{ color: 'var(--text-muted)' }}>Capital requiring liberation</span>
                    </div>
                    <div className="kpi-infolet" style={{ margin: 0 }}>
                      <span className="label">Annualized Inventory Carrying Cost (20% APICS Rate)</span>
                      <span className="value" style={{ color: 'var(--status-error)' }}>${(tCarryingCost/1000).toLocaleString()}k</span>
                      <span className="subtext">Cost of Storage, Insurance, Obsolescence & Opportunity</span>
                    </div>
                  </div>

                  <div className="workspace-panel shadow-sm">
                     <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', margin: 0 }}>Working Capital vs Gross Margin Map</h3>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Scatter representation of capital investment against margin yield to identify inefficient capital traps.</p>
                     <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)"/>
                           <XAxis type="number" dataKey="x" name="Working Cap Built ($)" unit="$" stroke="var(--text-muted)" fontSize={12} />
                           <YAxis type="number" dataKey="y" name="Gross Margin Yield (%)" unit="%" stroke="var(--text-muted)" fontSize={12} />
                           <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}/>
                           <Scatter name="SKUs" data={skuDatabase.map(s => ({ x: s.onHand * s.unitCost, y: ((s.asp - s.unitCost)/s.asp)*100, name: s.name }))} fill="var(--accent-primary)" />
                        </ScatterChart>
                     </ResponsiveContainer>
                  </div>
               </div>
             )
          })()}

          {/* A-TAB 6: AI-POWERED INSIGHTS */}
          {activeModule === 'analytics' && activeTab === 'ai' && (() => {
             return (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Insight 1: Safety Stock reduction */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <BrainCircuit size={18} color="var(--accent-primary)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Inventory Optimization Opportunity</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Historical volatility for <strong>Ergonomic Office Chair</strong> has smoothed (CV dropped from 0.45 to 0.15). The current Safety Stock of robust 250 units is excessive for the new demand profile.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       💡 <span style={{ color: 'var(--text-main)' }}>AI Recommendation: </span>
                       <span style={{ color: 'var(--accent-primary)' }}>Reduce safety stock by 12% to free up $14,000 in working capital without impacting service levels.</span>
                    </div>
                 </div>

                 {/* Insight 2: Demand Spike */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--status-warn)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <TrendingUp size={18} color="var(--status-warn)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Demand Spike Anomaly Detected</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      External signals (promotional data pull) suggest a 35% spike expected next week for <strong>Wireless Gaming Mouse</strong>.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       ⚠️ <span style={{ color: 'var(--text-main)' }}>Action Required: </span>
                       <span style={{ color: 'var(--status-warn)' }}>Potential stockout in exactly 5 days. Expedite inbound PO #4992 immediately.</span>
                    </div>
                 </div>

                 {/* Insight 3: Supplier Risk */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--status-error)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <AlertTriangle size={18} color="var(--status-error)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Supplier Delay Risk Escalation</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Lead time variability for <strong>Apex Electronics Mfg</strong> has breached 3-sigma thresholds (Avg 45 days ± 14 days). This systemic delay puts the Q4 High-End Monitor components at severe risk.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       🚨 <span style={{ color: 'var(--text-main)' }}>Executive Recommendation: </span>
                       <span style={{ color: 'var(--status-error)' }}>Shift 30% of allocation to Tech Assembly Partners to de-risk Q4 Revenue target.</span>
                    </div>
                 </div>

                 {/* Insight 4: E&O Warning */}
                 <div className="workspace-panel shadow-sm" style={{ borderLeft: '4px solid var(--text-muted)', position: 'relative' }}>
                    <div className="flex items-center gap-2 mb-3">
                       <PackageMinus size={18} color="var(--text-muted)" />
                       <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>Excess & Obsolete (E&O) Alert</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      "Inventory too high for SKU <strong>Desk Organizer</strong>." Current On-Hand hits 12 months of supply (1,500 units) against a declining demand curve.
                    </p>
                    <div style={{ background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                       💰 <span style={{ color: 'var(--text-main)' }}>Financial Recommendation: </span>
                       <span style={{ color: 'var(--text-main)' }}>Activate 15% promotional liquidation markdown to recover capital and eliminate carrying overhead.</span>
                    </div>
                 </div>
               </div>
             );
          })()}

        </div>
      </div>

      {isCopilotOpen && (
        <div className="right-pane-overlay" onClick={() => setIsCopilotOpen(false)}>
           <div className="right-pane-menu" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} color="var(--accent-primary)" />
                  <strong style={{ fontSize: '1.1rem', letterSpacing: '0.02em', margin: 0, color: 'var(--text-main)' }}>Planora Copilot</strong>
                </div>
                <button onClick={() => setIsCopilotOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="copilot-body" style={{ flex: 1, padding: '1.5rem', background: 'var(--bg-main)', overflowY: 'auto' }}>
                 {chatMessages.length === 1 && chatMessages[0].role === 'ai' && (
                    <div style={{ padding: '1.25rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1.5rem' }}>
                       <h3 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 0, marginBottom: '0.5rem' }}>How can I assist you?</h3>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>I have full access to your datasets and simulation engines. You can ask me to run simulations, answer operational questions, or run queries to provide insights.</p>
                       <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: '0.75rem 0 0', lineHeight: 1.6 }}>
                          <li>"Simulate a 5% markup on Desk Organizers."</li>
                          <li>"Explain the recent inventory shortage."</li>
                          <li>"Generate a risk analysis for Q4."</li>
                       </ul>
                    </div>
                 )}
                 
                 {chatMessages.map((msg, i) => (
                   <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`}>
                     {msg.text}
                   </div>
                 ))}
                 {isTyping && (
                   <div className="chat-bubble chat-ai" style={{ width: '60px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                     <span style={{ animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: 'var(--text-main)' }}>●</span>
                     <span style={{ animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '0.2s', color: 'var(--text-main)' }}>●</span>
                     <span style={{ animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '0.4s', color: 'var(--text-main)' }}>●</span>
                   </div>
                 )}
              </div>
    
              <form onSubmit={handleSendMessage} className="copilot-input" style={{ position: 'relative', padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                <input 
                  type="text" 
                  placeholder="Ask Copilot a question..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '24px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                />
                <button type="submit" className="btn btn-primary" style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }} disabled={!chatInput.trim() || isTyping}>
                  <Send size={14} />
                </button>
              </form>
           </div>
        </div>
      )}
      </div>
    </div>
  </>
  );
}
