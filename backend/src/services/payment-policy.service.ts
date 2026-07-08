import type { Installment } from '../../generated/prisma';
import { startOfDay } from 'date-fns';

export function debeOmitirInteresPorPagoAdelantado(
  fechaVencimiento: Date,
  frecuencia?: string,
  distribucionManual: boolean = false,
  numeroCuota?: number
): boolean {
  if (distribucionManual) return false;
  if (numeroCuota === 1) return false;
  if (frecuencia !== 'quincenal' && frecuencia !== 'mensual') return false;

  const hoy = startOfDay(new Date());
  const vencimiento = startOfDay(new Date(fechaVencimiento));
  return vencimiento.getTime() > hoy.getTime();
}

export function calcularMontoSugeridoCobro(
  installment: Pick<Installment, 'numero' | 'fecha_vencimiento' | 'monto_cuota' | 'monto_interes' | 'saldo_pendiente' | 'capital_pagado' | 'interes_pagado'>,
  frecuencia?: string,
  moraPendiente: number = 0
) {
  const omitirInteresAdelantado = debeOmitirInteresPorPagoAdelantado(
    installment.fecha_vencimiento,
    frecuencia,
    false,
    installment.numero
  );
  const capitalTotal = Math.max(0, installment.monto_cuota - installment.monto_interes);
  const capitalPendiente = Math.max(0, capitalTotal - (installment.capital_pagado || 0));
  const interesPendiente = omitirInteresAdelantado
    ? 0
    : Math.max(0, installment.monto_interes - (installment.interes_pagado || 0));
  const totalExigible = capitalPendiente + interesPendiente + moraPendiente;
  const montoSugerido = Number(Math.min(installment.saldo_pendiente + moraPendiente, totalExigible).toFixed(2));

  return {
    monto_sugerido_cobro: montoSugerido,
    capital_pendiente_cobro: Number(capitalPendiente.toFixed(2)),
    interes_pendiente_cobro: Number(interesPendiente.toFixed(2)),
    mora_pendiente_cobro: Number(moraPendiente.toFixed(2)),
    total_exigible_cobro: Number(totalExigible.toFixed(2)),
    interes_omitido_por_adelanto: omitirInteresAdelantado,
  };
}

export function calcularMoraPendienteCobro(
  installment: Pick<Installment, 'fecha_vencimiento' | 'monto_cuota' | 'monto_interes' | 'capital_pagado' | 'interes_pagado' | 'mora_pagada'>,
  tasaMoraDiaria: number,
  referenceDate: Date = new Date()
) {
  if (!tasaMoraDiaria || tasaMoraDiaria <= 0) return 0;

  const now = startOfDay(referenceDate);
  const vencimiento = startOfDay(new Date(installment.fecha_vencimiento));
  const diasVencido = Math.max(0, Math.floor((now.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24)));
  if (diasVencido <= 0) return 0;

  const saldoBase = Math.max(
    0,
    (installment.monto_cuota - installment.monto_interes) - (installment.capital_pagado || 0)
      + Math.max(0, installment.monto_interes - (installment.interes_pagado || 0))
  );

  const moraAcumulada = saldoBase * (tasaMoraDiaria / 100) * diasVencido;
  return Number(Math.max(0, moraAcumulada - (installment.mora_pagada || 0)).toFixed(2));
}
