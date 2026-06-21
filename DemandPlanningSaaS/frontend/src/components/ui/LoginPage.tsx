'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/store/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Route Configurations for SVG Layout (1200 x 700 canvas)
// ─────────────────────────────────────────────────────────────────────────────
interface RouteConfig {
  d: string;
  isHero?: boolean;
  color: string;
  strokeWidth: number;
  opacity: number;
  flowDuration: number;
  delay: number;
  start: [number, number];
  end: [number, number];
}

const ROUTES: RouteConfig[] = [
  {
    d: "M 0 100 C 300 150, 500 300, 700 350 S 1000 450, 1200 600",
    color: "var(--text-main)", // Ink
    strokeWidth: 1.4,
    opacity: 0.45,
    flowDuration: 8.5,
    delay: 0.0,
    start: [0, 100],
    end: [1200, 600],
  },
  {
    d: "M 100 700 C 250 500, 500 400, 700 350 S 900 200, 1000 0",
    color: "var(--text-muted)", // Gray
    strokeWidth: 1.3,
    opacity: 0.5,
    flowDuration: 9.5,
    delay: 0.1,
    start: [100, 700],
    end: [1000, 0],
  },
  {
    d: "M 600 0 C 620 150, 650 250, 700 350 S 750 550, 800 700",
    color: "var(--text-main)", // Ink
    strokeWidth: 1.4,
    opacity: 0.4,
    flowDuration: 8.0,
    delay: 0.2,
    start: [600, 0],
    end: [800, 700],
  },
  {
    d: "M 1200 500 C 1000 450, 850 400, 700 350 S 400 200, 200 0",
    isHero: true,
    color: "var(--accent-primary)", // Amber
    strokeWidth: 2.0,
    opacity: 1.0,
    flowDuration: 7.0,
    delay: 0.3,
    start: [1200, 500],
    end: [200, 0],
  },
  {
    d: "M 0 400 C 200 380, 300 200, 500 0",
    color: "var(--text-muted)", // Gray
    strokeWidth: 1.3,
    opacity: 0.35,
    flowDuration: 10.0,
    delay: 0.4,
    start: [0, 400],
    end: [500, 0],
  },
  {
    d: "M 900 0 C 950 100, 1050 150, 1200 250",
    color: "var(--text-main)", // Ink
    strokeWidth: 1.4,
    opacity: 0.55,
    flowDuration: 7.5,
    delay: 0.5,
    start: [900, 0],
    end: [1200, 250],
  },
  {
    d: "M 0 600 C 400 500, 800 680, 1200 650",
    color: "var(--text-muted)", // Gray
    strokeWidth: 1.3,
    opacity: 0.4,
    flowDuration: 9.0,
    delay: 0.6,
    start: [0, 600],
    end: [1200, 650],
  },
  {
    d: "M 400 700 C 600 550, 800 400, 1200 100",
    color: "var(--text-main)", // Ink
    strokeWidth: 1.5,
    opacity: 0.6,
    flowDuration: 8.2,
    delay: 0.7,
    start: [400, 700],
    end: [1200, 100],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 Subcomponent: Background Routes SVG
// ─────────────────────────────────────────────────────────────────────────────
interface BackgroundRoutesProps {
  isMobile: boolean;
}

function BackgroundRoutes({ isMobile }: BackgroundRoutesProps) {
  const routesToRender = isMobile ? ROUTES.slice(0, 5) : ROUTES;

  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      {/* 1. Static corridor hairline base paths */}
      {routesToRender.map((route, i) => (
        <path
          key={`base-${i}`}
          className="corridor-path"
          d={route.d}
          fill="none"
          stroke="#D8D4C8"
          strokeWidth={1.3}
          style={{
            strokeDasharray: '1500',
            strokeDashoffset: '1500',
            animation: `drawCorridor 0.9s cubic-bezier(0.16, 0.8, 0.3, 1) ${route.delay}s forwards`,
          }}
        />
      ))}

      {/* 2. Moving flow dashed overlay paths */}
      {routesToRender.map((route, i) => (
        <path
          key={`overlay-${i}`}
          className="overlay-path"
          d={route.d}
          fill="none"
          stroke={route.color}
          strokeWidth={route.strokeWidth}
          style={{
            strokeDasharray: route.isHero ? '3 11' : '2 9',
            animation: `
              fadeOverlay 0.4s ease-out ${route.delay + 0.85}s forwards,
              flowDashPattern ${route.flowDuration}s linear ${route.delay + 0.85}s infinite
            `,
            opacity: 0,
            '--target-opacity': route.opacity,
          } as React.CSSProperties}
        />
      ))}

      {/* 3. Traveling Shipment Dots */}
      {routesToRender.map((route, i) => (
        <g
          key={`dot-${i}`}
          className="route-dot"
          style={{
            opacity: 0,
            animation: `fadeOverlay 0.4s ease-out ${route.delay + 0.85}s forwards`,
            '--target-opacity': route.isHero ? 1.0 : route.opacity,
          } as React.CSSProperties}
        >
          <circle r={route.isHero ? 4.5 : 3.5} fill={route.color}>
            <animateMotion dur={`${route.flowDuration}s`} repeatCount="indefinite" path={route.d} />
          </circle>
        </g>
      ))}

      {/* 4. Start/End Terminals */}
      {routesToRender.map((route, i) => (
        <g
          key={`endpoints-${i}`}
          className="static-element"
          style={{ opacity: 0, animation: `fadeInElement 0.4s ease-out ${route.delay}s forwards` }}
        >
          <circle cx={route.start[0]} cy={route.start[1]} r="3" fill="#15171A" />
          <circle cx={route.end[0]} cy={route.end[1]} r="3" fill="#15171A" />
        </g>
      ))}

      {/* 5. Central Convergence Hub */}
      <g>
        {/* Hub central dot */}
        <circle
          className="static-element"
          cx="700"
          cy="350"
          r="5"
          fill="var(--accent-primary)"
          style={{
            opacity: 0,
            animation: `fadeInElement 0.4s ease-out 0.95s forwards`
          }}
        />
        {/* Pulse ring indicator */}
        <circle
          className="hub-pulse"
          cx="700"
          cy="350"
          r="7"
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          style={{
            opacity: 0,
            transformOrigin: '700px 350px',
            animation: `
              fadeInElement 0.4s ease-out 0.95s forwards,
              pulseHubRing 3.2s cubic-bezier(0.215, 0.610, 0.355, 1) 0.95s infinite
            `
          }}
        />
        {/* Monospace Hub Label */}
        {!isMobile && (
          <text
            className="static-element"
            x="712"
            y="354"
            fill="#8A8678"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              letterSpacing: '0.5px',
              opacity: 0,
              animation: `fadeInElement 0.5s ease-out 1.8s forwards`,
              userSelect: 'none'
            }}
          >
            [HUB_NRT_04]
          </text>
        )}
      </g>
    </svg>
  );
}

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@planora.ai', password: 'admin123', role: 'Full access & setup' },
  { label: 'Manager', email: 'manager@planora.ai', password: 'manager123', role: 'S&OP & Finance views' },
  { label: 'Planner', email: 'planner@planora.ai', password: 'planner123', role: 'Forecast overrides' },
  { label: 'Viewer', email: 'viewer@planora.ai', password: 'viewer123', role: 'Read-only dashboard' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage Component (Layout Layer 2 & Layer 3)
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Monitor screen width to reduce routes density on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fillDemo = (demoEmail: string, demoPw: string) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: '#F7F6F2',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      {/* CSS Animation Keyframes Injector */}
      <style>{`
        @keyframes drawCorridor {
          from { stroke-dashoffset: 1500; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flowDashPattern {
          to { stroke-dashoffset: -40; }
        }
        @keyframes fadeOverlay {
          from { opacity: 0; }
          to { opacity: var(--target-opacity); }
        }
        @keyframes pulseHubRing {
          0% {
            r: 7px;
            opacity: 0.7;
          }
          100% {
            r: 22px;
            opacity: 0;
          }
        }
        @keyframes fadeInElement {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cardEntranceAnim {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ── Respect prefers-reduced-motion media query settings ── */
        @media (prefers-reduced-motion: reduce) {
          .corridor-path {
            stroke-dashoffset: 0 !important;
            animation: none !important;
          }
          .overlay-path {
            opacity: 0.55 !important;
            animation: none !important;
          }
          .route-dot {
            display: none !important;
          }
          .hub-pulse {
            animation: none !important;
            r: 7px !important;
            opacity: 0.3 !important;
          }
          .static-element {
            opacity: 1 !important;
            animation: none !important;
          }
          .card-container {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
          .corner-bracket {
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* Layer 1: Background Route lines */}
      <BackgroundRoutes isMobile={isMobile} />

      {/* Layers 2 & 3: Entrance Choreography & Sign-In Card Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        padding: '2rem',
        boxSizing: 'border-box',
      }}>
        <div className="card-container" style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          opacity: 0,
          animation: 'cardEntranceAnim 0.7s cubic-bezier(0.16, 0.8, 0.3, 1) 1.05s forwards',
        }}>
          {/* Relative wrapper specifically for card & brackets context */}
          <div style={{ position: 'relative', width: '100%' }}>
            {/* L-shaped view-finder viewfinder technical marks (positioned just outside corners) */}
            <div className="corner-bracket" style={{
            position: 'absolute', top: '-10px', left: '-10px', width: '18px', height: '18px',
            borderLeft: '2px solid var(--text-main)', borderTop: '2px solid var(--text-main)',
            opacity: 0, animation: 'fadeInElement 0.5s ease-out 1.5s forwards'
          }} />
          <div className="corner-bracket" style={{
            position: 'absolute', top: '-10px', right: '-10px', width: '18px', height: '18px',
            borderRight: '2px solid var(--text-main)', borderTop: '2px solid var(--text-main)',
            opacity: 0, animation: 'fadeInElement 0.5s ease-out 1.5s forwards'
          }} />
          <div className="corner-bracket" style={{
            position: 'absolute', bottom: '-10px', left: '-10px', width: '18px', height: '18px',
            borderLeft: '2px solid var(--text-main)', borderBottom: '2px solid var(--text-main)',
            opacity: 0, animation: 'fadeInElement 0.5s ease-out 1.5s forwards'
          }} />
          <div className="corner-bracket" style={{
            position: 'absolute', bottom: '-10px', right: '-10px', width: '18px', height: '18px',
            borderRight: '2px solid var(--text-main)', borderBottom: '2px solid var(--text-main)',
            opacity: 0, animation: 'fadeInElement 0.5s ease-out 1.5s forwards'
          }} />

          {/* Central flat card body with sharp offset shadow */}
          <div style={{
            width: '100%',
            background: '#F7F6F2',
            border: '1px solid var(--text-main)',
            padding: '48px 44px',
            boxSizing: 'border-box',
            boxShadow: '7px 7px 0 0 #C2640C',
            position: 'relative',
          }}>
            <form onSubmit={handleSubmit}>
              {/* Header Ascending 3-Bar Logo Mark & Wordmark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '20px', height: '16px', flexShrink: 0 }}>
                  <span style={{ display: 'block', width: '4px', height: '8px', background: '#C2640C' }} />
                  <span style={{ display: 'block', width: '4px', height: '12px', background: '#C2640C' }} />
                  <span style={{ display: 'block', width: '4px', height: '16px', background: 'var(--text-main)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  Planora <span style={{ color: '#C2640C' }}>AI</span>
                </span>
              </div>

              {/* Sub-label uppercase mono sign-in header */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8A8678', marginBottom: '4px' }}>
                Sign in
              </div>

              {/* Title Header */}
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 500, color: 'var(--text-main)', margin: '0 0 8px 0', lineHeight: 1.2 }}>
                Access your control tower
              </h2>

              {/* Single line caption */}
              <p style={{ fontSize: '12.5px', color: '#8A8678', margin: '0 0 28px 0', lineHeight: 1.4 }}>
                Enter credentials to manage demand planning operations.
              </p>

              {/* Email input field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="form-control"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #D8D4C8',
                    background: '#FFFFFF',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    borderRadius: '0px',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>

              {/* Password input field */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9.5px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="form-control"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #D8D4C8',
                    background: '#FFFFFF',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    borderRadius: '0px',
                    outline: 'none',
                    width: '100%',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <a href="#forgot" onClick={e => { e.preventDefault(); alert("Please contact your administrator to reset credentials."); }} style={{ fontSize: '11.5px', color: '#8A8678', textDecoration: 'none' }}>
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Error messages box */}
              {error && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  background: 'var(--status-error-bg)', border: '1px solid var(--status-error)',
                  padding: '8px 12px', marginBottom: '20px', color: 'var(--status-error)'
                }}>
                  <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}>{error}</span>
                </div>
              )}

              {/* Action sign-in button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn"
                style={{
                  width: '100%',
                  background: 'var(--text-main)',
                  color: '#F7F6F2',
                  border: '1px solid var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '10px 14px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  borderRadius: '0px',
                  transition: 'background 150ms ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isLoading ? 'Signing in…' : 'Sign in ➔'}
              </button>
            </form>

            {/* Request access link in footer */}
            <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '11.5px', color: '#8A8678' }}>
              Need a demo workspace?{' '}
              <a href="#request" onClick={e => { e.preventDefault(); alert("Demo requests are processed at demo@planora.ai"); }} style={{ color: '#C2640C', textDecoration: 'none', fontWeight: 500 }}>
                Request access
              </a>
            </div>
          </div> {/* Ends card body */}
        </div> {/* Ends relative wrapper */}

          {/* Demo account helper selector grid (staggered with the card) */}
          <div style={{ marginTop: '1.5rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontWeight: 500 }}>
                Or log in as a demo user
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.password)}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0px',
                    background: '#F7F6F2',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s',
                    outline: 'none',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#F7F6F2';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px', fontFamily: 'var(--font-sans)' }}>
                    {acc.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>
                    {acc.role}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
