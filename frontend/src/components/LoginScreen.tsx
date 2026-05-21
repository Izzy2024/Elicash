import { useState, type FormEvent } from 'react';
import SwipeToEnter from './SwipeToEnter';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

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
      const data = await apiService.post('/api/auth/login', { email, password });

      if (data && data.user) {
        if (data.token) {
          localStorage.setItem('elicash_token', data.token);
        }
        setUser(data.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
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
      {/* Left panel - Brand (desktop only) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div className="relative z-10 text-center px-8 login-fade-in-up">
          <img
            src="/shield-icon.png"
            alt="EliCash Logo"
            style={{
              width: '120px',
              height: 'auto',
              margin: '0 auto 24px',
              filter: 'drop-shadow(0 12px 48px rgba(59,130,246,0.4))',
            }}
          />
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-1px' }}>EliCash</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>Gestión de Préstamos y Cobros</p>
        </div>
      </div>

      {/* Mobile logo */}
      <div className="md:hidden flex flex-col items-center pt-12 pb-6 login-fade-in-up">
        <img
          src="/shield-icon.png"
          alt="EliCash Logo"
          style={{
            width: '80px',
            height: 'auto',
            margin: '0 auto 12px',
            filter: 'drop-shadow(0 8px 32px rgba(59,130,246,0.3))',
          }}
        />
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

          {/* Links */}
          <div className="text-center mt-6 space-y-2">
            <a href="/register" className="block text-white/35 text-sm hover:text-white/60 transition-colors">
              ¿No tienes cuenta? Regístrate
            </a>
            <a href="/forgot-password" className="block text-white/25 text-xs hover:text-white/40 transition-colors">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
