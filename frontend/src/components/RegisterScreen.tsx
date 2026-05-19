import { useState, type FormEvent } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 500);
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Completa todos los campos obligatorios');
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      triggerShake();
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiService.post('/api/auth/register', {
        email,
        password,
        name,
        tenantName: tenantName || undefined,
        inviteCode: inviteCode || undefined,
      });

      const loginData = await apiService.post('/api/auth/login', { email, password });

      if (loginData && loginData.user) {
        setUser(loginData.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };


  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleRegister();
  };

  const canSubmit = name && email && password && confirmPassword && password === confirmPassword;

  return (
    <div className="login-gradient-bg min-h-screen flex flex-col md:flex-row">
      {/* Left panel - Brand (desktop) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div className="relative z-10 text-center px-8 login-fade-in-up">
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
      <div className="md:hidden flex flex-col items-center pt-10 pb-4 login-fade-in-up">
        <div
          style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>EliCash</h1>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12" style={{ animation: 'fade-in-up 0.6s ease-out 0.1s both' }}>
        <form
          onSubmit={handleFormSubmit}
          className={`w-full max-w-sm ${shakeForm ? 'login-shake' : ''}`}
        >
          <h2 className="hidden md:block text-2xl font-bold text-white mb-2">Crear cuenta</h2>
          <p className="hidden md:block text-sm text-white/40 mb-6">Registra tu negocio y comienza</p>

          {/* Name field */}
          <div className={`login-glass-card ${error && !name ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Nombre completo *</label>
            <input
              type="text"
              className="login-input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* Email field */}
          <div className={`login-glass-card ${error && !email ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Email *</label>
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

          {/* Business name field */}
          <div className="login-glass-card p-4 mb-3">
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Nombre del negocio</label>
            <input
              type="text"
              className="login-input"
              placeholder="Mi Negocio (opcional)"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              autoComplete="organization"
              disabled={loading}
            />
          </div>

          <div className="login-glass-card p-4 mb-3">
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Código de invitación</label>
            <input
              type="text"
              className="login-input"
              placeholder="Opcional según tu despliegue"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="one-time-code"
              disabled={loading}
            />
          </div>

          {/* Password field */}
          <div className={`login-glass-card ${error && !password ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Contraseña *</label>
            <div className="flex items-center justify-between">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
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

          {/* Confirm password field */}
          <div className={`login-glass-card ${error && !confirmPassword ? 'login-glass-card-error' : ''} p-4 mb-3`}>
            <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Confirmar contraseña *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Error message */}
          {error && <p className="login-error-msg">{error}</p>}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={`w-full mt-5 py-4 px-6 rounded-full font-semibold text-sm tracking-wider uppercase transition-all ${
              canSubmit && !loading
                ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          {/* Login link */}
          <p className="text-center mt-6">
            <a href="/login" className="text-white/35 text-sm hover:text-white/60 transition-colors">
              ¿Ya tienes cuenta? Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
