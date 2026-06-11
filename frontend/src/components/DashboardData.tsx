import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';

type DashboardSummary = {
  cobrado: number;
  pendiente: number;
  mora: number;
  ganancia: number;
  loading: boolean;
};

type WeeklyDatum = {
  fecha: string;
  monto: number;
};

type ReportRange = {
  desde: string;
  hasta: string;
};

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthStartDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function getLastSevenDaysStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
}

function buildDateQuery(range: ReportRange) {
  const params = new URLSearchParams();
  params.set('desde', range.desde);
  params.set('hasta', range.hasta);
  return params.toString();
}

function formatRangeLabel(range: ReportRange) {
  const from = new Date(`${range.desde}T00:00:00`);
  const to = new Date(`${range.hasta}T00:00:00`);

  return `${from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - ${to.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function getActivePreset(range: ReportRange): 'today' | 'week' | 'month' | 'custom' {
  const today = formatInputDate(new Date());
  const monthStart = formatInputDate(getMonthStartDate());
  const weekStart = formatInputDate(getLastSevenDaysStart());

  if (range.desde === today && range.hasta === today) return 'today';
  if (range.desde === weekStart && range.hasta === today) return 'week';
  if (range.desde === monthStart && range.hasta === today) return 'month';
  return 'custom';
}

export default function DashboardData() {
  const { symbol } = useAuthStore();
  const [data, setData] = useState<DashboardSummary>({
    cobrado: 0,
    pendiente: 0,
    mora: 0,
    ganancia: 0,
    loading: true
  });
  const [bestClients, setBestClients] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDatum[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [range, setRange] = useState<ReportRange>({
    desde: formatInputDate(getMonthStartDate()),
    hasta: formatInputDate(new Date())
  });
  const activePreset = getActivePreset(range);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setExportError('');
      if (range.desde > range.hasta) {
        setExportError('Revisa el rango de fechas antes de exportar.');
        return;
      }

      const apiUrl = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '');
      const response = await fetch(
        `${apiUrl}/api/reportes/excel?${buildDateQuery(range)}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('No se pudo exportar el reporte');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename=\"?([^"]+)\"?/);
      const fileName = fileNameMatch?.[1] || `reporte-elicash-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setExportError('No pudimos exportar el Excel. Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const applyQuickRange = (mode: 'month' | 'week' | 'today') => {
    const today = formatInputDate(new Date());

    if (mode === 'today') {
      setRange({ desde: today, hasta: today });
      return;
    }

    if (mode === 'week') {
      setRange({
        desde: formatInputDate(getLastSevenDaysStart()),
        hasta: today
      });
      return;
    }

    setRange({
      desde: formatInputDate(getMonthStartDate()),
      hasta: today
    });
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (range.desde > range.hasta) {
        setRangeError('La fecha inicial no puede ser mayor que la final.');
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setRangeError('');
        setData(prev => ({ ...prev, loading: true }));
        const query = buildDateQuery(range);
        const [dia, ganancias, morosos, clients, semana] = await Promise.all([
          apiService.get('/api/reportes/dia'),
          apiService.get(`/api/reportes/ganancias?${query}`),
          apiService.get('/api/cobros/morosos'),
          apiService.get('/api/clients'), // TODO: add score sorting/limit in backend
          apiService.get(`/api/reportes/semana?${query}`)
        ]);

        setData({
          cobrado: dia.cobradoPeriodo ?? dia.cobradoHoy,
          pendiente: dia.pendientePeriodo ?? dia.pendienteHoy,
          mora: morosos.reduce((acc: number, m: any) => acc + (m.total_exigible_cobro ?? m.saldo_pendiente ?? 0), 0),
          ganancia: ganancias.gananciaTotal,
          loading: false
        });

        // Simple sorting for best clients client-side for now
        setBestClients(clients.sort((a: any, b: any) => (b.score || 0) - (a.score || 0)).slice(0, 5));
        setWeeklyData(semana);
      } catch (err) {
        console.error(err);
        setData(prev => ({...prev, loading: false}));
      }
    };
    loadDashboard();
  }, [range]);


  if (data.loading) {
    return (
      <div className="responsive-grid-4 animate-pulse">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-slate-100 h-24 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f766e_100%)] px-4 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/65">Centro de Reportes</p>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xl font-black tracking-tight">Periodo activo</h4>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                  {activePreset === 'custom' ? 'Personalizado' : activePreset === 'today' ? 'Hoy' : activePreset === 'week' ? '7 dias' : 'Este mes'}
                </span>
              </div>
              <p className="text-sm text-white/80">{formatRangeLabel(range)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Cobrado</p>
                <p className="mt-1 text-base font-black">{symbol}{data.cobrado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Ganancia</p>
                <p className="mt-1 text-base font-black">{symbol}{data.ganancia.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Rango de trabajo</p>
            <h4 className="text-lg font-bold text-slate-800">{formatRangeLabel(range)}</h4>
            <p className="text-sm text-slate-500">Este rango controla el resumen, el gráfico y el Excel exportado.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyQuickRange('today')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activePreset === 'today'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-gray-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('week')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activePreset === 'week'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-gray-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('month')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activePreset === 'month'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-gray-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Este mes
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</span>
            <input
              type="date"
              value={range.desde}
              max={range.hasta}
              onChange={(e) => setRange(prev => ({ ...prev, desde: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</span>
            <input
              type="date"
              value={range.hasta}
              min={range.desde}
              onChange={(e) => setRange(prev => ({ ...prev, hasta: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>

        {rangeError && <p className="mt-3 text-sm text-red-500">{rangeError}</p>}
        </div>
      </div>

      {exportError && (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-sm text-red-500">{exportError}</p>
        </div>
      )}

      <div className="responsive-grid-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Cobrado del Periodo</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.cobrado.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Pendiente del Periodo</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.pendiente.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-medium mb-1">En Mora</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.mora.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Ganancia del Periodo</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.ganancia.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="font-bold text-slate-800">Cobros del Periodo</h4>
            <p className="text-sm text-slate-500">{formatRangeLabel(range)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-end justify-between gap-2 pt-4" style={{ height: '10rem' }}>
          {weeklyData.map((d) => {
            const maxMonto = Math.max(...weeklyData.map(w => w.monto), 1);
            const height = (d.monto / maxMonto) * 100;
            return (
              <div key={d.fecha} className="group relative flex w-10 flex-col items-center gap-2 sm:w-12">
                <div 
                  className="w-full rounded-t-sm bg-blue-500 transition-all hover:bg-blue-600 cursor-pointer" 
                  style={{ height: `${Math.max(height, 5)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {symbol}{d.monto.toFixed(2)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 rotate-45 origin-left mt-1">
                  {new Date(d.fecha).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
         <h4 className="font-bold text-slate-800 mb-4">Mejores Pagadores</h4>
         <div className="space-y-3">
           {bestClients.length > 0 ? bestClients.map((client, idx) => (
              <div key={client.id} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                 <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤'}</span>
                 <span className="font-bold text-slate-700 text-sm">{client.nombre}</span>
               </div>
               <span className="text-emerald-600 font-bold text-sm">{client.score || 0} Score</span>
             </div>
           )) : (
             <p className="text-sm text-slate-400 text-center py-4">No hay datos suficientes</p>
           )}
         </div>
      </div>
    </div>
  );
}
