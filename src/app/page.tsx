import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

async function getDashboardData() {
  const totalCompanies = await prisma.company.count()
  
  const invoices = await prisma.invoice.findMany({
    include: {
      payments: true,
      company: true,
    },
  })

  const totalFacturado = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPagado = invoices.reduce((sum, inv) => {
    const pagado = inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
    return sum + pagado
  }, 0)
  const totalPendiente = totalFacturado - totalPagado

  const pendientes = invoices.filter(i => i.status === 'PENDIENTE').length
  const parciales = invoices.filter(i => i.status === 'PARCIAL').length
  const pagadas = invoices.filter(i => i.status === 'PAGADA').length
  const vencidas = invoices.filter(i => i.status === 'VENCIDA').length

  const empresasConDeuda = await prisma.company.findMany({
    include: {
      invoices: {
        include: { payments: true },
      },
    },
  })

  const empresasAlDia = empresasConDeuda.filter(emp => {
    const totalFact = emp.invoices.reduce((s, i) => s + i.total, 0)
    const totalPag = emp.invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0)
    return totalPag >= totalFact && totalFact > 0
  }).length

  const empresasConDeudaCount = totalCompanies - empresasAlDia

  const upcomingDue = invoices
    .filter(i => i.dueDate && i.status !== 'PAGADA')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5)

  const recentPayments = await prisma.payment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { company: true, invoice: true },
  })

  return {
    totalCompanies,
    totalFacturado,
    totalPagado,
    totalPendiente,
    pendientes,
    parciales,
    pagadas,
    vencidas,
    empresasAlDia,
    empresasConDeuda: empresasConDeudaCount,
    upcomingDue,
    recentPayments,
    totalInvoices: invoices.length,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-2xl">
              💰
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Facturado</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalFacturado)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-2xl">
              ✅
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalPagado)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-2xl">
              ⏳
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pendiente</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.totalPendiente)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-2xl">
              🏢
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalCompanies}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{data.pendientes}</p>
            <p className="text-sm font-medium text-red-700">🔴 Pendientes</p>
          </div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{data.parciales}</p>
            <p className="text-sm font-medium text-orange-700">🟠 Parciales</p>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{data.pagadas}</p>
            <p className="text-sm font-medium text-green-700">🟢 Pagadas</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">{data.vencidas}</p>
            <p className="text-sm font-medium text-gray-700">⚫ Vencidas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Due */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">📅 Próximos Vencimientos</h3>
          {data.upcomingDue.length === 0 ? (
            <p className="text-sm text-gray-500">No hay facturas pendientes de vencimiento.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingDue.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.company.name}</p>
                    <p className="text-sm text-gray-500">Factura #{invoice.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</p>
                    <p className="text-xs text-gray-500">
                      Vence: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : 'Sin fecha'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">💰 Pagos Recientes</h3>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No hay pagos registrados aún.</p>
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{payment.company.name}</p>
                    <p className="text-sm text-gray-500">
                      {payment.method} — Factura #{payment.invoice.number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.paidAt).toLocaleDateString('es-DO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Company Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">🏢 Estado de Empresas</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{data.empresasAlDia}</p>
            <p className="text-sm font-medium text-green-700">🟢 Al día</p>
          </div>
          <div className="flex-1 rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{data.empresasConDeuda}</p>
            <p className="text-sm font-medium text-orange-700">🟠 Con deuda</p>
          </div>
        </div>
      </div>
    </div>
  )
}
