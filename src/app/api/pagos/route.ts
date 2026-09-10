import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        company: true,
        invoice: true,
        receipt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching payments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      invoiceId,
      companyId,
      amount,
      method,
      bank,
      reference,
      proofImageUrl,
      paidAt,
      registeredBy,
      notes,
    } = body

    if (!invoiceId || !companyId || !amount) {
      return NextResponse.json(
        { error: 'invoiceId, companyId, and amount are required' },
        { status: 400 }
      )
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Calculate current total paid
    const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const newTotal = currentPaid + amount

    // Warn if payment exceeds total (but allow with warning)
    if (newTotal > invoice.total * 1.01) { // 1% tolerance for rounding
      return NextResponse.json(
        {
          error: 'Payment exceeds invoice total',
          details: {
            invoiceTotal: invoice.total,
            currentPaid,
            newPayment: amount,
            newTotal,
          },
        },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        companyId,
        amount,
        method: method || 'EFECTIVO',
        bank: bank || null,
        reference: reference || null,
        proofImageUrl: proofImageUrl || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        registeredBy: registeredBy || 'Usuario',
        notes: notes || null,
      },
      include: {
        company: true,
        invoice: true,
      },
    })

    // Update invoice status
    let newStatus = 'PENDIENTE'
    if (newTotal >= invoice.total) {
      newStatus = 'PAGADA'
    } else if (newTotal > 0) {
      newStatus = 'PARCIAL'
    }
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && newStatus !== 'PAGADA') {
      newStatus = 'VENCIDA'
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    })

    // Cancel pending reminders if fully paid
    if (newStatus === 'PAGADA') {
      await prisma.reminder.updateMany({
        where: {
          invoiceId,
          status: 'PENDIENTE',
        },
        data: { status: 'CANCELADO' },
      })
    }

    // Generate receipt
    const receiptContent = `
══════════════════════════════
        COMPROBANTE DE PAGO
══════════════════════════════

EMPRESA:
${payment.company.name}

${payment.company.rnc ? `RNC: ${payment.company.rnc}` : ''}

FACTURA:
#${payment.invoice.number}

TOTAL FACTURA:
${new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(payment.invoice.total)}

PAGO REALIZADO:
${new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(payment.amount)}

PENDIENTE:
${new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(invoice.total - newTotal)}

MÉTODO:
${payment.method}

${payment.bank ? `BANCO: ${payment.bank}` : ''}
${payment.reference ? `REFERENCIA: ${payment.reference}` : ''}

FECHA:
${new Date(payment.paidAt).toLocaleDateString('es-DO')}

HORA:
${new Date(payment.paidAt).toLocaleTimeString('es-DO')}

ESTADO:
${newStatus === 'PAGADA' ? '🟢 PAGO COMPLETO' : '🟠 PAGO PARCIAL'}

REGISTRADO POR:
${payment.registeredBy}

══════════════════════════════
    `.trim()

    const receipt = await prisma.receipt.create({
      data: {
        paymentId: payment.id,
        content: receiptContent,
      },
    })

    return NextResponse.json({
      ...payment,
      receipt,
      invoiceStatus: newStatus,
      totalPaid: newTotal,
      remaining: invoice.total - newTotal,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Error creating payment' }, { status: 500 })
  }
}
