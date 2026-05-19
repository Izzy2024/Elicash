# EliCash Login Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a login screen with glassmorphism UI, animated gradient background, and swipe-to-enter interaction that works responsively on desktop and mobile.

**Architecture:** New Astro page `/login` hosts a React island (`LoginScreen.tsx`) that handles form state, swipe interaction, and API calls. An `AuthGuard` component in `MainLayout.astro` checks for JWT cookie on client-side and redirects unauthenticated users to `/login`. Backend auth stays the same — JWT in httpOnly cookie.

**Tech Stack:** Astro 6, React 19, Tailwind CSS V4, Express backend (unchanged)

---

### Task 1: Login CSS Animations

**Files:**
- Create: `frontend/src/styles/login.css`

- [ ] **Step 1: Create login.css with gradient animation, shake, and swipe styles**

Create `frontend/src/styles/login.css`:

```css
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 24px rgba(59, 130, 246, 0.7); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes thumb-success {
  0% { transform: translateX(var(--thumb-x, 0px)); }
  100% { transform: translateX(calc(100% - 60px)); }
}

.login-gradient-bg {
  background: linear-gradient(-45deg, #0F172A, #1E3A5F, #0F172A, #1a3352);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}

.login-shake {
  animation: shake 0.5s ease-in-out;
}

.login-pulse {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.login-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
}

.login-glass-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s ease;
}

.login-glass-card:focus-within {
  border-color: rgba(255, 255, 255, 0.3);
}

.login-glass-card-error {
  border-color: rgba(239, 68, 68, 0.5) !important;
}

.login-swipe-track {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 60px;
  position: relative;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.login-swipe-track-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15));
  border-radius: 60px;
  transition: width 0.05s linear;
  pointer-events: none;
}

.login-swipe-thumb {
  position: absolute;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #10B981);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  cursor: grab;
  touch-action: none;
  z-index: 2;
  transition: box-shadow 0.2s ease;
}

.login-swipe-thumb:active {
  cursor: grabbing;
}

.login-swipe-thumb-success {
  animation: thumb-success 0.3s ease-out forwards;
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
}

.login-error-msg {
  color: #EF4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  animation: fade-in-up 0.3s ease-out;
}

.login-input {
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.85);
  width: 100%;
  font-size: 0.9375rem;
}

.login-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/login.css
git commit -m "feat: add login screen CSS animations and glassmorphism styles"
```

---

### Task 2: SwipeToEnter React Component

**Files:**
- Create: `frontend/src/components/SwipeToEnter.tsx`

- [ ] **Step 1: Create SwipeToEnter component**

Create `frontend/src/components/SwipeToEnter.tsx`:

```tsx
import { useState, useRef, useCallback } from 'react';

interface SwipeToEnterProps {
  onSwipe: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SwipeToEnter({ onSwipe, disabled = false, loading = false }: SwipeToEnterProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const THUMB_SIZE = 52;
  const PADDING = 6;
  const THRESHOLD = 0.75;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || loading) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX - dragX;
    setIsDragging(true);
  }, [disabled, loading, dragX]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const maxX = track.offsetWidth - THUMB_SIZE - PADDING * 2;
    const newX = Math.max(0, Math.min(maxX, e.clientX - startXRef.current));
    setDragX(newX);
  }, [isDragging, disabled]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    const track = trackRef.current;
    if (!track) return;
    const maxX = track.offsetWidth - THUMB_SIZE - PADDING * 2;
    if (dragX >= maxX * THRESHOLD) {
      setIsSuccess(true);
      onSwipe();
      setTimeout(() => {
        setIsSuccess(false);
        setDragX(0);
      }, 600);
    } else {
      setDragX(0);
    }
  }, [isDragging, disabled, dragX, onSwipe]);

  const fillPercent = trackRef.current
    ? (dragX / (trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2)) * 100
    : 0;

  return (
    <div
      ref={trackRef}
      className="login-swipe-track"
      style={{ height: THUMB_SIZE + PADDING * 2, padding: PADDING }}
    >
      <div
        className="login-swipe-track-fill"
        style={{ width: `${isSuccess ? 100 : Math.max(fillPercent, 0)}%` }}
      />
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '2px',
          paddingLeft: `${THUMB_SIZE + 16}px`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {loading ? 'INGRESANDO...' : 'DESLIZA PARA ENTRAR →'}
      </span>
      <div
        className={`login-swipe-thumb ${isSuccess ? 'login-swipe-thumb-success' : ''} ${loading ? 'login-pulse' : ''}`}
        style={{
          left: PADDING,
          transform: `translateX(${isSuccess ? '' : dragX}px)`,
          top: PADDING,
          ...(isDragging ? {} : { transition: isSuccess ? 'none' : 'transform 0.3s ease-out' }),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {loading ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SwipeToEnter.tsx
git commit -m "feat: add SwipeToEnter component with drag interaction"
```

---

### Task 3: LoginScreen React Component

**Files:**
- Create: `frontend/src/components/LoginScreen.tsx`

- [ ] **Step 1: Create LoginScreen component**

Create `frontend/src/components/LoginScreen.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import SwipeToEnter from './SwipeToEnter';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 500);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Ingresa tu email y contraseña');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas');
        triggerShake();
        return;
      }

      localStorage.setItem('elicash_user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      if (!navigator.onLine) {
        setError('Sin conexión. Verifica tu internet.');
      } else {
        setError('Error del servidor. Intenta de nuevo.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="login-gradient-bg min-h-screen flex flex-col md:flex-row">
      {/* Left panel - Brand (desktop) / Background (mobile) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div className="relative z-10 text-center px-8" style={{ animation: 'fade-in-up 0.6s ease-out' }}>
          <div
            style={{
              width: '100px', height: '100px', borderRadius: '24px',
              background: 'linear-gradient(135deg, #3B82F6, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 12px 48px rgba(59,130,246,0.4)',
            }}
          >
            <svg width="50" height="50" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-1px' }}>EliCash</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>Gestión de Préstamos y Cobros</p>
        </div>
      </div>

      {/* Mobile logo */}
      <div className="md:hidden flex flex-col items-center pt-12 pb-6" style={{ animation: 'fade-in-up 0.5s ease-out' }}>
        <div
          style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}
        >
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>EliCash</h1>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Gestión de Préstamos</p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12" style={{ animation: 'fade-in-up 0.6s ease-out 0.1s both' }}>
        <form
          onSubmit={handleFormSubmit}
          className={`w-full max-w-sm ${shakeForm ? 'login-shake' : ''}`}
        >
          <h2 className="hidden md:block text-2xl font-bold text-white mb-2">Bienvenido de vuelta</h2>
          <p className="hidden md:block text-sm text-white/40 mb-8">Ingresa a tu cuenta</p>

          {/* Email field */}
          <div className={`login-glass-card ${error && !email ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Password field */}
          <div className={`login-glass-card ${error && !password ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Contraseña</label>
            <div className="flex items-center justify-between">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-3 opacity-30 hover:opacity-60 transition-opacity"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && <p className="login-error-msg">{error}</p>}

          {/* Swipe to enter */}
          <div className="mt-6">
            <SwipeToEnter onSwipe={handleLogin} disabled={!email || !password} loading={loading} />
          </div>

          {/* Forgot password */}
          <p className="text-center mt-6">
            <a href="#" className="text-white/35 text-sm hover:text-white/60 transition-colors" onClick={(e) => e.preventDefault()}>
              ¿Olvidaste tu contraseña?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/LoginScreen.tsx
git commit -m "feat: add LoginScreen component with glassmorphism and swipe"
```

---

### Task 4: Login Astro Page

**Files:**
- Create: `frontend/src/pages/login.astro`

- [ ] **Step 1: Create login.astro page**

Create `frontend/src/pages/login.astro`:

```astro
---
import '../styles/global.css';
import '../styles/login.css';
import LoginScreen from '../components/LoginScreen';
---

<html lang="es">
<head>
  <meta charset="utf-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
  <meta name="generator" content={Astro.generator} />
  <title>Iniciar Sesión — EliCash</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body>
  <LoginScreen client:load />
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/login.astro
git commit -m "feat: add login page route"
```

---

### Task 5: AuthGuard in MainLayout

**Files:**
- Modify: `frontend/src/layouts/MainLayout.astro`

- [ ] **Step 1: Update MainLayout to check auth and redirect**

Replace the entire content of `frontend/src/layouts/MainLayout.astro` with:

```astro
---
import '../styles/global.css';
const { title = "EliCash", requireAuth = true } = Astro.props;
---

<html lang="es">
<head>
  <meta charset="utf-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
  <meta name="generator" content={Astro.generator} />
  <title>{title}</title>
  <link rel="manifest" href="/manifest.json" />
  <script is:inline>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  </script>
</head>
<body class="bg-background text-primary flex flex-col min-h-screen">
  {requireAuth && (
    <script is:inline>
      (function() {
        var user = localStorage.getItem('elicash_user');
        if (!user) {
          window.location.href = '/login';
        }
      })();
    </script>
  )}
  
  <header class="bg-primary text-white p-4 sticky top-0 z-10 shadow-md">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">{title}</h1>
      {requireAuth && (
        <button id="logout-btn" class="text-white/50 hover:text-white text-sm transition-colors">
          Salir
        </button>
      )}
    </div>
  </header>

  <main class="flex-1 overflow-y-auto pb-20 p-4">
    <slot />
  </main>

  <nav class="bg-surface border-t border-gray-200 fixed bottom-0 w-full flex justify-around p-3 pb-safe z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
    <!-- Inicio -->
    <a href="/" class="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] text-gray-500 hover:text-secondary active:text-secondary transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span class="text-xs font-medium">Inicio</span>
    </a>
    
    <!-- Clientes -->
    <a href="/clientes" class="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] text-gray-500 hover:text-secondary active:text-secondary transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span class="text-xs font-medium">Clientes</span>
    </a>

    <!-- Cobros -->
    <a href="/cobros" class="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] text-gray-500 hover:text-secondary active:text-secondary transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs font-medium">Cobros</span>
    </a>

    <!-- Reportes -->
    <a href="/dashboard" class="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] text-gray-500 hover:text-secondary active:text-secondary transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span class="text-xs font-medium">Reportes</span>
    </a>
  </nav>

  {requireAuth && (
    <script is:inline>
      document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('elicash_user');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
      });
    </script>
  )}

</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/MainLayout.astro
git commit -m "feat: add auth guard and logout to MainLayout"
```

---

### Task 5b: Update Astro pages to pass requireAuth

**Files:**
- Modify: `frontend/src/pages/index.astro`
- Modify: `frontend/src/pages/clientes/index.astro`
- Modify: `frontend/src/pages/clientes/[id].astro`
- Modify: `frontend/src/pages/clientes/nuevo.astro`
- Modify: `frontend/src/pages/cobros/index.astro`
- Modify: `frontend/src/pages/prestamos/[id].astro`
- Modify: `frontend/src/pages/prestamos/nuevo.astro`
- Modify: `frontend/src/pages/dashboard/index.astro`

Since `requireAuth` defaults to `true`, no changes are needed to existing pages. They already use `<MainLayout>` which will now enforce auth by default. The login page created in Task 4 doesn't use MainLayout, so it doesn't need auth.

No separate commit needed for this task — the MainLayout change in Task 5 covers it.

---

### Task 6: Update CORS for credentials

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Update CORS origin to include port 4322**

In `backend/src/app.ts`, change line 13 from:

```
origin: process.env.CLIENT_URL || 'http://localhost:4321',
```

to:

```
origin: process.env.CLIENT_URL || 'http://localhost:4322',
```

This ensures the Astro dev server (port 4322) can send credentials (cookies) to the API.

- [ ] **Step 2: Commit**

```bash
git add backend/src/app.ts
git commit -m "fix: update CORS origin to match Astro dev port 4322"
```

---

### Task 7: Test the full login flow

- [ ] **Step 1: Start backend**

```bash
cd backend && npx tsx src/index.ts
```

Expected: `✅ Connected to database`, `✅ Server is running on port 4000`

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

Expected: Astro dev server running on `http://localhost:4322`

- [ ] **Step 3: Verify login flow**

1. Open `http://localhost:4322` — should redirect to `/login`
2. Verify login page loads with dark gradient background, glassmorphism form fields, and swipe button
3. Test responsive: resize browser below 768px — should show mobile layout (centered, no split)
4. Enter seeded user credentials (from seed.ts) and swipe to enter
5. Verify redirect to `/` dashboard after successful login
6. Verify logout button in header works and redirects to `/login`
7. Test error state: enter wrong credentials and swipe — should show error message and shake animation
8. Verify that navigating to `/clientes`, `/cobros`, etc. while authenticated works without redirect

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: adjustments from login flow testing"
```