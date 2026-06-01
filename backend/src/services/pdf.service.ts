import PDFKit from 'pdfkit';
import { prisma } from '../lib/prisma';
import { calcularMontoSugeridoCobro, calcularMoraPendienteCobro } from './payment-policy.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, sym: string) {
  return `${sym}${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function tableRow(
  doc: PDFKit.PDFDocument,
  cols: string[],
  widths: number[],
  x: number,
  y: number,
  opts: { bold?: boolean; fill?: string | undefined; textColor?: string } = {}
) {
  if (opts.fill) {
    doc.save();
    doc.rect(x - 2, y - 2, widths.reduce((a, b) => a + b, 0) + 4, 14).fill(opts.fill);
    doc.restore();
  }
  doc.fontSize(8).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(opts.textColor ?? 'black');
  let cx = x;
  cols.forEach((text, i) => {
    doc.text(text, cx, y, { width: (widths[i] ?? 60) - 2, ellipsis: true });
    cx += widths[i] ?? 60;
  });
}

function pageHeader(doc: PDFKit.PDFDocument, tenantName: string, title: string) {
  doc.rect(0, 0, doc.page.width, 48).fill('#1e3a5f');
  doc.fontSize(16).font('Helvetica-Bold').fillColor('white')
    .text(tenantName, 40, 12, { width: 300 });
  doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
    .text(title, 40, 30, { width: 300 });
  doc.fontSize(9).fillColor('rgba(255,255,255,0.7)')
    .text(`Generado: ${fmtDate(new Date())}`, 370, 30, { width: 180, align: 'right' });
  doc.fillColor('black');
  doc.y = 62;
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.4);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a5f').text(text.toUpperCase());
  const lx = doc.page.margins.left;
  doc.moveTo(lx, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#1e3a5f').lineWidth(0.5).stroke();
  doc.fillColor('black').moveDown(0.3);
}

async function fetchTenant(tenantId: string | null | undefined) {
  if (!tenantId) return { name: 'EliCash', symbol: '$' };
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return { name: t?.name ?? 'EliCash', symbol: t?.symbol ?? '$' };
}

// ─── Contrato de préstamo ─────────────────────────────────────────────────────

export class PDFService {
  static async generateLoanContract(loanId: string): Promise<Buffer> {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: { include: { references: true, guarantors: true } },
        installments: { orderBy: { numero: 'asc' } }
      }
    });
    if (!loan) throw new Error('Préstamo no encontrado');

    const { name: tenantName, symbol: sym } = await fetchTenant(loan.client.tenantId);
    const isSinPlazo = loan.tipo_prestamo === 'sin_plazo';

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFKit({ margin: 40, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      pageHeader(doc, tenantName, 'CONTRATO DE PRÉSTAMO');

      // Partes
      sectionTitle(doc, 'Partes del contrato');
      doc.fontSize(9).font('Helvetica-Bold').text('Prestamista: ', { continued: true })
        .font('Helvetica').text(tenantName);
      doc.font('Helvetica-Bold').text('Prestatario: ', { continued: true })
        .font('Helvetica').text(loan.client.nombre);
      doc.text(`Cedula: ${loan.client.cedula}   -   Tel: ${loan.client.telefono}   -   Dir: ${loan.client.direccion}`);
      if (loan.client.references.length > 0) {
        doc.font('Helvetica-Bold').text('Referencias: ', { continued: true }).font('Helvetica')
          .text(loan.client.references.map(r => `${r.nombre} (${r.relacion}) ${r.telefono}`).join(' - '));
      }
      if (loan.client.guarantors.length > 0) {
        doc.font('Helvetica-Bold').text('Garantes: ', { continued: true }).font('Helvetica')
          .text(loan.client.guarantors.map(g => `${g.nombre} CC ${g.cedula}`).join(' - '));
      }

      // Condiciones
      sectionTitle(doc, 'Condiciones del préstamo');
      const tipoLabel = isSinPlazo
        ? 'Sin plazo fijo (interés sobre saldo)'
        : (loan.tipo_interes === 'simple' ? 'Interés fijo (tasa plana)' : 'Cuota nivelada (método francés)');

      const detalles: [string, string][] = [
        ['Monto prestado', fmt(loan.monto, sym)],
        ['Tasa de interés por período', `${loan.tasa_interes}%`],
        ['Tipo de préstamo', tipoLabel],
        ['Frecuencia de pago', loan.frecuencia],
        ['Fecha de inicio', fmtDate(loan.fecha_inicio)],
      ];
      if (!isSinPlazo) detalles.push(['Número de cuotas', String(loan.num_cuotas ?? '-')]);
      if (isSinPlazo) detalles.push(['Saldo capital inicial', fmt(loan.saldo_capital ?? loan.monto, sym)]);

      detalles.forEach(([k, v], i) => {
        const fill = Math.floor(i / 2) % 2 === 0 ? '#f0f4f8' : undefined;
        tableRow(doc, [`${k}:`, v], [210, 200], doc.page.margins.left, doc.y, { fill });
        doc.y += 14;
      });

      // Tabla de amortización
      if (!isSinPlazo && loan.installments.length > 0) {
        sectionTitle(doc, 'Tabla de amortización');
        const cw = [30, 80, 90, 90, 85];
        const heads = ['#', 'Vencimiento', 'Cuota', 'Interés', 'Saldo cap.'];

        tableRow(doc, heads, cw, doc.page.margins.left, doc.y, { bold: true, fill: '#1e3a5f' });
        doc.fillColor('white');
        tableRow(doc, heads, cw, doc.page.margins.left, doc.y, { bold: true });
        doc.fillColor('black');
        doc.y += 14;

        loan.installments.forEach((inst, idx) => {
          if (doc.y > doc.page.height - 80) { doc.addPage(); doc.y = 40; }
          tableRow(doc, [
            String(inst.numero),
            fmtDate(inst.fecha_vencimiento),
            fmt(inst.monto_cuota, sym),
            fmt(inst.monto_interes, sym),
            fmt(inst.saldo_pendiente, sym)
          ], cw, doc.page.margins.left, doc.y, { fill: idx % 2 === 0 ? '#f8fafc' : undefined });
          doc.y += 14;
        });

        const totalCuota = loan.installments.reduce((s, i) => s + i.monto_cuota, 0);
        const totalInteres = loan.installments.reduce((s, i) => s + i.monto_interes, 0);
        tableRow(doc, ['', 'TOTAL', fmt(totalCuota, sym), fmt(totalInteres, sym), ''],
          cw, doc.page.margins.left, doc.y, { bold: true, fill: '#e2e8f0' });
        doc.y += 16;
      }

      if (isSinPlazo) {
        sectionTitle(doc, 'Funcionamiento del préstamo sin plazo');
        doc.fontSize(9).font('Helvetica').text(
          `Este préstamo no tiene tabla de cuotas fija. Cada período se calcula el interés sobre ` +
          `el saldo de capital vigente (${loan.tasa_interes}% ${loan.frecuencia}). ` +
          `El monto mínimo por período es el interés generado; cualquier pago adicional reduce capital. ` +
          `El préstamo se cancela al llegar el capital a cero.`,
          { width: doc.page.width - 80 }
        );
        doc.moveDown(0.5);
      }

      // Términos
      sectionTitle(doc, 'Términos y condiciones');
      [
        '1. El prestatario se compromete a pagar en las fechas acordadas.',
        '2. En caso de mora se aplicará la tasa moratoria configurada en el sistema.',
        '3. El prestamista podrá exigir el pago anticipado total ante incumplimiento reiterado.',
        '4. Este contrato tiene validez desde la fecha de firma de ambas partes.',
        '5. Para cualquier disputa se acudirá a los organismos competentes de resolución de conflictos.'
      ].forEach(t => { doc.fontSize(8.5).font('Helvetica').text(t); doc.moveDown(0.15); });

      // Firmas
      doc.moveDown(1.5);
      const sigY = doc.y;
      doc.fontSize(9);
      doc.text('______________________________', 60, sigY);
      doc.text('Firma del Prestatario', 60, sigY + 12);
      doc.text(loan.client.nombre, 60, sigY + 22, { width: 200 });
      doc.text('______________________________', 330, sigY);
      doc.text('Firma del Prestamista / Cobrador', 330, sigY + 12);
      doc.text(tenantName, 330, sigY + 22, { width: 200 });

      doc.end();
    });
  }

  // ─── Recibo de pago ──────────────────────────────────────────────────────────

  static async generatePaymentReceipt(paymentId: string): Promise<Buffer> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        installment: { include: { loan: { include: { client: true, loanConfig: true } } } }
      }
    });
    if (!payment) throw new Error('Pago no encontrado');

    const { name: tenantName, symbol: sym } = await fetchTenant(payment.installment.loan.client.tenantId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFKit({ margin: 40, size: [360, 560] });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, 360, 46).fill('#1e3a5f');
      doc.fontSize(14).font('Helvetica-Bold').fillColor('white').text(tenantName, 20, 8);
      doc.fontSize(8).font('Helvetica').fillColor('#dbeafe').text('RECIBO DE PAGO', 20, 28);
      doc.fillColor('black');
      doc.y = 58;

      const line = (label: string, value: string) => {
        const y = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text(label, 20, y, { width: 105 });
        doc.font('Helvetica').fillColor('#111827').text(value, 130, y, { width: 200, ellipsis: true });
        doc.y = Math.max(doc.y, y + 15);
      };

      line('Recibo No.:', String(payment.numero_control || payment.id.slice(0, 8).toUpperCase()));
      line('Fecha de pago:', fmtDate(payment.fecha_pago));
      doc.moveDown(0.4);

      doc.fontSize(8).font('Helvetica-Bold').text('CLIENTE', 20).moveDown(0.2);
      line('Nombre:', payment.installment.loan.client.nombre);
      line('Cedula:', payment.installment.loan.client.cedula);
      doc.moveDown(0.4);

      doc.font('Helvetica-Bold').text('DETALLE DEL PAGO', 20).moveDown(0.2);
      line('Cuota No.:', String(payment.installment.numero));
      line('Tipo de cuota:', payment.installment.tipo === 'arrastre' ? 'Arrastre / reprogramada' : 'Normal');
      line('Vencimiento:', fmtDate(payment.installment.fecha_vencimiento));
      line('Monto pagado:', fmt(payment.monto_pagado, sym));
      doc.moveDown(0.2);
      line('- A capital:', fmt(payment.monto_a_capital, sym));
      line('- A interes:', fmt(payment.monto_a_interes, sym));
      if (payment.monto_a_mora > 0) line('- A mora:', fmt(payment.monto_a_mora, sym));
      doc.moveDown(0.4);

      doc.font('Helvetica-Bold').text('PRESTAMO', 20).moveDown(0.2);
      line('Monto original:', fmt(payment.installment.loan.monto, sym));
      line('Saldo pendiente:', fmt(payment.installment.saldo_pendiente, sym));
      const moraPendiente = calcularMoraPendienteCobro(
        payment.installment,
        payment.installment.loan.loanConfig?.tasa_mora_diaria || 0,
        payment.fecha_pago
      );
      const politicaCobro = calcularMontoSugeridoCobro(
        payment.installment,
        payment.installment.loan.frecuencia,
        moraPendiente
      );
      if (payment.es_excedente) line('Origen:', 'Aplicado como excedente de un pago anterior');
      if (politicaCobro.interes_omitido_por_adelanto) line('Interés adelantado:', 'Omitido en este período');
      doc.moveDown(0.8);

      doc.rect(20, doc.y, 320, 24).fill('#f0f4f8');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f')
        .text('PAGO REGISTRADO Y CONFIRMADO', 30, doc.y + 6, { width: 300, align: 'center' });
      doc.fillColor('black');
      doc.y += 34;
      doc.fontSize(7).font('Helvetica').fillColor('#666')
        .text('Este recibo es valido como comprobante de pago.', 20, doc.y, { align: 'center', width: 320 });

      doc.end();
    });
  }

  // ─── Estado de cuenta del cliente ────────────────────────────────────────────

  static async generateClientStatement(clientId: string, tenantId: string): Promise<Buffer> {
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } });
    if (!client) throw new Error('Cliente no encontrado');

    const loans = await prisma.loan.findMany({
      where: { client_id: clientId },
      include: {
        loanConfig: true,
        installments: {
          orderBy: { numero: 'asc' },
          include: { payments: { orderBy: { fecha_pago: 'asc' } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const { name: tenantName, symbol: sym } = await fetchTenant(tenantId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFKit({ margin: 40, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      pageHeader(doc, tenantName, 'ESTADO DE CUENTA');

      sectionTitle(doc, 'Información del cliente');
      doc.fontSize(9).font('Helvetica-Bold').text('Cliente: ', { continued: true })
        .font('Helvetica').text(loan_client_line(client));
      doc.font('Helvetica-Bold').text('Dirección: ', { continued: true })
        .font('Helvetica').text(client.direccion);
      if (client.score) {
        doc.font('Helvetica-Bold').text('Score crediticio: ', { continued: true })
          .font('Helvetica').text(`${Math.round(client.score)} / 100`);
      }

      // Resumen global
      let totalPrestado = 0, totalPagadoGlobal = 0, totalSaldoGlobal = 0, totalMoraGlobal = 0;
      const hoy = new Date();
      for (const loan of loans) {
        totalPrestado += loan.monto;
        for (const inst of loan.installments) {
          totalPagadoGlobal += inst.capital_pagado + inst.interes_pagado + inst.mora_pagada;
        }
        if (loan.tipo_prestamo === 'sin_plazo' && loan.estado === 'activo') {
          totalSaldoGlobal += loan.saldo_capital ?? 0;
        } else if (loan.estado === 'activo') {
          for (const inst of loan.installments) {
            const moraPendiente = calcularMoraPendienteCobro(inst, loan.loanConfig?.tasa_mora_diaria || 0, hoy);
            const politicaCobro = calcularMontoSugeridoCobro(inst, loan.frecuencia, moraPendiente);
            if (inst.estado !== 'pagada' && inst.estado !== 'reprogramada') {
              totalSaldoGlobal += politicaCobro.total_exigible_cobro;
            }
            if (new Date(inst.fecha_vencimiento) < hoy && inst.estado === 'pendiente') {
              totalMoraGlobal += politicaCobro.total_exigible_cobro;
            }
          }
        }
      }

      sectionTitle(doc, 'Resumen general');
      const colRes = [140, 120, 130, 100];
      tableRow(doc, ['Total prestado', 'Total pagado', 'Exigible actual', 'En mora'],
        colRes, doc.page.margins.left, doc.y, { bold: true, fill: '#e2e8f0' });
      doc.y += 14;
      tableRow(doc,
        [fmt(totalPrestado, sym), fmt(totalPagadoGlobal, sym), fmt(totalSaldoGlobal, sym), fmt(totalMoraGlobal, sym)],
        colRes, doc.page.margins.left, doc.y);
      doc.y += 18;

      // Detalle por préstamo
      for (const loan of loans) {
        if (doc.y > doc.page.height - 140) { doc.addPage(); doc.y = 40; }

        const tipoLabel = loan.tipo_prestamo === 'sin_plazo' ? 'Sin plazo'
          : loan.tipo_interes === 'simple' ? 'Interés fijo' : 'Cuota nivelada';
        const estadoBadge = loan.estado === 'completado' ? 'CANCELADO' : loan.estado === 'activo' ? 'ACTIVO' : 'EN MORA';

        sectionTitle(doc, `Prestamo ${loan.id.slice(0, 8).toUpperCase()} - ${fmt(loan.monto, sym)} - ${tipoLabel} - ${estadoBadge}`);

        doc.fontSize(8).font('Helvetica')
          .text(`Tasa: ${loan.tasa_interes}% ${loan.frecuencia} - Inicio: ${fmtDate(loan.fecha_inicio)}` +
            (loan.num_cuotas ? ` - ${loan.num_cuotas} cuotas` : ''), { width: doc.page.width - 80 });
        if (loan.tipo_prestamo === 'sin_plazo' && loan.estado === 'activo') {
          doc.font('Helvetica-Bold').text('Saldo capital actual: ', { continued: true })
            .font('Helvetica').text(fmt(loan.saldo_capital ?? 0, sym));
        }
        doc.moveDown(0.3);

        // Cabecera tabla
        const cw = [22, 60, 54, 54, 48, 48, 58, 54, 54];
        const heads = ['#', 'Venc.', 'Cuota', 'Cap. p.', 'Int. p.', 'Mora p.', 'Exigible', 'Total p.', 'Estado'];
        tableRow(doc, heads, cw, doc.page.margins.left, doc.y, { bold: true, fill: '#1e3a5f', textColor: 'white' });
        doc.fillColor('black');
        doc.y += 14;

        let lCap = 0, lInt = 0, lMor = 0;

        for (const [idx, inst] of loan.installments.entries()) {
          if (doc.y > doc.page.height - 55) { doc.addPage(); doc.y = 40; }

          lCap += inst.capital_pagado;
          lInt += inst.interes_pagado;
          lMor += inst.mora_pagada;
          const moraPendiente = calcularMoraPendienteCobro(inst, loan.loanConfig?.tasa_mora_diaria || 0, hoy);
          const politicaCobro = calcularMontoSugeridoCobro(inst, loan.frecuencia, moraPendiente);

          const total = inst.capital_pagado + inst.interes_pagado + inst.mora_pagada;
          const estadoStr =
            inst.estado === 'pagada' ? 'Pagada' :
            inst.estado === 'reprogramada' ? 'Reprog.' :
            inst.tipo === 'arrastre' ? 'Arrastre' :
            inst.estado === 'mora' ? 'MORA' : 'Pendiente';

          const rowFill =
            inst.estado === 'pagada' ? '#f0fdf4' :
            (inst.estado === 'mora' || (inst.estado === 'pendiente' && new Date(inst.fecha_vencimiento) < hoy)) ? '#fff7f0' :
            idx % 2 === 0 ? '#f8fafc' : undefined;

          tableRow(doc, [
            String(inst.numero),
            fmtDate(inst.fecha_vencimiento),
            fmt(inst.monto_cuota, sym),
            fmt(inst.capital_pagado, sym),
            fmt(inst.interes_pagado, sym),
            fmt(inst.mora_pagada, sym),
            fmt(politicaCobro.total_exigible_cobro, sym),
            fmt(total, sym),
            estadoStr
          ], cw, doc.page.margins.left, doc.y, { fill: rowFill });
          doc.y += 13;

          if (inst.estado !== 'pagada' && inst.estado !== 'reprogramada' && (moraPendiente > 0 || inst.tipo === 'arrastre' || politicaCobro.interes_omitido_por_adelanto)) {
            if (doc.y > doc.page.height - 30) { doc.addPage(); doc.y = 40; }
            const notas: string[] = [];
            if (moraPendiente > 0) notas.push(`mora pendiente ${fmt(moraPendiente, sym)}`);
            if (inst.tipo === 'arrastre') notas.push('cuota de arrastre por reprogramacion');
            if (politicaCobro.interes_omitido_por_adelanto) notas.push('interes omitido por pago adelantado');
            doc.fontSize(7).font('Helvetica').fillColor('#555')
              .text(`    > ${notas.join(' | ')}`, { width: doc.page.width - 80 });
            doc.fillColor('black').fontSize(8);
            doc.y += 3;
          }

          // Desglose de pagos individuales (expandido cuando hay múltiples o es sin_plazo)
          if (inst.payments.length > 0 && (inst.payments.length > 1 || loan.tipo_prestamo === 'sin_plazo')) {
            for (const pago of inst.payments) {
              if (doc.y > doc.page.height - 30) { doc.addPage(); doc.y = 40; }
              doc.fontSize(7).font('Helvetica').fillColor('#555')
                .text(
                  `    - ${fmtDate(pago.fecha_pago)}: pago ${fmt(pago.monto_pagado, sym)}` +
                  ` - cap ${fmt(pago.monto_a_capital, sym)} / int ${fmt(pago.monto_a_interes, sym)}` +
                  (pago.monto_a_mora > 0 ? ` / mora ${fmt(pago.monto_a_mora, sym)}` : '') +
                  (pago.es_excedente ? ' [excedente aplicado]' : ''),
                  { width: doc.page.width - 80 }
                );
              doc.fillColor('black').fontSize(8);
              doc.y += 3;
            }
          }
        }

        // Subtotales
        tableRow(doc,
          ['', 'SUBTOTAL', '', fmt(lCap, sym), fmt(lInt, sym), fmt(lMor, sym), '', fmt(lCap + lInt + lMor, sym), ''],
          cw, doc.page.margins.left, doc.y, { bold: true, fill: '#e2e8f0' });
        doc.y += 18;
      }

      doc.moveDown(1);
      doc.fontSize(7.5).font('Helvetica').fillColor('#888')
        .text(`Generado el ${fmtDate(new Date())} por ${tenantName} - EliCash`,
          { align: 'center', width: doc.page.width - 80 });

      doc.end();
    });
  }
}

function loan_client_line(client: { nombre: string; cedula: string; telefono: string }) {
  return `${client.nombre}   -   Cedula: ${client.cedula}   -   Tel: ${client.telefono}`;
}
