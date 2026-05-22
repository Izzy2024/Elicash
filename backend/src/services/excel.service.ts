import ExcelJS from 'exceljs';

type ResumenData = {
  cobradoHoy: number;
  pendienteHoy: number;
  totalPrestado: number;
  totalRecuperado: number;
  gananciaMes: number;
};

type MorosoData = {
  cliente: string;
  cedula: string;
  telefono: string;
  prestamoId: string;
  cuotaNumero: number;
  fechaVencimiento: Date;
  saldoPendiente: number;
  diasVencido: number;
};

type PagoMesData = {
  fechaPago: Date;
  cliente: string;
  prestamoId: string;
  cuotaNumero: number;
  montoPagado: number;
  cobradorId: string;
};

type ExcelReporteInput = {
  currencySymbol: string;
  resumen: ResumenData;
  morosos: MorosoData[];
  pagosMes: PagoMesData[];
};

export class ExcelService {
  static async generateReportWorkbook(data: ExcelReporteInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EliCash';
    workbook.created = new Date();
    const currencyFormat = `${data.currencySymbol}#,##0.00`;

    const resumenSheet = workbook.addWorksheet('Resumen');
    resumenSheet.columns = [
      { header: 'Métrica', key: 'metrica', width: 34 },
      { header: 'Valor', key: 'valor', width: 22 }
    ];

    resumenSheet.addRows([
      { metrica: 'Cobrado del Periodo', valor: data.resumen.cobradoHoy },
      { metrica: 'Pendiente del Periodo', valor: data.resumen.pendienteHoy },
      { metrica: 'Total Prestado (Activo)', valor: data.resumen.totalPrestado },
      { metrica: 'Total Recuperado (Activo)', valor: data.resumen.totalRecuperado },
      { metrica: 'Ganancia del Periodo', valor: data.resumen.gananciaMes }
    ]);

    resumenSheet.getColumn('valor').numFmt = currencyFormat;
    resumenSheet.getRow(1).font = { bold: true };

    const morososSheet = workbook.addWorksheet('Morosos');
    morososSheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Cédula', key: 'cedula', width: 16 },
      { header: 'Teléfono', key: 'telefono', width: 16 },
      { header: 'Préstamo', key: 'prestamoId', width: 14 },
      { header: 'Cuota', key: 'cuotaNumero', width: 10 },
      { header: 'Vence', key: 'fechaVencimiento', width: 14 },
      { header: 'Saldo Pendiente', key: 'saldoPendiente', width: 18 },
      { header: 'Días Vencido', key: 'diasVencido', width: 14 }
    ];

    for (const moroso of data.morosos) {
      morososSheet.addRow({
        ...moroso,
        prestamoId: moroso.prestamoId.slice(0, 8)
      });
    }

    morososSheet.getRow(1).font = { bold: true };
    morososSheet.getColumn('fechaVencimiento').numFmt = 'dd/mm/yyyy';
    morososSheet.getColumn('saldoPendiente').numFmt = currencyFormat;

    const pagosMesSheet = workbook.addWorksheet('Pagos Mes');
    pagosMesSheet.columns = [
      { header: 'Fecha', key: 'fechaPago', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Préstamo', key: 'prestamoId', width: 14 },
      { header: 'Cuota', key: 'cuotaNumero', width: 10 },
      { header: 'Monto Pagado', key: 'montoPagado', width: 18 },
      { header: 'Cobrador', key: 'cobradorId', width: 18 }
    ];

    for (const pago of data.pagosMes) {
      pagosMesSheet.addRow({
        ...pago,
        prestamoId: pago.prestamoId.slice(0, 8),
        cobradorId: pago.cobradorId.slice(0, 8)
      });
    }

    pagosMesSheet.getRow(1).font = { bold: true };
    pagosMesSheet.getColumn('fechaPago').numFmt = 'dd/mm/yyyy';
    pagosMesSheet.getColumn('montoPagado').numFmt = currencyFormat;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}
