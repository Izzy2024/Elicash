import { Request, Response } from 'express';
import type { Installment, Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { addDays, addMonths, addWeeks, endOfDay, startOfDay } from 'date-fns';
import { ScoreService } from '../services/score.service';
import { PaymentDistributionService } from '../services/payment-distribution.service';
import { registerPaymentSchema } from '../validation/schemas';
import { logger } from '../lib/logger';

export const getMorosos = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const today = startOfDay(new Date());

    const installments = await prisma.installment.findMany({
      where: {
        estado: 'pendiente',
        fecha_vencimiento: {
          lt: today
        },
        loan: {
          estado: 'activo',
          client: {
            tenantId: tenantId
          }
        }
      },
      include: {
        loan: {
          include: {
            client: true
          }
        }
      },
      orderBy: {
        fecha_vencimiento: 'asc'
      }
    });

    const morosos = installments.map((inst) => {
      const diasVencido = Math.floor((today.getTime() - inst.fecha_vencimiento.getTime()) / (1000 * 60 * 60 * 24));
      return {
        installmentId: inst.id,
        numero: inst.numero,
        monto_cuota: inst.monto_cuota,
        saldo_pendiente: inst.saldo_pendiente,
        fecha_vencimiento: inst.fecha_vencimiento,
        diasVencido,
        loan: {
          id: inst.loan.id,
          monto: inst.loan.monto,
          frecuencia: inst.loan.frecuencia,
        },
        client: {
          id: inst.loan.client.id,
          nombre: inst.loan.client.nombre,
          telefono: inst.loan.client.telefono,
          direccion: inst.loan.client.direccion,
          score: inst.loan.client.score,
        }
      };
    });

    res.json(morosos);
  } catch (error) {
    logger.error({ err: error }, 'getMorosos error');
    res.status(500).json({ message: 'Error al obtener morosos' });
  }
};

export const getCobrosHoy = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const filtro = (req.query.filtro as string) || 'hoy';
    const search = (req.query.search as string) || '';

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Construir where base
    const clientWhere: Prisma.ClientWhereInput = {
      tenantId
    };

    const whereBase: Prisma.InstallmentWhereInput = {
      estado: 'pendiente',
      loan: {
        estado: 'activo',
        client: clientWhere
      }
    };

    // Aplicar filtro de fecha según tipo
    if (filtro === 'hoy') {
      whereBase.fecha_vencimiento = {
        gte: todayStart,
        lte: todayEnd
      };
    } else if (filtro === 'mora') {
      whereBase.fecha_vencimiento = {
        lt: todayStart
      };
    } else if (filtro === 'activos' || filtro === 'todos') {
      // No filtra por fecha, solo estado pendiente
    }

    // Aplicar búsqueda por nombre si existe
    if (search && search.trim()) {
      clientWhere.nombre = {
        contains: search.trim(),
        mode: 'insensitive'
      };
    }

    const installments = await prisma.installment.findMany({
      where: whereBase,
      include: {
        loan: {
          include: {
            client: true
          }
        }
      },
      orderBy: filtro === 'mora'
        ? { fecha_vencimiento: 'asc' }
        : { fecha_vencimiento: 'asc' }
    });

    // Enriquecer con campos calculados
    const enriched = installments.map((inst) => {
      const rawDiff = (todayStart.getTime() - new Date(inst.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24);
      const diasVencido = Math.floor(rawDiff);
      const esMora = diasVencido > 0;
      const esHoy = diasVencido === 0;
      const esFuturo = diasVencido < 0;
      const tieneAbono = (inst.capital_pagado || 0) > 0 || (inst.interes_pagado || 0) > 0;

      return {
        ...inst,
        dias_vencido: diasVencido,
        es_mora: esMora,
        es_hoy: esHoy,
        es_futuro: esFuturo,
        tiene_abono: tieneAbono
      };
    });

    // Reordenar mora: más días vencido primero
    const result = filtro === 'mora'
      ? enriched.sort((a, b) => b.dias_vencido - a.dias_vencido)
      : enriched;

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'getCobrosHoy error');
    res.status(500).json({ message: 'Error al obtener cobros' });
  }
};

export const registerPayment = async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { installment_id, monto_pagado, clientRequestId, distribucion_manual, foto_recibo } = registerPaymentSchema.parse(req.body);

    // Check idempotency
    if (clientRequestId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { clientRequestId }
      });
      if (existingPayment) {
        return res.status(200).json(existingPayment);
      }
    }

    const installment = await prisma.installment.findUnique({
      where: { id: installment_id },
      include: {
        loan: {
          include: {
            client: true
          }
        }
      }
    });

    if (!installment || installment.loan.client.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }

    if (installment.estado === 'pagada' || installment.estado === 'reprogramada') {
      return res.status(400).json({ message: 'La cuota ya fue cerrada' });
    }

    const isSinPlazo = installment.loan.tipo_prestamo === 'sin_plazo';

    // Obtener configuración del préstamo
    const loanConfig = await PaymentDistributionService.obtenerConfiguracion(installment.loan_id);

    // Calcular distribución (el waterfall funciona igual para ambos tipos)
    const moraPendiente = calcularMoraPendiente(installment, loanConfig.tasa_mora_diaria);
    const dist = PaymentDistributionService.calcularDistribucion(
      monto_pagado,
      installment,
      loanConfig.orden_distribucion,
      distribucion_manual,
      moraPendiente
    );

    // ─── Sin plazo: flujo independiente ───────────────────────────────────────
    if (isSinPlazo) {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            installment_id,
            monto_pagado,
            monto_a_capital: dist.capital,
            monto_a_interes: dist.interes,
            monto_a_mora: dist.mora,
            saldo_reprogramado: 0,
            distribucion_manual: !!distribucion_manual,
            es_excedente: false,
            foto_recibo_url: foto_recibo || null,
            cobrador_id: userId,
            clientRequestId: clientRequestId ?? null
          }
        });

        const nuevaInteresPagado = Number(((installment.interes_pagado || 0) + dist.interes).toFixed(2));
        const interesCubierto = nuevaInteresPagado >= installment.monto_interes - 0.01;
        const nuevoSaldoCapital = Number(
          Math.max(0, (installment.loan.saldo_capital ?? installment.loan.monto) - dist.capital).toFixed(2)
        );

        await tx.installment.update({
          where: { id: installment_id },
          data: {
            capital_pagado: { increment: dist.capital },
            interes_pagado: { increment: dist.interes },
            mora_pagada: { increment: dist.mora },
            saldo_pendiente: nuevoSaldoCapital,
            estado: interesCubierto ? 'pagada' : 'pendiente'
          }
        });

        if (interesCubierto) {
          if (nuevoSaldoCapital <= 0.01) {
            await tx.loan.update({
              where: { id: installment.loan_id },
              data: { estado: 'completado', saldo_capital: 0 }
            });
          } else {
            await tx.loan.update({
              where: { id: installment.loan_id },
              data: { saldo_capital: nuevoSaldoCapital, num_cuotas: { increment: 1 } }
            });
            const lastInst = await tx.installment.findFirst({
              where: { loan_id: installment.loan_id },
              orderBy: { numero: 'desc' }
            });
            const nextInteres = Number((nuevoSaldoCapital * (installment.loan.tasa_interes / 100)).toFixed(2));
            await tx.installment.create({
              data: {
                loan_id: installment.loan_id,
                numero: (lastInst?.numero ?? 0) + 1,
                fecha_vencimiento: calcularProximoVencimiento(installment.fecha_vencimiento, installment.loan.frecuencia),
                monto_cuota: Number((nuevoSaldoCapital + nextInteres).toFixed(2)),
                monto_interes: nextInteres,
                saldo_pendiente: nuevoSaldoCapital,
                estado: 'pendiente'
              }
            });
          }
        }

        return { payment, interesCubierto, nuevoSaldoCapital };
      });

      ScoreService.recalcularScore(installment.loan.client_id);

      return res.status(201).json({
        payment: result.payment,
        distribucion: {
          a_capital: dist.capital,
          a_interes: dist.interes,
          a_mora: dist.mora,
          excedente: 0,
          saldo_capital_restante: result.nuevoSaldoCapital,
          periodo_cerrado: result.interesCubierto,
          cuota_estado: result.interesCubierto ? 'pagada' : 'pendiente'
        },
        loan_completado: result.interesCubierto && result.nuevoSaldoCapital <= 0.01
      });
    }

    // ─── Préstamos con plazo fijo (lógica original) ──────────────────────────
    const interesPendiente = Number(
      Math.max(0, installment.monto_interes - (installment.interes_pagado || 0)).toFixed(2)
    );
    const capitalPendiente = Number(
      Math.max(0, (installment.monto_cuota - installment.monto_interes) - (installment.capital_pagado || 0)).toFixed(2)
    );
    const interesReprogramado = Number(Math.max(0, interesPendiente - dist.interes).toFixed(2));
    const capitalReprogramado = Number(Math.max(0, capitalPendiente - dist.capital).toFixed(2));
    const moraReprogramada = Number(Math.max(0, moraPendiente - dist.mora).toFixed(2));
    const saldoRestanteEnCuota = Number(
      Math.max(0, interesReprogramado + capitalReprogramado + moraReprogramada).toFixed(2)
    );

    const debeReprogramarParcial = dist.excedente === 0 && saldoRestanteEnCuota > 0;
    const saldoReprogramado = debeReprogramarParcial ? saldoRestanteEnCuota : 0;
    const estadoCuota = debeReprogramarParcial
      ? 'reprogramada'
      : saldoRestanteEnCuota <= 0
        ? 'pagada'
        : 'pendiente';

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          installment_id,
          monto_pagado,
          monto_a_capital: dist.capital,
          monto_a_interes: dist.interes,
          monto_a_mora: dist.mora,
          saldo_reprogramado: saldoReprogramado,
          distribucion_manual: !!distribucion_manual,
          es_excedente: false,
          foto_recibo_url: foto_recibo || null,
          cobrador_id: userId,
          clientRequestId: clientRequestId ?? null
        }
      });

      if (debeReprogramarParcial) {
        await reprogramarCuota(
          tx, installment,
          dist.capital, dist.interes, dist.mora,
          saldoReprogramado, interesReprogramado, moraReprogramada,
          installment.loan.frecuencia
        );
      } else {
        await tx.installment.update({
          where: { id: installment_id },
          data: {
            capital_pagado: { increment: dist.capital },
            interes_pagado: { increment: dist.interes },
            mora_pagada: { increment: dist.mora },
            saldo_pendiente: saldoRestanteEnCuota,
            estado: estadoCuota
          }
        });
      }

      if (dist.excedente > 0) {
        await aplicarExcedenteASiguienteCuota(
          tx, installment.loan_id, dist.excedente, userId,
          loanConfig.orden_distribucion, loanConfig.tasa_mora_diaria
        );
      }

      if (estadoCuota === 'pagada') {
        const remaining = await tx.installment.count({
          where: {
            loan_id: installment.loan_id,
            estado: { notIn: ['pagada', 'reprogramada'] }
          }
        });
        if (remaining === 0) {
          await tx.loan.update({
            where: { id: installment.loan_id },
            data: { estado: 'completado' }
          });
        }
      }

      return { payment, excedente: dist.excedente };
    });

    ScoreService.recalcularScore(installment.loan.client_id);

    res.status(201).json({
      payment: result.payment,
      distribucion: {
        a_capital: dist.capital,
        a_interes: dist.interes,
        a_mora: dist.mora,
        excedente: dist.excedente,
        saldo_reprogramado: saldoReprogramado,
        cuota_saldo_restante: debeReprogramarParcial ? 0 : saldoRestanteEnCuota,
        cuota_estado: estadoCuota
      },
      loan_completado: estadoCuota === 'pagada' && result.excedente === 0
    });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return res.status(400).json({ message: 'Datos de pago inválidos' });
    }

    logger.error({ err: error }, 'registerPayment error');
    res.status(500).json({ message: error instanceof Error ? error.message : 'Error al registrar pago' });
  }
};

function calcularProximoVencimiento(fechaBase: Date, frecuencia: string): Date {
  switch (frecuencia) {
    case 'diaria':
      return addDays(fechaBase, 1);
    case 'semanal':
      return addWeeks(fechaBase, 1);
    case 'mensual':
      return addMonths(fechaBase, 1);
    default:
      return addDays(fechaBase, 1);
  }
}

/**
 * Aplica un excedente de pago a la siguiente cuota pendiente.
 */
async function aplicarExcedenteASiguienteCuota(
  tx: any,
  loanId: string,
  excedente: number,
  cobradorId: string,
  ordenDistribucion: string,
  tasaMoraDiaria: number
) {
  const siguienteCuota = await tx.installment.findFirst({
    where: {
      loan_id: loanId,
      estado: { notIn: ['pagada', 'reprogramada'] }
    },
    orderBy: { numero: 'asc' },
    include: {
      loan: {
        select: { frecuencia: true }
      }
    }
  });

  if (!siguienteCuota || excedente <= 0) return;

  const dist = PaymentDistributionService.calcularDistribucion(
    excedente,
    siguienteCuota,
    ordenDistribucion,
    undefined,
    calcularMoraPendiente(siguienteCuota, tasaMoraDiaria)
  );
  const montoAplicadoEnCuota = Number((dist.capital + dist.interes + dist.mora).toFixed(2));
  const moraPendiente = calcularMoraPendiente(siguienteCuota, tasaMoraDiaria);
  const interesPendiente = Number(
    Math.max(0, siguienteCuota.monto_interes - (siguienteCuota.interes_pagado || 0)).toFixed(2)
  );
  const capitalPendiente = Number(
    Math.max(0, (siguienteCuota.monto_cuota - siguienteCuota.monto_interes) - (siguienteCuota.capital_pagado || 0)).toFixed(2)
  );
  const interesReprogramado = Number(Math.max(0, interesPendiente - dist.interes).toFixed(2));
  const capitalReprogramado = Number(Math.max(0, capitalPendiente - dist.capital).toFixed(2));
  const moraReprogramada = Number(Math.max(0, moraPendiente - dist.mora).toFixed(2));
  const nuevoSaldo = Number((interesReprogramado + capitalReprogramado + moraReprogramada).toFixed(2));

  // Crear pago del excedente
  await tx.payment.create({
    data: {
      installment_id: siguienteCuota.id,
      monto_pagado: montoAplicadoEnCuota,
      monto_a_capital: dist.capital,
      monto_a_interes: dist.interes,
      monto_a_mora: dist.mora,
      saldo_reprogramado: nuevoSaldo,
      distribucion_manual: false,
      es_excedente: true,
      cobrador_id: cobradorId,
      notas: 'Excedente de pago anterior'
    }
  });

  if (nuevoSaldo > 0) {
    await reprogramarCuota(
      tx,
      siguienteCuota,
      dist.capital,
      dist.interes,
      dist.mora,
      nuevoSaldo,
      interesReprogramado,
      moraReprogramada,
      siguienteCuota.loan.frecuencia
    );
  } else {
    await tx.installment.update({
      where: { id: siguienteCuota.id },
      data: {
        capital_pagado: { increment: dist.capital },
        interes_pagado: { increment: dist.interes },
        mora_pagada: { increment: dist.mora },
        saldo_pendiente: 0,
        estado: 'pagada'
      }
    });
  }

  if (dist.excedente > 0 && nuevoSaldo === 0) {
    await aplicarExcedenteASiguienteCuota(tx, loanId, dist.excedente, cobradorId, ordenDistribucion, tasaMoraDiaria);
  }
}

function calcularMoraPendiente(installment: Installment, tasaMoraDiaria: number): number {
  if (!tasaMoraDiaria || tasaMoraDiaria <= 0) return 0;

  const now = startOfDay(new Date());
  const vencimiento = startOfDay(new Date(installment.fecha_vencimiento));
  const diasVencido = Math.max(0, Math.floor((now.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24)));
  if (diasVencido <= 0) return 0;

  const saldoBase = Math.max(
    0,
    (installment.monto_cuota - installment.monto_interes) - (installment.capital_pagado || 0)
      + Math.max(0, installment.monto_interes - (installment.interes_pagado || 0))
  );

  return Number((saldoBase * (tasaMoraDiaria / 100) * diasVencido).toFixed(2));
}

async function reprogramarCuota(
  tx: any,
  installment: Installment,
  capitalAplicado: number,
  interesAplicado: number,
  moraAplicada: number,
  saldoReprogramado: number,
  interesReprogramado: number,
  moraReprogramada: number,
  frecuencia: string
) {
  await tx.installment.update({
    where: { id: installment.id },
    data: {
      capital_pagado: { increment: capitalAplicado },
      interes_pagado: { increment: interesAplicado },
      mora_pagada: { increment: moraAplicada },
      saldo_pendiente: 0,
      estado: 'reprogramada'
    }
  });

  const lastInstallment = await tx.installment.findFirst({
    where: { loan_id: installment.loan_id },
    orderBy: { numero: 'desc' }
  });

  if (!lastInstallment) return;

  const newNumero = lastInstallment.numero + 1;
  const newDueDate = calcularProximoVencimiento(lastInstallment.fecha_vencimiento, frecuencia);

  await tx.installment.create({
    data: {
      loan_id: installment.loan_id,
      numero: newNumero,
      fecha_vencimiento: newDueDate,
      monto_cuota: saldoReprogramado,
      monto_interes: interesReprogramado + moraReprogramada,
      saldo_pendiente: saldoReprogramado,
      estado: 'pendiente',
      tipo: 'arrastre',
      cuota_origen_id: installment.id
    }
  });

  await tx.loan.update({
    where: { id: installment.loan_id },
    data: { num_cuotas: { increment: 1 } }
  });
}
