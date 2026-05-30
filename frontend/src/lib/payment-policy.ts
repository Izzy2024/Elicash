type InstallmentLike = {
  numero: number;
  fecha_vencimiento: string | Date;
  monto_cuota: number;
  monto_interes: number;
  saldo_pendiente: number;
  capital_pagado?: number;
  interes_pagado?: number;
  mora_pagada?: number;
  monto_sugerido_cobro?: number;
  capital_pendiente_cobro?: number;
  interes_pendiente_cobro?: number;
  mora_pendiente_cobro?: number;
  total_exigible_cobro?: number;
  interes_omitido_por_adelanto?: boolean;
};

export function shouldOmitFutureInterest(numero: number, fechaVencimiento: string | Date, frecuencia?: string) {
  if (numero === 1) return false;
  if (frecuencia !== 'quincenal' && frecuencia !== 'mensual') return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  return vencimiento.getTime() > hoy.getTime();
}

export function getSuggestedPaymentAmount(installment: InstallmentLike, frecuencia?: string) {
  if (
    installment.monto_sugerido_cobro !== undefined &&
    installment.capital_pendiente_cobro !== undefined &&
    installment.interes_pendiente_cobro !== undefined &&
    installment.mora_pendiente_cobro !== undefined &&
    installment.interes_omitido_por_adelanto !== undefined
  ) {
    return {
      capitalPendiente: installment.capital_pendiente_cobro,
      interesPendiente: installment.interes_pendiente_cobro,
      moraPendiente: installment.mora_pendiente_cobro,
      omiteInteresAdelantado: installment.interes_omitido_por_adelanto,
      montoSugerido: installment.monto_sugerido_cobro,
    };
  }

  const capitalTotal = Math.max(0, (installment.monto_cuota || 0) - (installment.monto_interes || 0));
  const capitalPagado = installment.capital_pagado || 0;
  const interesPagado = installment.interes_pagado || 0;
  const moraPagada = installment.mora_pagada || 0;
  const omiteInteresAdelantado = shouldOmitFutureInterest(
    installment.numero,
    installment.fecha_vencimiento,
    frecuencia
  );

  const capitalPendiente = Math.max(0, capitalTotal - capitalPagado);
  const interesPendiente = omiteInteresAdelantado
    ? 0
    : Math.max(0, (installment.monto_interes || 0) - interesPagado);
  const moraPendiente = Math.max(0, moraPagada > 0 ? 0 : 0);
  const montoSugerido = Number((capitalPendiente + interesPendiente + moraPendiente).toFixed(2));

  return {
    capitalPendiente,
    interesPendiente,
    moraPendiente,
    omiteInteresAdelantado,
    montoSugerido: Number(Math.min(installment.saldo_pendiente || 0, montoSugerido || installment.saldo_pendiente || 0).toFixed(2)),
  };
}
