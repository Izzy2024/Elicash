import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, parseISO, isValid, eachDayOfInterval, format } from 'date-fns';
import { ExcelService } from '../services/excel.service';
import { logger } from '../lib/logger';

function parseDateParam(value?: string) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export const getDia = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { desde, hasta } = req.query as { desde?: string; hasta?: string };
    const today = new Date();
    const start = startOfDay(parseDateParam(desde) ?? today);
    const end = endOfDay(parseDateParam(hasta) ?? today);

    if (start > end) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }

    const pagosPeriodo = await prisma.payment.aggregate({
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

    const pendientePeriodo = await prisma.installment.aggregate({
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
      cobradoHoy: pagosPeriodo._sum.monto_pagado || 0,
      pendienteHoy: pendientePeriodo._sum.saldo_pendiente || 0,
      cobradoPeriodo: pagosPeriodo._sum.monto_pagado || 0,
      pendientePeriodo: pendientePeriodo._sum.saldo_pendiente || 0
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
    const { desde, hasta } = req.query as { desde?: string; hasta?: string };
    const today = new Date();
    const start = startOfDay(parseDateParam(desde) ?? startOfMonth(today));
    const end = endOfDay(parseDateParam(hasta) ?? endOfMonth(today));

    if (start > end) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }

    const gananciasMes = await prisma.payment.aggregate({
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
      _sum: {
        monto_a_interes: true
      }
    });

    res.json({
      gananciaTotal: gananciasMes._sum.monto_a_interes || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getSemana = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { desde, hasta } = req.query as { desde?: string; hasta?: string };
    const parsedHasta = parseDateParam(hasta);
    const parsedDesde = parseDateParam(desde);
    const end = endOfDay(parsedHasta ?? new Date());
    const start = startOfDay(parsedDesde ?? subDays(end, 6));

    if (start > end) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }

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
      select: {
        fecha_pago: true,
        monto_pagado: true
      }
    });

    // Group by day
    const grouped: Map<string, number> = new Map();
    for (const day of eachDayOfInterval({ start, end })) {
      const key = format(day, 'yyyy-MM-dd');
      grouped.set(key, 0);
    }

    for (const p of payments) {
      const key = format(p.fecha_pago, 'yyyy-MM-dd');
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

    const startFilter = startOfDay(parseDateParam(desde) ?? startOfMonth(today));
    const endFilter = endOfDay(parseDateParam(hasta) ?? endOfMonth(today));

    if (startFilter > endFilter) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }

    const [pagosPeriodoResumen, pendientePeriodoResumen, prestamosActivos, pagosPeriodo, morosos, tenant, gananciaPeriodo] = await Promise.all([
      prisma.payment.aggregate({
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
        _sum: { monto_pagado: true }
      }),
      prisma.installment.aggregate({
        where: {
          estado: 'pendiente',
          fecha_vencimiento: { gte: startFilter, lte: endFilter },
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
          fecha_vencimiento: { lt: endOfDay(today) },
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
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { symbol: true }
      }),
      prisma.payment.aggregate({
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
        _sum: {
          monto_a_interes: true
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

    const workbookBuffer = await ExcelService.generateReportWorkbook({
      currencySymbol: tenant?.symbol || '$',
      resumen: {
        cobradoHoy: pagosPeriodoResumen._sum.monto_pagado || 0,
        pendienteHoy: pendientePeriodoResumen._sum.saldo_pendiente || 0,
        totalPrestado,
        totalRecuperado,
        gananciaMes: gananciaPeriodo._sum.monto_a_interes || 0
      },
      morosos: morosos.map((inst) => ({
        cliente: inst.loan.client.nombre,
        cedula: inst.loan.client.cedula,
        telefono: inst.loan.client.telefono,
        prestamoId: inst.loan.id,
        cuotaNumero: inst.numero,
        fechaVencimiento: inst.fecha_vencimiento,
        saldoPendiente: inst.saldo_pendiente,
        diasVencido: Math.floor((startOfDay(today).getTime() - inst.fecha_vencimiento.getTime()) / (1000 * 60 * 60 * 24))
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
