import { prisma } from '../src/lib/prisma';

/**
 * Script de backfill para migrar pagos existentes al nuevo modelo de distribución.
 * Asume waterfall: primero interés, luego capital.
 */
async function backfillPayments() {
  console.log('Iniciando backfill de pagos...');

  // Obtener todos los pagos existentes sin distribución
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { monto_a_capital: 0 },
        { monto_a_interes: 0 }
      ]
    },
    include: {
      installment: true
    }
  });

  console.log(`Se encontraron ${payments.length} pagos para actualizar.`);

  for (const payment of payments) {
    const installment = payment.installment;
    const monto = payment.monto_pagado;

    // Calcular distribución waterfall
    const interesRestante = installment.monto_interes - installment.interes_pagado;
    const aInteres = Math.min(monto, Math.max(0, interesRestante));
    const restante = monto - aInteres;
    const capitalTotal = installment.monto_cuota - installment.monto_interes;
    const capitalRestante = capitalTotal - installment.capital_pagado;
    const aCapital = Math.min(restante, Math.max(0, capitalRestante));

    // Actualizar pago
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        monto_a_capital: aCapital,
        monto_a_interes: aInteres,
        monto_a_mora: 0,
        distribucion_manual: false
      }
    });

    // Actualizar saldos desagregados de la cuota
    await prisma.installment.update({
      where: { id: installment.id },
      data: {
        capital_pagado: { increment: aCapital },
        interes_pagado: { increment: aInteres },
        mora_pagada: { increment: 0 }
      }
    });

    console.log(`✓ Pago ${payment.id.substring(0, 8)}: Capital=${aCapital}, Interés=${aInteres}`);
  }

  console.log('Backfill completado.');
}

backfillPayments()
  .catch((e) => {
    console.error('Error en backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
