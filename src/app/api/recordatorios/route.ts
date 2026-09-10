import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const reminders = await prisma.reminder.findMany({
      include: {
        invoice: true,
        company: true,
      },
      orderBy: { remindAt: 'asc' },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching reminders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, remindAt, channel, message } = body

    if (!invoiceId || !remindAt) {
      return NextResponse.json({ error: 'invoiceId and remindAt are required' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const reminder = await prisma.reminder.create({
      data: {
        invoiceId,
        companyId: invoice.companyId,
        remindAt: new Date(remindAt),
        channel: channel || 'INTERNAL',
        message: message || null,
        status: 'PENDIENTE',
      },
      include: {
        invoice: true,
        company: true,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error creating reminder' }, { status: 500 })
  }
}
