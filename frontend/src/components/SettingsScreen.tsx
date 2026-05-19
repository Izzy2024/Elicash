import { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';

export default function SettingsScreen() {
  const { user, setUser } = useAuthStore();
  const [userName, setUserName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('$');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiService.get('/api/settings/profile');
        if (data) {
          setUserName(data.user.name);
          setTenantName(data.tenant.name);
          setCurrency(data.tenant.currency);
          setSymbol(data.tenant.symbol);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await apiService.put('/api/settings/profile', {
        userName,
        tenantName,
        currency,
        symbol
      });
      
      // Update local store as well
      if (user) {
        setUser({
          ...user,
          name: userName,
          tenantName,
          currency,
          symbol
        } as any);
      }

      setMessage('Configuración guardada correctamente');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">Configuración</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 border-b border-gray-50 pb-2">Perfil de Usuario</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre de Usuario</label>
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (No editable)</label>
            <input 
              type="text" 
              value={user?.email || ''} 
              disabled
              className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 border-b border-gray-50 pb-2">Negocio y Moneda</h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre de la Empresa</label>
            <input 
              type="text" 
              value={tenantName} 
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Moneda (ISO)</label>
              <input 
                type="text" 
                placeholder="USD, CRC, GTQ..."
                value={currency} 
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Símbolo</label>
              <input 
                type="text" 
                placeholder="$, ₡, Q..."
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
        </button>
      </form>
    </div>
  );
}
