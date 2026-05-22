import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

type Filtro = 'hoy' | 'mora' | 'activos' | 'todos';

export default function CobrosDia() {
  const [cobros, setCobros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [distManual, setDistManual] = useState({ capital: '', interes: '', mora: '' });
  const [mostrarOpcionesAvanzadas, setMostrarOpcionesAvanzadas] = useState(false);

  // Nuevos estados
  const [filtro, setFiltro] = useState<Filtro>('hoy');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalRecaudadoHoy, setTotalRecaudadoHoy] = useState(0);
  const [clientesVisitadosHoy, setClientesVisitadosHoy] = useState<Set<string>>(new Set());

  const { user, symbol } = useAuthStore();
  const { pendingCount, refresh: refreshQueue } = useOfflineQueue();

  React.useEffect(() => {
    fetchCobros();
    fetchResumenHoy();
  }, [filtro]);

  const fetchCobros = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(`/api/cobros/hoy?filtro=${filtro}`);
      setCobros(data);
    } catch (error) {
      console.error('Error fetching cobros:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumenHoy = async () => {
    try {
      // Obtener pagos de hoy para el resumen
      const today = new Date().toISOString().split('T')[0];
      const response = await apiService.get(`/api/reportes/dia`);
      if (response && response.cobradoHoy) {
        setTotalRecaudadoHoy(response.cobradoHoy);
      }
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  const cobrosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return cobros;
    const term = searchTerm.toLowerCase();
    return cobros.filter(c =>
      c.loan?.client?.nombre?.toLowerCase().includes(term)
    );
  }, [cobros, searchTerm]);

  const handleCobrar = async (installmentId: string) => {
    const cobro = cobros.find(c => c.id === installmentId);
    if (!cobro) return;

    setProcessing(installmentId);

    try {
      const monto = customAmount ? parseFloat(customAmount) : cobro.saldo_pendiente;

      if (isNaN(monto) || monto <= 0 || monto > cobro.saldo_pendiente) {
        alert('Monto inválido');
        setProcessing(null);
        return;
      }

      const paymentData: any = {
        installment_id: installmentId,
        monto_pagado: monto,
        cobrador_id: user?.id,
        clientRequestId: self.crypto.randomUUID(),
        foto_recibo: receiptPhoto
      };

      if (modoManual) {
        const capital = parseFloat(distManual.capital || '0');
        const interes = parseFloat(distManual.interes || '0');
        const mora = parseFloat(distManual.mora || '0');
        const totalManual = capital + interes + mora;
        if (Math.abs(totalManual - monto) < 0.01) {
          paymentData.distribucion_manual = { capital, interes, mora };
        }
      }

      const response = await apiService.post('/api/cobros/payments', paymentData);

      const isOffline = response && response.offline;
      const distribucion = response?.distribucion;

      // Update local state
      setCobros((prev) => {
        if (distribucion?.cuota_estado === 'reprogramada') {
          return prev.filter((c) => c.id !== installmentId);
        }

        return prev.map((c) =>
          c.id === installmentId
            ? {
                ...c,
                estado: distribucion?.cuota_estado || ((monto >= c.saldo_pendiente) ? 'pagada' : 'pendiente'),
                saldo_pendiente: distribucion?.cuota_saldo_restante ?? Math.max(0, c.saldo_pendiente - monto),
                capital_pagado: (c.capital_pagado || 0) + (distribucion?.a_capital || 0),
                interes_pagado: (c.interes_pagado || 0) + (distribucion?.a_interes || 0),
                tiene_abono: true
              }
            : c
        );
      });

      // Update resumen
      setTotalRecaudadoHoy(prev => prev + monto);
      setClientesVisitadosHoy(prev => {
        const next = new Set(prev);
        next.add(cobro.loan?.client?.id);
        return next;
      });

      if (isOffline) {
        refreshQueue();
      } else {
        setLastPayment(response?.payment || response);
        await fetchCobros();
        await fetchResumenHoy();
      }

      resetForm();
    } catch (error) {
      console.error('Error registering payment:', error);
      alert('Error al registrar el pago.');
    } finally {
      setProcessing(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const exportReceipt = async (paymentId: string) => {
    try {
      await apiService.download(
        `/api/cobros/payments/${paymentId}/receipt`,
        `recibo-pago-${paymentId.substring(0, 8)}.pdf`
      );
    } catch (error) {
      console.error('Error exporting receipt:', error);
      alert('Error al descargar el recibo');
    }
  };

  const calcularPreviewDistribucion = (cobro: any, monto: number) => {
    if (!monto || monto <= 0) return null;
    const interesTotal = cobro.monto_interes || 0;
    const capitalTotal = (cobro.monto_cuota || 0) - interesTotal;
    const interesPagado = cobro.interes_pagado || 0;
    const capitalPagado = cobro.capital_pagado || 0;

    const interesRestante = Math.max(0, interesTotal - interesPagado);
    const aInteres = Math.min(monto, interesRestante);
    const restante = monto - aInteres;
    const capitalRestante = Math.max(0, capitalTotal - capitalPagado);
    const aCapital = Math.min(restante, capitalRestante);
    const excedente = restante - aCapital;

    return { aCapital, aInteres, aMora: 0, excedente, saldoRestante: Math.max(0, (cobro.saldo_pendiente || 0) - monto) };
  };

  const resetForm = () => {
    setConfirmId(null);
    setCustomAmount('');
    setReceiptPhoto(null);
    setModoManual(false);
    setDistManual({ capital: '', interes: '', mora: '' });
    setMostrarOpcionesAvanzadas(false);
  };

  const getCardStyle = (cobro: any) => {
    // Fallback calculation si el backend aún no tiene los campos nuevos
    const diasVencido = cobro.dias_vencido !== undefined ? cobro.dias_vencido : Math.floor((new Date().getTime() - new Date(cobro.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
    const esMora = cobro.es_mora !== undefined ? cobro.es_mora : (diasVencido > 0);
    const esHoy = cobro.es_hoy !== undefined ? cobro.es_hoy : (diasVencido === 0);
    const tieneAbono = cobro.tiene_abono !== undefined ? cobro.tiene_abono : ((cobro.capital_pagado || 0) > 0 || (cobro.interes_pagado || 0) > 0);

    if (cobro.estado === 'pagada') return 'border-l-4 border-l-emerald-500 border-emerald-200 bg-emerald-50';
    if (esMora) return 'border-l-4 border-l-red-500 border-red-200 bg-red-50';
    if (esHoy) return 'border-l-4 border-l-yellow-500 border-yellow-200 bg-yellow-50';
    if (tieneAbono) return 'border-l-4 border-l-blue-500 border-blue-200 bg-blue-50';
    return 'border-l-4 border-l-slate-300 border-gray-100 bg-white';
  };

  const getBadge = (cobro: any) => {
    const diasVencido = cobro.dias_vencido !== undefined ? cobro.dias_vencido : Math.floor((new Date().getTime() - new Date(cobro.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
    const esMora = cobro.es_mora !== undefined ? cobro.es_mora : (diasVencido > 0);
    const esHoy = cobro.es_hoy !== undefined ? cobro.es_hoy : (diasVencido === 0);
    const tieneAbono = cobro.tiene_abono !== undefined ? cobro.tiene_abono : ((cobro.capital_pagado || 0) > 0 || (cobro.interes_pagado || 0) > 0);

    if (cobro.estado === 'pagada') return { text: 'PAGADA', class: 'bg-emerald-100 text-emerald-700' };
    if (esMora) return { text: `MORA (${diasVencido} días)`, class: 'bg-red-100 text-red-700' };
    if (esHoy) return { text: 'HOY', class: 'bg-yellow-100 text-yellow-700' };
    if (tieneAbono) return { text: 'ABONO', class: 'bg-blue-100 text-blue-700' };
    return { text: 'PENDIENTE', class: 'bg-slate-100 text-slate-600' };
  };

  const metaHoy = cobros.reduce((acc, curr) => acc + (curr.saldo_pendiente || 0), 0);
  const totalClientes = cobros.length;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">

      {!isOnline && (
        <div className="bg-warning/20 text-warning px-4 py-3 rounded-xl text-sm font-medium border border-warning/30 flex items-center gap-2 shadow-sm animate-in fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Modo sin conexión. Los cobros se sincronizarán al recuperar señal.
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['hoy', 'mora', 'activos', 'todos'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
              filtro === f
                ? f === 'mora' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-50'
            }`}
          >
            {f === 'hoy' && 'Hoy'}
            {f === 'mora' && 'Mora'}
            {f === 'activos' && 'Activos'}
            {f === 'todos' && 'Todos'}
          </button>
        ))}
      </div>

      {/* Último pago */}
      {lastPayment && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-emerald-800">Pago registrado exitosamente</p>
              <p className="text-sm text-emerald-600">{symbol}{lastPayment.monto_pagado?.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={() => exportReceipt(lastPayment.id)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Recibo
          </button>
        </div>
      )}

      {/* Lista de cobros */}
      <div className="grid gap-3">
        {cobrosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              {filtro === 'mora' ? '🎉 No hay morosos' :
               searchTerm ? 'Ningún cliente coincide' :
               'No hay cobros pendientes'}
            </p>
          </div>
        )}

        {cobrosFiltrados.map(cobro => {
          const isCompleted = cobro.estado === 'pagada';
          const badge = getBadge(cobro);
          const client = cobro.loan?.client;
          const preview = confirmId === cobro.id ? calcularPreviewDistribucion(cobro, parseFloat(customAmount || '0')) : null;

          return (
              <div key={cobro.id} className={`p-4 rounded-xl shadow-sm border transition-all ${getCardStyle(cobro)}`}>
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.class}`}>
                      {badge.text}
                    </span>
                    <span className="text-xs text-slate-400">Cuota #{cobro.numero}</span>
                  </div>
                  <h4 className={`font-bold truncate ${isCompleted ? 'text-emerald-700 line-through opacity-70' : 'text-slate-900'}`}>
                    {client?.nombre || 'Cliente desconocido'}
                  </h4>
                </div>
                  <div className="text-left sm:text-right">
                  <p className="font-bold text-lg text-slate-700">{symbol}{cobro.monto_cuota?.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">
                    Saldo: {symbol}{cobro.saldo_pendiente?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Datos de contacto */}
              {!isCompleted && client && (
                <div className="mb-3 flex flex-wrap gap-3 text-sm">
                  {client.telefono && (
                    <a
                      href={`tel:${client.telefono}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {client.telefono}
                    </a>
                  )}
                  {client.direccion && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate max-w-[180px]">{client.direccion}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Progreso de pago */}
              {cobro.tiene_abono && !isCompleted && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Capital: {symbol}{(cobro.capital_pagado || 0).toLocaleString()}/{(cobro.monto_cuota - cobro.monto_interes).toLocaleString()}</span>
                    <span>Int: {symbol}{(cobro.interes_pagado || 0).toLocaleString()}/{(cobro.monto_interes || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((cobro.capital_pagado + cobro.interes_pagado) / cobro.monto_cuota) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!isCompleted ? (
                  confirmId === cobro.id ? (
                    <div className="flex flex-col gap-3 w-full animate-in slide-in-from-top-4">
                      {/* Monto y foto */}
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center">
                          <span className="text-slate-400 mr-1">{symbol}</span>
                          <input
                            type="number"
                            placeholder={cobro.saldo_pendiente.toLocaleString()}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="bg-transparent w-full focus:outline-none font-bold text-slate-700"
                          />
                        </div>
                        <label className={`cursor-pointer p-2 rounded-xl border-2 transition-colors ${receiptPhoto ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </label>
                      </div>

                      {/* Preview distribución automática */}
                      {preview && preview.saldoRestante !== cobro.saldo_pendiente && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                          <p className="font-semibold text-blue-800 mb-1">Distribución automática:</p>
                          <div className="flex justify-between text-blue-700">
                            <span>A capital: {symbol}{preview.aCapital.toLocaleString()}</span>
                            <span>A interés: {symbol}{preview.aInteres.toLocaleString()}</span>
                          </div>
                          {preview.excedente > 0 && (
                            <p className="text-emerald-600 font-medium mt-1">Excedente: {symbol}{preview.excedente.toLocaleString()} → siguiente cuota</p>
                          )}
                          <p className="text-slate-500 mt-1">Saldo cuota: {symbol}{preview.saldoRestante.toLocaleString()}</p>
                        </div>
                      )}

                      {/* Opciones avanzadas colapsadas */}
                      <button
                        onClick={() => setMostrarOpcionesAvanzadas(!mostrarOpcionesAvanzadas)}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <svg className={`w-4 h-4 transition-transform ${mostrarOpcionesAvanzadas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        ⚙️ Opciones avanzadas
                      </button>

                      {mostrarOpcionesAvanzadas && (
                        <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                          {/* Distribución manual */}
                          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={modoManual}
                              onChange={(e) => setModoManual(e.target.checked)}
                              className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                            />
                            Distribución manual
                          </label>

                          {modoManual && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block">Capital</label>
                                <input
                                  type="number"
                                  value={distManual.capital}
                                  onChange={(e) => setDistManual({ ...distManual, capital: e.target.value })}
                                  className="bg-transparent w-full focus:outline-none font-bold text-slate-700 text-sm"
                                />
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block">Interés</label>
                                <input
                                  type="number"
                                  value={distManual.interes}
                                  onChange={(e) => setDistManual({ ...distManual, interes: e.target.value })}
                                  className="bg-transparent w-full focus:outline-none font-bold text-slate-700 text-sm"
                                />
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <label className="text-[10px] uppercase font-bold text-slate-400 block">Mora</label>
                                <input
                                  type="number"
                                  value={distManual.mora}
                                  onChange={(e) => setDistManual({ ...distManual, mora: e.target.value })}
                                  className="bg-transparent w-full focus:outline-none font-bold text-slate-700 text-sm"
                                />
                              </div>
                            </div>
                          )}
                          {modoManual && (() => {
                            const totalManual = parseFloat(distManual.capital || '0') + parseFloat(distManual.interes || '0') + parseFloat(distManual.mora || '0');
                            const monto = parseFloat(customAmount || '0');
                            const diff = Math.abs(totalManual - monto);
                            if (diff > 0.01 && monto > 0) {
                              return <p className="text-red-500 text-xs font-medium">La suma debe ser igual al monto recibido ({symbol}{monto.toLocaleString()})</p>;
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button onClick={resetForm} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 hover:bg-slate-200">
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleCobrar(cobro.id)}
                          disabled={processing === cobro.id}
                          className="flex-[2] rounded-xl bg-blue-500 py-3 font-bold text-white shadow-md hover:bg-blue-600 disabled:opacity-50"
                        >
                          {processing === cobro.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                          ) : (
                            'CONFIRMAR COBRO'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full justify-end">
                      {client?.telefono && (
                        <a
                          href={`tel:${client.telefono}`}
                          className="h-10 w-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => { setConfirmId(cobro.id); setCustomAmount(cobro.saldo_pendiente.toString()); }}
                        className="h-10 px-4 bg-blue-500 text-white rounded-full flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm font-bold text-sm"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        COBRAR
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    PAGADA
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen del día */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Recaudado hoy</p>
              <p className="text-xl font-bold text-slate-800">{symbol}{totalRecaudadoHoy.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">
                {clientesVisitadosHoy.size}/{totalClientes} clientes
              </p>
              <p className="text-sm text-slate-600">
                Meta: {symbol}{metaHoy.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
