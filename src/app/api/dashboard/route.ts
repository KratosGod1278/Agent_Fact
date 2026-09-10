import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set', dbUrl: 'MISSING' }, { status: 500 })
    }

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

    return NextResponse.json({
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
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ 
      error: 'Error fetching dashboard data', 
      details: error.message,
      code: error.code 
    }, { status: 500 })
  }
}
