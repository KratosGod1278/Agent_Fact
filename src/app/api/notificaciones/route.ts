import { NextRequest, NextResponse } from 'next/server'
import { sendPaymentReceipt, sendReminder, sendDailySummary } from '@/lib/notifications/email'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...params } = body

    switch (type) {
      case 'receipt': {
        const { to, paymentId } = params
        if (!to || !paymentId) {
          return NextResponse.json({ error: 'to and paymentId are required' }, { status: 400 })
        }

        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { company: true, invoice: true },
        })

        if (!payment) {
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        const totalPagado = await prisma.payment.aggregate({
          where: { invoiceId: payment.invoiceId },
          _sum: { amount: true },
        })

        const pendingAmount = payment.invoice.total - (totalPagado._sum.amount || 0)
        const status = pendingAmount <= 0 ? 'PAGADA' : 'PARCIAL'

        const result = await sendPaymentReceipt({
          to,
          companyName: payment.company.name,
          companyRnc: payment.company.rnc || undefined,
          invoiceNumber: payment.invoice.number,
          invoiceTotal: payment.invoice.total,
          paymentAmount: payment.amount,
          pendingAmount,
          paymentMethod: payment.method,
          paymentDate: new Date(payment.paidAt).toLocaleDateString('es-DO'),
          paymentTime: new Date(payment.paidAt).toLocaleTimeString('es-DO'),
          bank: payment.bank || undefined,
          reference: payment.reference || undefined,
          registeredBy: payment.registeredBy,
          status,
        })

        return NextResponse.json(result)
      }

      case 'reminder': {
        const { to, invoiceId } = params
        if (!to || !invoiceId) {
          return NextResponse.json({ error: 'to and invoiceId are required' }, { status: 400 })
        }

        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { company: true, payments: true },
        })

        if (!invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const totalPagado = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
        const pendingAmount = invoice.total - totalPagado
        const now = new Date()
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : now
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        const result = await sendReminder({
          to,
          companyName: invoice.company.name,
          invoiceNumber: invoice.number,
          pendingAmount,
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : 'Sin fecha',
          daysUntilDue,
          status: invoice.status,
        })

        return NextResponse.json(result)
      }

      case 'daily-summary': {
        const { to } = params
        if (!to) {
          return NextResponse.json({ error: 'to is required' }, { status: 400 })
        }

        const invoices = await prisma.invoice.findMany({
          include: { payments: true, company: true },
        })

        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)
        const totalPaid = invoices.reduce((sum, inv) => {
          return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
        }, 0)
        const pendingAmount = totalInvoiced - totalPaid

        const overdueInvoices = invoices.filter(inv => inv.status === 'VENCIDA')
        const upcomingDue = invoices
          .filter(inv => inv.dueDate && inv.status !== 'PAGADA')
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
          .slice(0, 5)
          .map(inv => ({
            companyName: inv.company.name,
            invoiceNumber: inv.number,
            amount: inv.total - inv.payments.reduce((sum, p) => sum + p.amount, 0),
            dueDate: new Date(inv.dueDate!).toLocaleDateString('es-DO'),
          }))

        const result = await sendDailySummary({
          to,
          date: new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          totalInvoiced,
          totalPaid,
          pendingAmount,
          overdueCount: overdueInvoices.length,
          upcomingDue,
        })

        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
