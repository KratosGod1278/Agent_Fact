import { NextRequest, NextResponse } from 'next/server'
import { generateFinancialInsights } from '@/lib/ai/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { stats } = await request.json()

    const invoiceData = Array(stats.totalInvoices).fill(null).map((_: any, i: number) => ({
      total: stats.totalFacturado / stats.totalInvoices,
      status: i < stats.overdueCount ? 'VENCIDA' : i < stats.totalPayments ? 'PAGADA' : 'PENDIENTE',
    }))

    const insights = await generateFinancialInsights(invoiceData)

    await prisma.memory.create({
      data: {
        entityType: 'SYSTEM',
        type: 'INSIGHT',
        content: insights,
        confidence: 0.7,
      },
    })

    return NextResponse.json({ insights })
  } catch (error) {
    return NextResponse.json({ error: 'Error generating insights' }, { status: 500 })
  }
}
