import { addDays, addWeeks, addMonths } from 'date-fns';

function siguienteVencimiento(base: Date, frecuencia: string): Date {
  if (frecuencia === 'diaria') return addDays(base, 1);
  if (frecuencia === 'semanal') return addWeeks(base, 1);
  if (frecuencia === 'quincenal') return addDays(base, 15);
  return addMonths(base, 1);
}

export class LoanCalculatorService {
  /**
   * Calcula tabla amortización simple (interés fijo dividido en cuotas).
   * Suponemos tasa como % total sobre el préstamo o % por período.
   * Usaremos % total para simplificar: Interés Total = Monto * (Tasa / 100)
   */
  static calcularAmortizacionSimple(monto: number, tasa: number, cuotas: number, frecuencia: string, fechaInicio: Date) {
    const table = [];
    const interesTotal = (monto * (tasa / 100));
    const interesPorCuota = interesTotal / cuotas;
    const capitalPorCuota = monto / cuotas;
    const cuotaTotal = capitalPorCuota + interesPorCuota;

    let fechaActual = new Date(fechaInicio);

    for (let i = 1; i <= cuotas; i++) {
       fechaActual = siguienteVencimiento(fechaActual, frecuencia);

       table.push({
         numero: i,
         fecha_vencimiento: new Date(fechaActual),
         monto_cuota: Number(cuotaTotal.toFixed(2)),
         monto_interes: Number(interesPorCuota.toFixed(2)),
         saldo_pendiente: Math.max(0, Number((monto - (capitalPorCuota * i)).toFixed(2))),
         estado: 'pendiente'
       });
    }

    return table;
  }

  static calcularAmortizacionFrancesa(monto: number, tasaMensual: number, cuotas: number, frecuencia: string, fechaInicio: Date) {
    const table = [];
    const r = tasaMensual / 100;
    // Formula Cuota = P * (r(1+r)^n)/((1+r)^n - 1); when r=0 simplifies to P/n
    const cuotaTotal = r === 0
      ? monto / cuotas
      : monto * (r * Math.pow(1 + r, cuotas)) / (Math.pow(1 + r, cuotas) - 1);
    
    let saldoPendiente = monto;
    let fechaActual = new Date(fechaInicio);

    for (let i = 1; i <= cuotas; i++) {
      fechaActual = siguienteVencimiento(fechaActual, frecuencia);

      const interesCuota = saldoPendiente * r;
      const capitalCuota = cuotaTotal - interesCuota;
      saldoPendiente -= capitalCuota;

      table.push({
         numero: i,
         fecha_vencimiento: new Date(fechaActual),
         monto_cuota: Number(cuotaTotal.toFixed(2)),
         monto_interes: Number(interesCuota.toFixed(2)),
         saldo_pendiente: Math.max(0, Number(saldoPendiente.toFixed(2))),
         estado: 'pendiente'
      });
    }

    return table;
  }

  /**
   * Sin plazo: genera la primera cuota.
   * monto_cuota = capital + interés del período (máximo que podría pagar).
   * monto_interes = interés mínimo obligatorio del período.
   * Waterfall existente funciona: interés primero, resto a capital.
   */
  static calcularPrimerCuotaSinPlazo(
    monto: number,
    tasa: number,
    frecuencia: string,
    fechaInicio: Date
  ) {
    const fechaVencimiento = siguienteVencimiento(new Date(fechaInicio), frecuencia);
    const interes = Number((monto * (tasa / 100)).toFixed(2));

    return {
      numero: 1,
      fecha_vencimiento: fechaVencimiento,
      monto_cuota: Number((monto + interes).toFixed(2)),
      monto_interes: interes,
      saldo_pendiente: monto,
      estado: 'pendiente',
    };
  }

  /**
   * Sin plazo: genera la siguiente cuota después de un pago que cubrió intereses.
   */
  static calcularSiguienteCuotaSinPlazo(
    saldoCapital: number,
    tasa: number,
    frecuencia: string,
    fechaUltimaCuota: Date,
    numeroCuota: number
  ) {
    const fechaVencimiento = siguienteVencimiento(new Date(fechaUltimaCuota), frecuencia);
    const interes = Number((saldoCapital * (tasa / 100)).toFixed(2));

    return {
      numero: numeroCuota,
      fecha_vencimiento: fechaVencimiento,
      monto_cuota: Number((saldoCapital + interes).toFixed(2)),
      monto_interes: interes,
      saldo_pendiente: saldoCapital,
      estado: 'pendiente',
    };
  }
}
