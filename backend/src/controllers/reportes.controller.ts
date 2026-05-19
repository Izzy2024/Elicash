import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ExcelService } from '../services/excel.service';
import { logger } from '../lib/logger';

export const getDia = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // Cobrado hoy
    const pagosHoy = await prisma.payment.aggregate({
      where: {
        fecha_pago: { gte: start, lte: end },
        es_excedente: false,
        installment: {
          loan: {
            client: {
              tenantId
            }
          }
        }
      },
      _sum: { monto_pagado: true }
    });

    // Pendiente hoy
    const pendienteHoy = await prisma.installment.aggregate({
      where: {
        estado: 'pendiente',
        fecha_vencimiento: { gte: start, lte: end },
        loan: {
          client: {
            tenantId
          }
        }
      },
      _sum: { saldo_pendiente: true }
    });

    res.json({
      cobradoHoy: pagosHoy._sum.monto_pagado || 0,
      pendienteHoy: pendienteHoy._sum.saldo_pendiente || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getCartera = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const prestamos = await prisma.loan.findMany({
      where: { 
        estado: 'activo',
        client: {
          tenantId
        }
      },
      include: {
        installments: true
      }
    });

    let totalPrestado = 0;
    let totalRecuperado = 0;

    for (const loan of prestamos) {
      totalPrestado += loan.monto;
      for (const inst of loan.installments) {
        totalRecuperado += (inst.capital_pagado || 0) + (inst.interes_pagado || 0) + (inst.mora_pagada || 0);
      }
    }

    res.json({ totalPrestado, totalRecuperado });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getGanancias = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const start = startOfDay(new Date()); // Should probably be month start or based on params
    const end = endOfDay(new Date());

    const payments = await prisma.payment.findMany({
      where: {
        fecha_pago: { gte: start, lte: end },
        es_excedente: false,
        installment: {
          loan: {
            client: {
              tenantId
            }
          }
        }
      },
      include: {
        installment: true
      }
    });

    let gananciaTotal = 0;
    for (const p of payments) {
      gananciaTotal += p.installment.monto_interes * (p.monto_pagado / p.installment.monto_cuota);
    }

    res.json({ gananciaTotal });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getSemana = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const today = endOfDay(new Date());
    const sevenDaysAgo = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

    const payments = await prisma.payment.findMany({
      where: {
        fecha_pago: { gte: sevenDaysAgo, lte: today },
        es_excedente: false,
        installment: {
          loan: {
            client: {
              tenantId
            }
          }
        }
      },
      select: {
        fecha_pago: true,
        monto_pagado: true
      }
    });

    // Group by day
    const grouped: Map<string, number> = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0] as string;
      grouped.set(key, 0);
    }

    for (const p of payments) {
      const key = p.fecha_pago.toISOString().split('T')[0] as string;
      const current = grouped.get(key);
      if (current !== undefined) {
        grouped.set(key, current + p.monto_pagado);
      }
    }

    const result = Array.from(grouped.entries()).map(([fecha, monto]) => ({ fecha, monto }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const exportExcelReport = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { desde, hasta } = req.query as { desde?: string, hasta?: string };

    const today = new Date();
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);

    const startFilter = desde ? startOfDay(new Date(desde)) : startOfMonth(today);
    const endFilter = hasta ? endOfDay(new Date(hasta)) : endOfMonth(today);

    const [pagosHoy, pendienteHoy, prestamosActivos, pagosPeriodo, morosos] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          fecha_pago: { gte: startToday, lte: endToday },
          es_excedente: false,
          installment: {
            loan: {
              client: {
                tenantId
              }
            }
          }
        },
        _sum: { monto_pagado: true }
      }),
      prisma.installment.aggregate({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: { gte: startToday, lte: endToday },
          loan: {
            client: {
              tenantId
            }
          }
        },
        _sum: { saldo_pendiente: true }
      }),
      prisma.loan.findMany({
        where: { 
          estado: 'activo',
          client: {
            tenantId
          }
        },
        include: { installments: true }
      }),
      prisma.payment.findMany({
        where: {
          fecha_pago: { gte: startFilter, lte: endFilter },
          es_excedente: false,
          installment: {
            loan: {
              client: {
                tenantId
              }
            }
          }
        },
        include: {
          installment: {
            include: {
              loan: {
                include: {
                  client: true
                }
              }
            }
          }
        },
        orderBy: { fecha_pago: 'desc' }
      }),
      prisma.installment.findMany({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: { lt: startToday },
          loan: {
            estado: 'activo',
            client: {
              tenantId
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
      })
    ]);

    let totalPrestado = 0;
    let totalRecuperado = 0;

    for (const loan of prestamosActivos) {
      totalPrestado += loan.monto;
      for (const inst of loan.installments) {
        totalRecuperado += (inst.capital_pagado || 0) + (inst.interes_pagado || 0) + (inst.mora_pagada || 0);
      }
    }

    let gananciaPeriodo = 0;
    for (const p of pagosPeriodo) {
      gananciaPeriodo += p.installment.monto_interes * (p.monto_pagado / p.installment.monto_cuota);
    }

    const workbookBuffer = await ExcelService.generateReportWorkbook({
      resumen: {
        cobradoHoy: pagosHoy._sum.monto_pagado || 0,
        pendienteHoy: pendienteHoy._sum.saldo_pendiente || 0,
        totalPrestado,
        totalRecuperado,
        gananciaMes: gananciaPeriodo
      },
      morosos: morosos.map((inst) => ({
        cliente: inst.loan.client.nombre,
        cedula: inst.loan.client.cedula,
        telefono: inst.loan.client.telefono,
        prestamoId: inst.loan.id,
        cuotaNumero: inst.numero,
        fechaVencimiento: inst.fecha_vencimiento,
        saldoPendiente: inst.saldo_pendiente,
        diasVencido: Math.floor((startToday.getTime() - inst.fecha_vencimiento.getTime()) / (1000 * 60 * 60 * 24))
      })),
      pagosMes: pagosPeriodo.map((pago) => ({
        fechaPago: pago.fecha_pago,
        cliente: pago.installment.loan.client.nombre,
        prestamoId: pago.installment.loan.id,
        cuotaNumero: pago.installment.numero,
        montoPagado: pago.monto_pagado,
        cobradorId: pago.cobrador_id
      }))
    });

    const fileDate = today.toISOString().slice(0, 10);
    const fileName = `reporte-elicash-${fileDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(workbookBuffer);
  } catch (error) {
    logger.error({ err: error }, 'exportExcel error');
    res.status(500).json({ message: 'Error al exportar reporte Excel' });
  }
};
