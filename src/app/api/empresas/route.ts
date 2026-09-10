import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        invoices: {
          include: { payments: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const companiesWithStats = companies.map(company => {
      const totalFacturado = company.invoices.reduce((sum, inv) => sum + inv.total, 0)
      const totalPagado = company.invoices.reduce((sum, inv) => {
        return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
      }, 0)
      const pendiente = totalFacturado - totalPagado
      const hasOverdue = company.invoices.some(i => i.status === 'VENCIDA')
      const facturasPendientes = company.invoices.filter(i => i.status !== 'PAGADA').length

      return {
        id: company.id,
        name: company.name,
        rnc: company.rnc,
        address: company.address,
        phone: company.phone,
        email: company.email,
        contactName: company.contactName,
        totalFacturado,
        totalPagado,
        pendiente,
        facturasTotales: company.invoices.length,
        facturasPendientes,
        hasOverdue,
        createdAt: company.createdAt,
      }
    })

    return NextResponse.json(companiesWithStats)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, rnc, address, phone, email, contactName, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const company = await prisma.company.create({
      data: {
        name,
        rnc: rnc || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        contactName: contactName || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error creating company' }, { status: 500 })
  }
}
