import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const memories = await prisma.memory.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(memories)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching memories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const memory = await prisma.memory.create({ data: body })
    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error creating memory' }, { status: 500 })
  }
}
