import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';

export default function DashboardData() {
  const { symbol } = useAuthStore();
  const [data, setData] = useState({
    cobrado: 0,
    pendiente: 0,
    mora: 0,
    ganancia: 0,
    loading: true
  });
  const [bestClients, setBestClients] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setExportError('');

      const response = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://localhost:4000'}/api/reportes/excel`, {
        credentials: 'include'
      });

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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dia, ganancias, morosos, clients, semana] = await Promise.all([
          apiService.get('/api/reportes/dia'),
          apiService.get('/api/reportes/ganancias'),
          apiService.get('/api/cobros/morosos'),
          apiService.get('/api/clients'), // TODO: add score sorting/limit in backend
          apiService.get('/api/reportes/semana')
        ]);

        setData({
          cobrado: dia.cobradoHoy,
          pendiente: dia.pendienteHoy,
          mora: morosos.reduce((acc: number, m: any) => acc + m.saldo_pendiente, 0),
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
  }, []);


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
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {exportError && <p className="text-sm text-red-500">{exportError}</p>}
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:self-end"
        >
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="responsive-grid-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Cobrado Hoy</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.cobrado.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Pendiente Hoy</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.pendiente.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-medium mb-1">En Mora</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.mora.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-500 font-medium mb-1">Ganancia Mes</p>
          <p className="text-2xl font-bold text-slate-800">{symbol}{data.ganancia.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h4 className="font-bold text-slate-800 mb-4">Cobros Últimos 7 Días</h4>
        <div className="flex items-end justify-between h-32 gap-1 pt-4 sm:h-40">
          {weeklyData.map((d) => {
            const maxMonto = Math.max(...weeklyData.map(w => w.monto), 1);
            const height = (d.monto / maxMonto) * 100;
            return (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div 
                  className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600 cursor-pointer" 
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
