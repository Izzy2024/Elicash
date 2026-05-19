import { useEffect, useState, type FormEvent } from 'react';
import { apiService } from '../lib/api.service';

export default function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token') || '';
    setToken(tokenFromUrl);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!token || !newPassword || !confirmPassword) {
      setError('Completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await apiService.post('/api/auth/reset-password', { token, newPassword });

      setMessage(data.message || 'Contraseña actualizada');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error del servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-gradient-bg min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm login-fade-in-up">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Nueva contraseña</h1>
        <p className="text-sm text-white/45 mb-6">Ingresa una contraseña segura para tu cuenta</p>

        <div className="login-glass-card p-4 mb-3">
          <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Token de recuperación</label>
          <input
            type="text"
            className="login-input"
            placeholder="Token"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setError('');
            }}
            disabled={loading}
          />
        </div>

        <div className="login-glass-card p-4 mb-3">
          <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Nueva contraseña</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="login-input"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setError('');
            }}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <div className="login-glass-card p-4 mb-2">
          <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Confirmar contraseña</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="login-input"
            placeholder="Repite la contraseña"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError('');
            }}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="text-white/45 text-xs mb-2 hover:text-white/70 transition-colors"
        >
          {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        </button>

        {error && <p className="login-error-msg">{error}</p>}
        {message && <p className="text-emerald-300 text-sm mt-2">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-5 py-4 px-6 rounded-full font-semibold text-sm tracking-wider uppercase bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>

        <p className="text-center mt-6">
          <a href="/login" className="text-white/35 text-sm hover:text-white/60 transition-colors">
            Volver al login
          </a>
        </p>
      </form>
    </div>
  );
}
