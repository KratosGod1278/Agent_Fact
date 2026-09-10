import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        company: true,
        payments: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const invoicesWithStats = invoices.map(invoice => {
      const totalPagado = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
      const pendiente = invoice.total - totalPagado

      return {
        id: invoice.id,
        companyId: invoice.companyId,
        companyName: invoice.company.name,
        number: invoice.number,
        ncf: invoice.ncf,
        type: invoice.type,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotal: invoice.subtotal,
        itbis: invoice.itbis,
        discount: invoice.discount,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        priority: invoice.priority,
        totalPagado,
        pendiente,
        itemsCount: invoice.items.length,
        paymentsCount: invoice.payments.length,
        createdAt: invoice.createdAt,
      }
    })

    return NextResponse.json(invoicesWithStats)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyId,
      number,
      ncf,
      type,
      issueDate,
      dueDate,
      subtotal,
      itbis,
      discount,
      total,
      currency,
      notes,
      imageUrl,
      ocrRawData,
      items,
    } = body

    if (!companyId || !number || !issueDate) {
      return NextResponse.json(
        { error: 'companyId, number, and issueDate are required' },
        { status: 400 }
      )
    }

    // Check if invoice already exists for this company
    const existing = await prisma.invoice.findUnique({
      where: {
        companyId_number: {
          companyId,
          number,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Invoice already exists for this company with this number' },
        { status: 409 }
      )
    }

    // Calculate totals if not provided
    const calculatedSubtotal = subtotal || items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0
    const calculatedItbis = itbis || (calculatedSubtotal * 0.18)
    const calculatedTotal = total || (calculatedSubtotal + calculatedItbis - (discount || 0))

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        number,
        ncf: ncf || null,
        type: type || 'CREDITO_FISCAL',
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: calculatedSubtotal,
        itbis: calculatedItbis,
        discount: discount || 0,
        total: calculatedTotal,
        currency: currency || 'DOP',
        status: 'PENDIENTE',
        priority: 'NORMAL',
        notes: notes || null,
        imageUrl: imageUrl || null,
        ocrRawData: ocrRawData || null,
        items: items ? {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            subtotal: (item.quantity || 1) * (item.unitPrice || 0),
          })),
        } : undefined,
      },
      include: {
        company: true,
        items: true,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Error creating invoice' }, { status: 500 })
  }
}
