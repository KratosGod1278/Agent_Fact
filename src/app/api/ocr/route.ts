import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage } from '@/lib/ai/mistral'
import { extractInvoiceData, analyzeInvoiceIssues, type ExtractedInvoiceData } from '@/lib/ai/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, mimeType = 'image/jpeg', companyId } = body

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Step 1: Extract text using Mistral OCR
    let ocrResult
    try {
      ocrResult = await extractTextFromImage(image, mimeType)
    } catch (ocrError: any) {
      console.error('OCR Error:', ocrError)
      return NextResponse.json(
        { error: 'Error extracting text from image', details: ocrError.message },
        { status: 500 }
      )
    }

    if (!ocrResult.ocrText || ocrResult.ocrText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the image' },
        { status: 422 }
      )
    }

    // Step 2: Analyze with Gemini and extract structured data
    let extractedData: ExtractedInvoiceData
    try {
      extractedData = await extractInvoiceData(ocrResult.ocrText)
    } catch (geminiError: any) {
      console.error('Gemini Analysis Error:', geminiError)
      return NextResponse.json(
        {
          error: 'Error analyzing invoice data',
          details: geminiError.message,
          ocrText: ocrResult.ocrText,
        },
        { status: 500 }
      )
    }

    // Step 3: Check for potential duplicates
    const duplicateCheck = await checkForDuplicates(extractedData, companyId)

    // Step 4: Check if company exists or needs to be created
    let companySuggestion = null
    if (extractedData.company.name && extractedData.company.name !== 'NO DETECTADO') {
      const existingCompany = await prisma.company.findFirst({
        where: {
          OR: [
            { name: { contains: extractedData.company.name } },
            ...(extractedData.company.rnc
              ? [{ rnc: extractedData.company.rnc }]
              : []),
          ],
        },
      })

      if (existingCompany) {
        companySuggestion = {
          exists: true,
          id: existingCompany.id,
          name: existingCompany.name,
        }
      } else {
        companySuggestion = {
          exists: false,
          name: extractedData.company.name,
        }
      }
    }

    // Step 5: Generate analysis/observations
    let analysis = ''
    try {
      analysis = await analyzeInvoiceIssues(extractedData)
    } catch (analysisError) {
      console.error('Analysis Error:', analysisError)
      // Non-critical, continue without analysis
    }

    return NextResponse.json({
      success: true,
      ocrText: ocrResult.ocrText,
      extractedData,
      companySuggestion,
      duplicateCheck,
      analysis,
      confidence: extractedData.confidence || 0,
    })
  } catch (error: any) {
    console.error('OCR Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Check for potential duplicate invoices
 */
async function checkForDuplicates(
  data: ExtractedInvoiceData,
  companyId?: string
): Promise<{
  isDuplicate: boolean
  duplicates: Array<{
    id: string
    number: string
    companyName: string
    total: number
    status: string
  }>
  warnings: string[]
}> {
  const warnings: string[] = []
  const duplicates: Array<{
    id: string
    number: string
    companyName: string
    total: number
    status: string
  }> = []

  // Check by invoice number + company
  if (data.invoice.number && data.invoice.number !== 'NO DETECTADO') {
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        number: data.invoice.number,
        ...(companyId ? { companyId } : {}),
      },
      include: { company: true },
    })

    for (const existing of existingInvoices) {
      // Check if totals are similar (within 1% tolerance)
      const totalDiff = Math.abs(existing.total - data.invoice.total) / existing.total
      if (totalDiff < 0.01) {
        duplicates.push({
          id: existing.id,
          number: existing.number,
          companyName: existing.company.name,
          total: existing.total,
          status: existing.status,
        })
      }
    }
  }

  // Check by NCF
  if (data.invoice.ncf) {
    const existingNCF = await prisma.invoice.findFirst({
      where: { ncf: data.invoice.ncf },
      include: { company: true },
    })

    if (existingNCF) {
      warnings.push(`Ya existe una factura con NCF ${data.invoice.ncf} (${existingNCF.company.name})`)
    }
  }

  return {
    isDuplicate: duplicates.length > 0,
    duplicates,
    warnings,
  }
}
