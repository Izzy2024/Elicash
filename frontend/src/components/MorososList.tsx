import { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';
import { RiskBadge, SummaryCard, ActionIconButton } from './ui/MorosoUI';

interface Moroso {
  installmentId: string;
  numero: number;
  monto_cuota: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  diasVencido: number;
  loan: { id: string; monto: number; frecuencia: string };
  client: { id: string; nombre: string; telefono: string; direccion: string; score: number };
}

function diasVencidoLabel(dias: number): string {
  if (dias >= 30) return 'Crítico';
  if (dias >= 15) return 'Urgente';
  if (dias >= 7) return 'Atrasado';
  return 'Vencido';
}

function lateralBorderColor(dias: number): string {
  if (dias >= 30) return 'border-red-500';
  if (dias >= 15) return 'border-orange-500';
  if (dias >= 7) return 'border-blue-500';
  return 'border-slate-300';
}

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MorososList() {
  const { symbol } = useAuthStore();
  const [morosos, setMorosos] = useState<Moroso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'critico' | 'urgente' | 'atrasado'>('all');

  useEffect(() => {
    const fetchMorosos = async () => {
      try {
        const data = await apiService.get('/api/cobros/morosos');
        setMorosos(data || []);
      } catch (err) {
        setError('No se pudieron cargar los morosos');
      } finally {
        setLoading(false);
      }
    };
    fetchMorosos();
  }, []);

  const filtered = filter === 'all'
    ? morosos
    : morosos.filter((m) => {
        if (filter === 'critico') return m.diasVencido >= 30;
        if (filter === 'urgente') return m.diasVencido >= 15 && m.diasVencido < 30;
        return m.diasVencido >= 7 && m.diasVencido < 15;
      });

  const totalDeuda = morosos.reduce((sum, m) => sum + m.saldo_pendiente, 0);
  const countByLevel = {
    critico: morosos.filter((m) => m.diasVencido >= 30).length,
    urgente: morosos.filter((m) => m.diasVencido >= 15 && m.diasVencido < 30).length,
    atrasado: morosos.filter((m) => m.diasVencido >= 7 && m.diasVencido < 15).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Cargando morosos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Summary cards grid - 3 Columns */}
      <div className="responsive-grid-3">
        <SummaryCard 
          label="Críticos" 
          value={countByLevel.critico} 
          colorClass="text-red-600" 
        />
        <SummaryCard 
          label="Urgentes" 
          value={countByLevel.urgente} 
          colorClass="text-orange-600" 
        />
        <SummaryCard 
          label="Total Mora" 
          value={formatCurrency(totalDeuda, symbol)} 
          colorClass="text-slate-900" 
        />
      </div>

      {/* Segmented Control Filter */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'critico', label: 'Crítico' },
          { id: 'urgente', label: 'Urgente' },
          { id: 'atrasado', label: 'Atrasado' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`min-w-0 flex-1 whitespace-nowrap py-2 text-[11px] font-bold rounded-lg transition-all ${
              filter === f.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-500">No hay morosos en esta categoría</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <div
              key={m.installmentId}
              className={`bg-white rounded-[1rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border-l-4 ${lateralBorderColor(m.diasVencido)} relative overflow-hidden transition-all`}
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{m.client.nombre}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">{m.client.telefono}</span>
                    <span className="text-[11px] text-slate-300">•</span>
                    <span className="text-[11px] text-slate-400 font-medium">Score: {m.client.score}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold tabular-nums text-slate-900">
                    {formatCurrency(m.saldo_pendiente, symbol)}
                  </div>
                  <RiskBadge level={diasVencidoLabel(m.diasVencido)} days={m.diasVencido} />
                </div>
              </div>
              
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] text-slate-400 font-medium">
                  Cuota #{m.numero} • Vence {formatDate(m.fecha_vencimiento)}
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <ActionIconButton 
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    } 
                    onClick={() => window.open(`tel:${m.client.telefono}`)} 
                  />
                  <a 
                    href={`/prestamos/${m.loan.id}`}
                    className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-bold text-white press-96 transition-colors"
                  >
                    Ver Detalle
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
