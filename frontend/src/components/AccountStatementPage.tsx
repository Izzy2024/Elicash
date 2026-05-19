import React, { useEffect, useState } from 'react';
import { apiService } from '../lib/api.service';
import { useAuthStore } from '../hooks/useAuthStore';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { SummaryCard, RiskBadge } from './ui/MorosoUI';

type Payment = {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
  monto_a_capital: number;
  monto_a_interes: number;
  monto_a_mora: number;
  distribucion_manual: boolean;
  es_excedente?: boolean;
};

type Installment = {
  id: string;
  numero: number;
  fecha_vencimiento: string;
  monto_cuota: number;
  monto_interes: number;
  capital_pagado: number;
  interes_pagado: number;
  mora_pagada: number;
  saldo_pendiente: number;
  estado: string;
  dias_vencido: number;
  es_mora: boolean;
  es_hoy: boolean;
  es_futuro: boolean;
  tiene_abono: boolean;
  payments?: Payment[];
};

type Loan = {
  id: string;
  monto: number;
  tasa_interes: number;
  frecuencia: string;
  num_cuotas: number;
  fecha_inicio: string;
  estado: string;
  installments: Installment[];
};

type Client = {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  loans: Loan[];
};

type AccountStatementPageProps = {
  clientId?: string;
};

export default function AccountStatementPage({ clientId: clientIdProp }: AccountStatementPageProps) {
  const clientId = clientIdProp ?? new URLSearchParams(window.location.search).get('id') ?? '';
  const { user, symbol } = useAuthStore();
  const { refresh: refreshQueue } = useOfflineQueue();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

  useEffect(() => {
    void fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const data = await apiService.get(`/api/clients/${clientId}`);
      if (data) {
        setClient(data as Client);
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCobrarAdelantado = async (installment: Installment) => {
    if (!confirm(`¿Desea registrar el pago de la cuota #${installment.numero} por ${symbol}${installment.saldo_pendiente.toLocaleString()}?`)) {
      return;
    }

    setProcessing(installment.id);
    try {
      const paymentData = {
        installment_id: installment.id,
        monto_pagado: installment.saldo_pendiente,
        cobrador_id: user?.id,
        clientRequestId: self.crypto.randomUUID()
      };

      const response = await apiService.post('/api/cobros/payments', paymentData);
      
      if (response && response.offline) {
        refreshQueue();
      }

      // Refresh data
      await fetchClientData();
      alert('Pago registrado correctamente.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const exportStatement = async () => {
    if (!client) return;

    setExporting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const statementHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Estado de Cuenta - ${client.nombre}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .client-info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .loan-header { background-color: #e8f4fd; padding: 10px; margin: 20px 0 10px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Estado de Cuenta</h1>
              <h2>EliCash - Gestión de Préstamos</h2>
            </div>

            <div class="client-info">
              <h3>Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${client.nombre}</p>
              <p><strong>Cédula:</strong> ${client.cedula}</p>
              <p><strong>Teléfono:</strong> ${client.telefono}</p>
              <p><strong>Dirección:</strong> ${client.direccion}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>

            ${client.loans.map((loan) => `
              <div class="loan-header">
                <h4>Préstamo #${loan.id.substring(0, 8)}</h4>
                <p>Monto: ${symbol}${loan.monto.toLocaleString()} | Tasa: ${loan.tasa_interes}% | Estado: ${loan.estado}</p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Cuota</th>
                    <th>Fecha Vencimiento</th>
                    <th>Monto Cuota</th>
                    <th>Estado</th>
                    <th>Fecha Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${loan.installments.map((inst) => `
                    <tr>
                      <td>${inst.numero}</td>
                      <td>${new Date(inst.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
                      <td>${symbol}${inst.monto_cuota.toFixed(2)}</td>
                      <td>${inst.estado}</td>
                      <td>${inst.payments && inst.payments.filter((p) => !p.es_excedente).length > 0 ? new Date(inst.payments.filter((p) => !p.es_excedente)[0].fecha_pago).toLocaleDateString('es-ES') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              ${loan.installments.some((inst) => (inst.payments || []).some((p) => !p.es_excedente)) ? `
                <div style="margin: 18px 0 8px; font-weight: bold;">Pagos registrados</div>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cuota</th>
                      <th>Capital</th>
                      <th>Interés</th>
                      <th>Mora</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${loan.installments.flatMap((inst) => (inst.payments || [])
                      .filter((p) => !p.es_excedente)
                      .map((pago) => `
                        <tr>
                          <td>${new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</td>
                          <td>#${inst.numero}</td>
                          <td>${symbol}${(pago.monto_a_capital || 0).toFixed(2)}</td>
                          <td>${symbol}${(pago.monto_a_interes || 0).toFixed(2)}</td>
                          <td>${symbol}${(pago.monto_a_mora || 0).toFixed(2)}</td>
                          <td>${symbol}${pago.monto_pagado.toFixed(2)}</td>
                        </tr>
                      `)
                    ).join('')}
                  </tbody>
                </table>
              ` : ''}
            `).join('')}

            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
              <p>Este documento es generado automáticamente por EliCash</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(statementHTML);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error('Error exporting statement:', error);
      alert('Error al generar el estado de cuenta');
    } finally {
      setExporting(false);
    }
  };

  const getTotalDebt = () => {
    if (!client?.loans) return 0;
    return client.loans.reduce((total, loan) => {
      const pendingAmount = loan.installments
        .filter((inst) => inst.estado !== 'pagada')
        .reduce((sum, inst) => sum + inst.saldo_pendiente, 0);
      return total + pendingAmount;
    }, 0);
  };

  const getTotalPaid = () => {
    if (!client?.loans) return 0;
    return client.loans.reduce((total, loan) => {
      const paidAmount = loan.installments.reduce((sum, inst) => {
        const paid = (inst.payments || [])
          .filter((p) => !p.es_excedente)
          .reduce((s, p) => s + p.monto_pagado, 0);
        return sum + paid;
      }, 0);
      return total + paidAmount;
    }, 0);
  };

  const togglePaymentDetail = (installmentId: string) => {
    setExpandedPayments(prev => {
      const next = new Set(prev);
      if (next.has(installmentId)) {
        next.delete(installmentId);
      } else {
        next.add(installmentId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Cliente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <a 
              href="/clientes" 
              className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all press-96"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{client.nombre}</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                CÉDULA: {client.cedula}
              </p>
            </div>
          </div>

          <button
            onClick={exportStatement}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3 text-white font-black uppercase text-sm tracking-wider transition-all hover:bg-blue-600 disabled:opacity-50 press-96 shadow-lg shadow-blue-500/20"
          >
            {exporting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            {exporting ? 'Generando...' : 'Exportar Estado'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard 
          label="Total Pagado" 
          value={`${symbol}${getTotalPaid().toLocaleString()}`} 
          colorClass="text-emerald-500" 
        />
        <SummaryCard 
          label="Saldo Pendiente" 
          value={`${symbol}${getTotalDebt().toLocaleString()}`} 
          colorClass="text-red-500" 
        />
        <SummaryCard 
          label="Préstamos Activos" 
          value={client.loans.filter((loan) => loan.estado === 'activo').length} 
          colorClass="text-blue-500" 
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">Detalle de Préstamos</h3>

        {client.loans.map((loan) => {
          const loanDebt = loan.installments
            .filter((inst) => inst.estado !== 'pagada')
            .reduce((sum, inst) => sum + inst.saldo_pendiente, 0);

          const paidCount = loan.installments.filter((i) => ['pagada', 'reprogramada'].includes(i.estado)).length;
          const totalCount = loan.installments.length;
          const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

          return (
            <div key={loan.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Préstamo #{loan.id.substring(0, 8).toUpperCase()}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          loan.estado === 'activo'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : loan.estado === 'completado'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}
                      >
                        {loan.estado.toUpperCase()}
                      </span>
                    </h4>
                    <p className="text-slate-500 text-sm mt-1">
                      {new Date(loan.fecha_inicio).toLocaleDateString('es-ES')} • {loan.frecuencia}
                    </p>
                  </div>

                  <div className="w-full md:w-64">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progreso de Pago</span>
                      <span className="text-xs font-bold text-slate-700">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monto Original</span>
                    <p className="font-bold text-slate-800 tabular-nums">{symbol}{loan.monto.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tasa Interés</span>
                    <p className="font-bold text-slate-800 tabular-nums">{loan.tasa_interes}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuotas</span>
                    <p className="font-bold text-slate-800 tabular-nums">{loan.num_cuotas}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Por Cobrar</span>
                    <p className="font-bold text-red-600 tabular-nums">{symbol}{loanDebt.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase text-[10px] tracking-wider">#</th>
                      <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase text-[10px] tracking-wider">Vencimiento</th>
                      <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Monto</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Capital</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Interés</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Mora</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Saldo</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-400 uppercase text-[10px] tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase text-[10px] tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loan.installments.map((inst) => {
                      const capitalTotal = inst.monto_cuota - inst.monto_interes;
                      
                      const getStatusBadge = () => {
                        if (inst.estado === 'pagada') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              Pagada
                            </span>
                          );
                        }
                        if (inst.estado === 'reprogramada') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m14.356 2A9 9 0 014.582 9M4 20v-5h.581m15.417 0A9 9 0 015.583 15" /></svg>
                              Reprogramada
                            </span>
                          );
                        }
                        if (inst.es_mora) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Mora ({inst.dias_vencido}d)
                            </span>
                          );
                        }
                        if (inst.es_hoy) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Hoy
                            </span>
                          );
                        }
                        if (inst.tiene_abono) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              Abono
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wider">
                            Pendiente
                          </span>
                        );
                      };

                      return (
                        <React.Fragment key={inst.id}>
                          <tr className={
                            inst.estado === 'pagada' ? 'bg-emerald-50/30 border-l-4 border-l-emerald-500' :
                            inst.estado === 'reprogramada' ? 'bg-amber-50 border-l-4 border-l-amber-500 hover:bg-amber-50/80 transition-colors' :
                            inst.es_mora ? 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-50/80 transition-colors' :
                            inst.es_hoy ? 'bg-yellow-50 border-l-4 border-l-yellow-500 hover:bg-yellow-50/80 transition-colors' :
                            inst.tiene_abono ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-50/80 transition-colors' :
                            'hover:bg-blue-50/30 transition-colors border-l-4 border-l-slate-300'
                          }>
                            <td className="px-6 py-4 font-bold text-slate-600 tabular-nums">{inst.numero}</td>
                            <td className="px-6 py-4 text-slate-500 tabular-nums">{new Date(inst.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700 tabular-nums">{symbol}{inst.monto_cuota.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-slate-600 tabular-nums">
                              <span className="text-emerald-600 font-medium">{symbol}{(inst.capital_pagado || 0).toFixed(0)}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span>{symbol}{capitalTotal.toFixed(0)}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600 tabular-nums">
                              <span className="text-blue-600 font-medium">{symbol}{(inst.interes_pagado || 0).toFixed(0)}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span>{symbol}{(inst.monto_interes || 0).toFixed(0)}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600 tabular-nums">
                              <span className="text-orange-600 font-medium">{symbol}{(inst.mora_pagada || 0).toFixed(0)}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span>{symbol}{(inst.mora_pagada || 0).toFixed(0)}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{symbol}{inst.saldo_pendiente.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              {getStatusBadge()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {inst.estado !== 'pagada' && inst.estado !== 'reprogramada' ? (
                                <button
                                  onClick={() => handleCobrarAdelantado(inst)}
                                  disabled={!!processing}
                                  className="text-blue-500 font-black text-[11px] tracking-widest hover:text-blue-700 disabled:opacity-30 press-96 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                                >
                                  {processing === inst.id ? '...' : 'COBRAR'}
                                </button>
                              ) : (
                                <div className="flex justify-end">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                          {/* Desglose de pagos expandible */}
                          {inst.payments && inst.payments.length > 0 && (
                            <tr className="bg-slate-50/30">
                              <td colSpan={9} className="px-6 py-2">
                                <button
                                  onClick={() => togglePaymentDetail(inst.id)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
                                >
                                  <svg className={`w-3 h-3 transition-transform duration-200 ${expandedPayments.has(inst.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                  </svg>
                                  Ver detalle ({inst.payments.length} pago{inst.payments.length > 1 ? 's' : ''})
                                </button>

                                {expandedPayments.has(inst.id) && (
                                  <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2">
                                    {inst.payments.map((pago, idx) => (
                                      <div key={pago.id} className="flex items-center justify-between text-[11px] text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-400 uppercase tracking-tighter">PAGO #{idx + 1}</span>
                                          <span className="tabular-nums">{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</span>
                                          {pago.distribucion_manual && (
                                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase">MANUAL</span>
                                          )}
                                          {pago.es_excedente && (
                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase">EXCEDENTE</span>
                                          )}
                                        </div>
                                        <div className="flex gap-3 items-center">
                                          <span className="tabular-nums">CAP: <span className="font-bold text-emerald-600">{symbol}{(pago.monto_a_capital || 0).toFixed(0)}</span></span>
                                          <span className="tabular-nums">INT: <span className="font-bold text-blue-600">{symbol}{(pago.monto_a_interes || 0).toFixed(0)}</span></span>
                                          <span className="tabular-nums">MORA: <span className="font-bold text-orange-600">{symbol}{(pago.monto_a_mora || 0).toFixed(0)}</span></span>
                                          <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded tabular-nums">TOTAL: {symbol}{pago.monto_pagado.toFixed(0)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
