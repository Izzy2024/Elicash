import { useState, type FormEvent } from 'react';
import { apiService } from '../lib/api.service';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Ingresa tu email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');
    setEmailError('');

    try {
      const data = await apiService.post('/api/auth/forgot-password', { email });

      setMessage(data.message || 'Revisa tu correo para continuar');
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
      if (data.emailError) {
        setEmailError(data.emailError);
      }
    } catch (err: any) {
      setError(err.message || 'Error del servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-gradient-bg min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm login-fade-in-up">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Recuperar contraseña</h1>
        <p className="text-sm text-white/45 mb-6">Te enviamos un enlace para restablecer tu acceso</p>

        <div className="login-glass-card p-4 mb-3">
          <label className="block text-[11px] text-white/35 uppercase tracking-wider mb-1">Email</label>
          <input
            type="email"
            className="login-input"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            autoComplete="email"
            disabled={loading}
          />
        </div>

        {error && <p className="login-error-msg">{error}</p>}
        {message && <p className="text-emerald-300 text-sm mt-2">{message}</p>}
        {emailError && (
          <p className="text-amber-300 text-sm mt-2">
            No se pudo enviar el email: {emailError}. En desarrollo puedes usar el enlace de abajo.
          </p>
        )}

        {resetUrl && (
          <a
            href={resetUrl}
            className="block mt-3 text-cyan-300 text-sm underline break-all"
          >
            Abrir enlace de recuperación
          </a>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-5 py-4 px-6 rounded-full font-semibold text-sm tracking-wider uppercase bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Procesando...' : 'Enviar enlace'}
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
