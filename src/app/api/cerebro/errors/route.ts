import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const errors = await prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(errors)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching errors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const error = await prisma.errorLog.create({ data: body })
    return NextResponse.json(error, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error logging error' }, { status: 500 })
  }
}
