import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const totalPagado = invoice.payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      ...invoice,
      totalPagado,
      pendiente: invoice.total - totalPagado,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching invoice' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(body.number !== undefined && { number: body.number }),
        ...(body.ncf !== undefined && { ncf: body.ncf }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.issueDate !== undefined && { issueDate: new Date(body.issueDate) }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.subtotal !== undefined && { subtotal: body.subtotal }),
        ...(body.itbis !== undefined && { itbis: body.itbis }),
        ...(body.discount !== undefined && { discount: body.discount }),
        ...(body.total !== undefined && { total: body.total }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        company: true,
        payments: true,
      },
    })

    // Recalculate status
    const totalPagado = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    let newStatus = 'PENDIENTE'
    if (totalPagado >= invoice.total) {
      newStatus = 'PAGADA'
    } else if (totalPagado > 0) {
      newStatus = 'PARCIAL'
    }
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && newStatus !== 'PAGADA') {
      newStatus = 'VENCIDA'
    }

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id },
        data: { status: newStatus },
      })
    }

    return NextResponse.json({ ...invoice, status: newStatus, totalPagado })
  } catch (error) {
    return NextResponse.json({ error: 'Error updating invoice' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting invoice' }, { status: 500 })
  }
}
