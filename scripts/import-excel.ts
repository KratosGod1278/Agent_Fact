const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando importación de facturas del Excel...\n');

  // Empresas a crear (las que no existen)
  const empresas = [
    { name: 'Henry Rodriguez', rnc: null, email: null, phone: null, address: null },
    { name: 'San Miguel', rnc: null, email: null, phone: null, address: null },
    { name: 'IVAD S.R.L.', rnc: null, email: null, phone: null, address: null },
    { name: "Inversiones Ril's SRL", rnc: null, email: null, phone: null, address: null },
    { name: 'Trackstore', rnc: null, email: null, phone: null, address: null },
    { name: 'Emaspon', rnc: null, email: null, phone: null, address: null },
  ];

  // Crear empresas que no existen
  const companyMap: Record<string, string> = {};
  
  // Agregar las que ya existen
  const existingAgrofen = await prisma.company.findFirst({ where: { name: 'Agrofen' } });
  if (existingAgrofen) companyMap['Agrofem'] = existingAgrofen.id;
  
  const existingCastillo = await prisma.company.findFirst({ where: { name: 'Castillo' } });
  if (existingCastillo) companyMap['Castillo'] = existingCastillo.id;

  for (const emp of empresas) {
    const existing = await prisma.company.findFirst({ where: { name: emp.name } });
    if (existing) {
      console.log(`✅ Empresa ya existe: ${emp.name}`);
      companyMap[emp.name] = existing.id;
    } else {
      const created = await prisma.company.create({ data: emp });
      console.log(`➕ Empresa creada: ${created.name}`);
      companyMap[emp.name] = created.id;
    }
  }

  console.log('\n📋 Mapa de empresas:', companyMap);

  // Facturas del Excel (Detalle de Cuentas por Pagar)
  const facturas = [
    // Agrofem (6 facturas)
    { proveedor: 'Agrofem', fecha: '2026-09-01', vence: '2026-10-06', monto: 3608.40, notas: 'Factura 1 (Anexo 7,840.00)' },
    { proveedor: 'Agrofem', fecha: '2026-09-01', vence: '2026-10-06', monto: 7840.00, notas: 'Factura 2' },
    { proveedor: 'Agrofem', fecha: '2026-09-02', vence: '2026-10-07', monto: 23498.20, notas: 'Factura 1 (Anexo 30,064.00)' },
    { proveedor: 'Agrofem', fecha: '2026-09-02', vence: '2026-10-07', monto: 30064.00, notas: 'Factura 2' },
    { proveedor: 'Agrofem', fecha: '2026-09-08', vence: '2026-10-13', monto: 16960.00, notas: 'Factura 1 (Anexo 28,024.00)' },
    { proveedor: 'Agrofem', fecha: '2026-09-08', vence: '2026-10-13', monto: 28024.00, notas: 'Factura 2' },
    
    // Castillo (7 facturas)
    { proveedor: 'Castillo', fecha: '2026-09-02', vence: null, monto: 15057.00, notas: 'Mes Septiembre' },
    { proveedor: 'Castillo', fecha: '2026-09-08', vence: null, monto: 17441.00, notas: 'Mes Septiembre' },
    { proveedor: 'Castillo', fecha: '2026-08-19', vence: null, monto: 23064.00, notas: 'Mes Agosto' },
    { proveedor: 'Castillo', fecha: '2026-08-16', vence: null, monto: 23452.00, notas: 'Mes Agosto' },
    { proveedor: 'Castillo', fecha: '2026-08-05', vence: null, monto: 31617.50, notas: 'Mes Agosto' },
    { proveedor: 'Castillo', fecha: '2026-07-29', vence: null, monto: 18099.00, notas: 'Mes Julio' },
    { proveedor: 'Castillo', fecha: '2026-07-21', vence: null, monto: 19436.00, notas: 'Mes Julio' },
    
    // Henry Rodriguez (1 factura)
    { proveedor: 'Henry Rodriguez', fecha: '2026-09-08', vence: '2026-09-23', monto: 27050.00, notas: 'Mes Septiembre' },
    
    // San Miguel (1 factura)
    { proveedor: 'San Miguel', fecha: '2026-09-02', vence: null, monto: 9337.26, notas: 'Mes Septiembre' },
    
    // IVAD S.R.L. (1 factura)
    { proveedor: 'IVAD S.R.L.', fecha: '2026-09-01', vence: null, monto: 5380.00, notas: 'Mes Septiembre' },
    
    // Inversiones Ril's SRL (1 factura)
    { proveedor: "Inversiones Ril's SRL", fecha: '2026-09-02', vence: null, monto: 58385.55, notas: 'Mes Septiembre' },
    
    // Trackstore (1 factura)
    { proveedor: 'Trackstore', fecha: '2026-09-02', vence: null, monto: 46197.90, notas: 'Mes Septiembre' },
    
    // Emaspon (1 factura - pendiente de confirmar)
    { proveedor: 'Emaspon', fecha: '2026-09-08', vence: null, monto: 0, notas: 'Monto pendiente de confirmación' },
  ];

  let count = 0;
  for (const f of facturas) {
    const companyId = companyMap[f.proveedor];
    if (!companyId) {
      console.log(`⚠️ No se encontró empresa: ${f.proveedor}`);
      continue;
    }

    // Calcular ITBIS y subtotal
    const itbis = f.monto * 0.18 / 1.18;
    const subtotal = f.monto - itbis;

    // Determinar número de factura basado en el contador existente
    const existingCount = await prisma.invoice.count({ where: { companyId } });
    const invoiceNumber = String(existingCount + 1).padStart(3, '0');

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        number: invoiceNumber,
        ncf: null,
        type: 'CREDITO_FISCAL',
        issueDate: new Date(f.fecha),
        dueDate: f.vence ? new Date(f.vence) : null,
        subtotal,
        itbis,
        discount: 0,
        total: f.monto,
        status: 'PENDIENTE',
        notes: f.notas,
      },
    });

    console.log(`➕ Factura #${invoiceNumber} - ${f.proveedor} - RD$${f.monto.toLocaleString()} - ${f.vence ? 'vence ' + f.vence : 'sin fecha'}`);
    count++;
  }

  console.log(`\n✅ ${count} facturas importadas exitosamente`);

  // Crear recordatorios para facturas con fecha de vencimiento
  const invoicesWithDueDate = await prisma.invoice.findMany({
    where: { dueDate: { not: null }, status: 'PENDIENTE' },
    include: { company: true },
  });

  console.log(`\n🔔 Creando recordatorios para ${invoicesWithDueDate.length} facturas con vencimiento...`);

  for (const inv of invoicesWithDueDate) {
    const dueDate = new Date(inv.dueDate);
    
    // Recordatorio 3 días antes del vencimiento
    const remindDate = new Date(dueDate);
    remindDate.setDate(remindDate.getDate() - 3);
    
    // Solo crear si la fecha de recordatorio es en el futuro
    if (remindDate > new Date()) {
      await prisma.reminder.create({
        data: {
          invoiceId: inv.id,
          companyId: inv.companyId,
          remindAt: remindDate,
          channel: 'EMAIL',
          message: `Recordatorio: La factura #${inv.number} de ${inv.company.name} por RD$${inv.total.toLocaleString()} vence el ${dueDate.toLocaleDateString('es-DO')}`,
          status: 'PENDIENTE',
        },
      });
      console.log(`  📧 Recordatorio: ${inv.company.name} #${inv.number} → ${remindDate.toLocaleDateString('es-DO')}`);
    }
    
    // Recordatorio el día del vencimiento
    if (dueDate > new Date()) {
      await prisma.reminder.create({
        data: {
          invoiceId: inv.id,
          companyId: inv.companyId,
          remindAt: dueDate,
          channel: 'EMAIL',
          message: `⚠️ VENCIMIENTO HOY: Factura #${inv.number} de ${inv.company.name} por RD$${inv.total.toLocaleString()}`,
          status: 'PENDIENTE',
        },
      });
      console.log(`  ⚠️ Vence hoy: ${inv.company.name} #${inv.number} → ${dueDate.toLocaleDateString('es-DO')}`);
    }
  }

  console.log('\n🎉 Importación completada!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
