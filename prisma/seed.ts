import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companyCount = await prisma.company.count()
  if (companyCount > 0) {
    console.log('✅ Base de datos ya poblada, saltando seed.')
    return
  }

  console.log('🌱 Poblando base de datos inicial...')

  // Crear empresas
  const empresas = [
    { name: 'Agrofen', rnc: null, email: null, phone: null, address: null },
    { name: 'Castillo', rnc: null, email: null, phone: null, address: null },
    { name: 'Henry Rodriguez', rnc: null, email: null, phone: null, address: null },
    { name: 'San Miguel', rnc: null, email: null, phone: null, address: null },
    { name: 'IVAD S.R.L.', rnc: null, email: null, phone: null, address: null },
    { name: "Inversiones Ril's SRL", rnc: null, email: null, phone: null, address: null },
    { name: 'Trackstore', rnc: null, email: null, phone: null, address: null },
    { name: 'Emaspon', rnc: null, email: null, phone: null, address: null },
  ]

  const companyMap: Record<string, string> = {}
  for (const emp of empresas) {
    const created = await prisma.company.create({ data: emp })
    companyMap[emp.name] = created.id
    console.log(`  ➕ ${created.name}`)
  }

  // Facturas del Excel
  const facturas = [
    { proveedor: 'Agrofen', fecha: '2026-09-01', vence: '2026-10-06', monto: 3608.40, notas: 'Factura 1 (Anexo 7,840.00)', num: '001' },
    { proveedor: 'Agrofen', fecha: '2026-09-01', vence: '2026-10-06', monto: 7840.00, notas: 'Factura 2', num: '002' },
    { proveedor: 'Agrofen', fecha: '2026-09-02', vence: '2026-10-07', monto: 23498.20, notas: 'Factura 1 (Anexo 30,064.00)', num: '003' },
    { proveedor: 'Agrofen', fecha: '2026-09-02', vence: '2026-10-07', monto: 30064.00, notas: 'Factura 2', num: '004' },
    { proveedor: 'Agrofen', fecha: '2026-09-08', vence: '2026-10-13', monto: 16960.00, notas: 'Factura 1 (Anexo 28,024.00)', num: '005' },
    { proveedor: 'Agrofen', fecha: '2026-09-08', vence: '2026-10-13', monto: 28024.00, notas: 'Factura 2', num: '006' },
    { proveedor: 'Castillo', fecha: '2026-09-02', vence: null, monto: 15057.00, notas: 'Mes Septiembre', num: '001' },
    { proveedor: 'Castillo', fecha: '2026-09-08', vence: null, monto: 17441.00, notas: 'Mes Septiembre', num: '002' },
    { proveedor: 'Castillo', fecha: '2026-08-19', vence: null, monto: 23064.00, notas: 'Mes Agosto', num: '003' },
    { proveedor: 'Castillo', fecha: '2026-08-16', vence: null, monto: 23452.00, notas: 'Mes Agosto', num: '004' },
    { proveedor: 'Castillo', fecha: '2026-08-05', vence: null, monto: 31617.50, notas: 'Mes Agosto', num: '005' },
    { proveedor: 'Castillo', fecha: '2026-07-29', vence: null, monto: 18099.00, notas: 'Mes Julio', num: '006' },
    { proveedor: 'Castillo', fecha: '2026-07-21', vence: null, monto: 19436.00, notas: 'Mes Julio', num: '007' },
    { proveedor: 'Henry Rodriguez', fecha: '2026-09-08', vence: '2026-09-23', monto: 27050.00, notas: 'Mes Septiembre', num: '001' },
    { proveedor: 'San Miguel', fecha: '2026-09-02', vence: null, monto: 9337.26, notas: 'Mes Septiembre', num: '001' },
    { proveedor: 'IVAD S.R.L.', fecha: '2026-09-01', vence: null, monto: 5380.00, notas: 'Mes Septiembre', num: '001' },
    { proveedor: "Inversiones Ril's SRL", fecha: '2026-09-02', vence: null, monto: 58385.55, notas: 'Mes Septiembre', num: '001' },
    { proveedor: 'Trackstore', fecha: '2026-09-02', vence: null, monto: 46197.90, notas: 'Mes Septiembre', num: '001' },
    { proveedor: 'Emaspon', fecha: '2026-09-08', vence: null, monto: 0, notas: 'Monto pendiente de confirmación', num: '001' },
  ]

  for (const f of facturas) {
    const companyId = companyMap[f.proveedor]
    const itbis = f.monto * 0.18 / 1.18
    const subtotal = f.monto - itbis

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        number: f.num,
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
    })

    if (f.vence) {
      const dueDate = new Date(f.vence)
      const remindDate = new Date(dueDate)
      remindDate.setDate(remindDate.getDate() - 3)

      if (remindDate > new Date()) {
        await prisma.reminder.create({
          data: {
            invoiceId: invoice.id,
            companyId,
            remindAt: remindDate,
            channel: 'EMAIL',
            message: `Recordatorio: Factura #${f.num} de ${f.proveedor} por RD$${f.monto.toLocaleString()} vence el ${dueDate.toLocaleDateString('es-DO')}`,
            status: 'PENDIENTE',
          },
        })
      }
    }
  }

  console.log(`✅ ${facturas.length} facturas importadas`)
  console.log('🎉 Seed completado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
