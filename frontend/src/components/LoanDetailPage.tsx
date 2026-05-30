import { useEffect, useState } from 'react';
import { apiService } from '../lib/api.service';
import { getSuggestedPaymentAmount } from '../lib/payment-policy';
import { useAuthStore } from '../hooks/useAuthStore';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

type Installment = {
  id: string;
  numero: number;
  fecha_vencimiento: string;
  monto_cuota: number;
  monto_interes: number;
  saldo_pendiente: number;
  estado: string;
  tipo?: string;
  cuota_origen_id?: string;
  capital_pagado?: number;
  interes_pagado?: number;
  mora_pagada?: number;
  es_arrastre?: boolean;
  mora_pendiente_cobro?: number;
  total_exigible_cobro?: number;
  interes_omitido_por_adelanto?: boolean;
};

type Loan = {
  id: string;
  monto: number;
  tasa_interes: number;
  tipo_interes: string;
  frecuencia: string;
  num_cuotas: number;
  estado: string;
  client: {
    nombre: string;
  };
  installments: Installment[];
};

type LoanDetailPageProps = {
  loanId?: string;
};

export default function LoanDetailPage({ loanId: loanIdProp }: LoanDetailPageProps) {
  const loanId = loanIdProp ?? new URLSearchParams(window.location.search).get('id') ?? '';
  const { user, symbol } = useAuthStore();
  const { refresh: refreshQueue } = useOfflineQueue();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    void fetchLoan();
  }, [loanId]);

  const fetchLoan = async () => {
    try {
      const data = await apiService.get(`/api/loans/${loanId}`);
      if (data) {
        setLoan(data as Loan);
      }
    } catch (error) {
      console.error('Error fetching loan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCobrar = async (installment: Installment) => {
    const montoSugerido = getSuggestedPaymentAmount(installment, loan?.frecuencia).montoSugerido;
    if (!confirm(`¿Confirmar cobro de cuota #${installment.numero} por ${symbol}${montoSugerido.toLocaleString()}?`)) {
      return;
    }

    setProcessing(installment.id);
    try {
      const paymentData = {
        installment_id: installment.id,
        monto_pagado: montoSugerido,
        cobrador_id: user?.id,
        clientRequestId: self.crypto.randomUUID()
      };

      const response = await apiService.post('/api/cobros/payments', paymentData);
      
      if (response && response.offline) {
        refreshQueue();
      }

      await fetchLoan();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const exportContract = async () => {
    if (!loan) return;

    setExporting(true);
    try {
      await apiService.download(
        `/api/loans/${loanId}/contract`,
        `contrato-prestamo-${loanId.substring(0, 8)}.pdf`
      );
    } catch (error) {
      console.error('Error exporting contract:', error);
      alert('Error al descargar el contrato');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Préstamo no encontrado</p>
      </div>
    );
  }

  const saldoPendiente = loan.installments
    .filter((inst) => inst.estado !== 'pagada')
    .reduce((sum, inst) => sum + inst.saldo_pendiente, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <a href="/clientes" className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h2 className="text-2xl font-bold text-primary">Préstamo #{loanId.substring(0, 8)}</h2>
        </div>

        <button
          onClick={exportContract}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {exporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
          {exporting ? 'Generando...' : 'Exportar Contrato'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 pb-2 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-slate-500">Cliente</p>
            <h3 className="text-lg font-bold text-slate-900">{loan.client.nombre}</h3>
          </div>
          <div className="text-left sm:text-right">
            <p className="mb-1 text-sm text-slate-500">Estado</p>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                loan.estado === 'activo'
                  ? 'bg-green-100 text-green-800'
                  : loan.estado === 'completado'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {loan.estado.toUpperCase()}
            </span>
          </div>
        </div>

        <p className="mb-1 text-sm text-slate-500">Monto Original</p>
        <h3 className="mb-4 text-3xl font-bold text-slate-900">{symbol}{loan.monto.toLocaleString()}</h3>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-sm text-slate-500">Tasa de Interés</span>
            <p className="font-bold text-slate-800">
              {loan.tasa_interes}% {loan.tipo_interes}
            </p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Frecuencia</span>
            <p className="font-bold text-slate-800">{loan.frecuencia}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Cuotas</span>
            <p className="font-bold text-slate-800">{loan.num_cuotas}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Saldo Pendiente</span>
            <p className="font-bold text-slate-800">{symbol}{saldoPendiente.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-4 pt-2 font-bold text-slate-800">Calendario de Cuotas</h4>
        <div className="space-y-3">
          {loan.installments.map((installment) => {
            const isPaid = installment.estado === 'pagada';
            const isReprogramada = installment.estado === 'reprogramada';
            const isClosed = isPaid || isReprogramada;
            const pendingInstallments = loan.installments
              .filter((inst) => inst.estado === 'pendiente')
              .map((inst) => inst.numero);
            const nextInstallment = pendingInstallments.length > 0 ? Math.min(...pendingInstallments) : null;
            const isNext = !isPaid && nextInstallment !== null && installment.numero === nextInstallment;

            return (
              <div
                key={installment.id}
                className={`relative flex items-center justify-between overflow-hidden rounded-xl border bg-white p-4 ${
                  isPaid
                    ? 'border-gray-100 opacity-50'
                    : isReprogramada
                      ? 'border-amber-200 bg-amber-50'
                    : isNext
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-100'
                }`}
              >
                {isNext && <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500"></div>}
                <div>
                  <h4 className={`font-bold text-slate-800 ${isPaid ? 'line-through' : ''}`}>
                    {new Date(installment.fecha_vencimiento).toLocaleDateString('es-ES')}
                  </h4>
                  <p className="text-sm text-slate-500">
                    Cuota {installment.numero} de {loan.num_cuotas}
                  </p>
                  {(installment.es_arrastre || (installment.mora_pendiente_cobro || 0) > 0) && (
                    <p className="text-xs text-slate-400">
                      {installment.es_arrastre ? 'Arrastre' : 'Normal'}
                      {(installment.mora_pendiente_cobro || 0) > 0 ? ` • Mora ${symbol}${installment.mora_pendiente_cobro?.toFixed(2)}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="text-left sm:text-right">
                    <p className={`font-bold text-slate-800 ${isPaid ? 'line-through' : isNext ? 'text-blue-600' : ''}`}>
                      {symbol}{installment.monto_cuota.toFixed(2)}
                    </p>
                    {!isClosed && installment.total_exigible_cobro !== undefined && (
                      <p className="text-[11px] text-slate-400">
                        Exigible hoy: {symbol}{installment.total_exigible_cobro.toFixed(2)}
                      </p>
                    )}
                    <p
                      className={`text-xs font-bold ${
                        isPaid
                          ? 'text-emerald-500'
                          : isReprogramada
                            ? 'text-amber-600'
                          : isNext
                            ? 'text-blue-500'
                            : installment.estado === 'mora'
                              ? 'text-red-500'
                              : 'text-slate-400'
                      }`}
                    >
                      {isPaid ? 'PAGADA' : isReprogramada ? 'REPROGRAMADA' : isNext ? 'PRÓXIMA' : installment.estado.toUpperCase()}
                    </p>
                  </div>
                  
                  {!isClosed && (
                    <button
                      onClick={() => handleCobrar(installment)}
                      disabled={!!processing}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      {processing === installment.id ? '...' : 'COBRAR'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
