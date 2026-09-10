import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const totalFacturado = company.invoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalPagado = company.invoices.reduce((sum, inv) => {
      return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
    }, 0)

    return NextResponse.json({
      ...company,
      totalFacturado,
      totalPagado,
      pendiente: totalFacturado - totalPagado,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching company' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, rnc, address, phone, email, contactName, notes } = body

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(rnc !== undefined && { rnc }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(contactName !== undefined && { contactName }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating company' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting company' }, { status: 500 })
  }
}
