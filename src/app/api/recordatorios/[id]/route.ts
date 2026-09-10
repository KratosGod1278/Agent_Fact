import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.sentAt !== undefined && { sentAt: new Date(body.sentAt) }),
        ...(body.message !== undefined && { message: body.message }),
      },
      include: {
        invoice: true,
        company: true,
      },
    })

    return NextResponse.json(reminder)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating reminder' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.reminder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting reminder' }, { status: 500 })
  }
}
