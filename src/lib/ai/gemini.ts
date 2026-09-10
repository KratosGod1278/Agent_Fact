import { GoogleGenAI } from '@google/genai'
import {
  INVOICE_EXTRACTION_PROMPT,
  INVOICE_SCHEMA,
  INVOICE_ANALYSIS_PROMPT,
  REMINDER_PROMPT,
  DAILY_SUMMARY_PROMPT,
  COMPANY_ANALYSIS_PROMPT,
} from './prompts'

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export interface ExtractedInvoiceData {
  company: {
    name: string
    rnc?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    contactName?: string | null
  }
  invoice: {
    number: string
    ncf?: string | null
    type: string
    issueDate?: string | null
    dueDate?: string | null
    subtotal: number
    itbis: number
    discount: number
    total: number
    currency: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  paymentMethods?: {
    suggestedMethod?: string
    bank?: string
    conditions?: string
    creditDays?: number
  }
  notes?: string | null
  confidence?: number
}

/**
 * Analyze OCR text and extract structured invoice data using Gemini
 */
export async function extractInvoiceData(
  ocrText: string
): Promise<ExtractedInvoiceData> {
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: INVOICE_EXTRACTION_PROMPT }] },
      { role: 'user', parts: [{ text: `Analiza esta factura extraída por OCR:\n\n${ocrText}` }] },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: INVOICE_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned empty response')
  }

  const data = JSON.parse(text)

  // Normalize and validate the data
  return normalizeInvoiceData(data)
}

/**
 * Normalize extracted invoice data to ensure consistency
 */
function normalizeInvoiceData(data: any): ExtractedInvoiceData {
  const company = {
    name: data.company?.name || 'NO DETECTADO',
    rnc: data.company?.rnc || null,
    address: data.company?.address || null,
    phone: data.company?.phone || null,
    email: data.company?.email || null,
    contactName: data.company?.contactName || null,
  }

  const subtotal = parseFloat(data.invoice?.subtotal) || 0
  const itbis = parseFloat(data.invoice?.itbis) || subtotal * 0.18
  const discount = parseFloat(data.invoice?.discount) || 0
  const total = parseFloat(data.invoice?.total) || (subtotal + itbis - discount)

  const invoice = {
    number: data.invoice?.number || 'NO DETECTADO',
    ncf: data.invoice?.ncf || null,
    type: data.invoice?.type || 'CREDITO_FISCAL',
    issueDate: data.invoice?.issueDate || null,
    dueDate: data.invoice?.dueDate || null,
    subtotal,
    itbis,
    discount,
    total,
    currency: data.invoice?.currency || 'DOP',
  }

  const items = (data.items || []).map((item: any) => ({
    description: item.description || 'Item sin descripción',
    quantity: parseFloat(item.quantity) || 1,
    unitPrice: parseFloat(item.unitPrice) || 0,
    subtotal: parseFloat(item.subtotal) || (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
  }))

  return {
    company,
    invoice,
    items,
    paymentMethods: data.paymentMethods || undefined,
    notes: data.notes || null,
    confidence: calculateConfidence(data),
  }
}

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(data: any): number {
  let score = 0
  const maxScore = 10

  // Company
  if (data.company?.name && data.company.name !== 'NO DETECTADO') score += 1
  if (data.company?.rnc) score += 0.5
  if (data.company?.phone) score += 0.5

  // Invoice
  if (data.invoice?.number) score += 1
  if (data.invoice?.ncf) score += 0.5
  if (data.invoice?.subtotal) score += 1
  if (data.invoice?.total) score += 1
  if (data.invoice?.issueDate) score += 0.5
  if (data.invoice?.dueDate) score += 0.5

  // Items
  if (data.items && data.items.length > 0) {
    score += 1
    if (data.items.length > 1) score += 0.5
  }

  return Math.round((score / maxScore) * 100) / 100
}

/**
 * Analyze invoice data for issues and inconsistencies
 */
export async function analyzeInvoiceIssues(
  invoiceData: ExtractedInvoiceData
): Promise<string> {
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: INVOICE_ANALYSIS_PROMPT }] },
      {
        role: 'user',
        parts: [
          {
            text: `Analiza esta factura:\n\n${JSON.stringify(invoiceData, null, 2)}`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  })

  return response.text || 'No se pudo analizar la factura.'
}

/**
 * Generate a payment reminder message
 */
export async function generateReminderMessage(data: {
  companyName: string
  invoiceNumber: string
  pendingAmount: number
  dueDate: string
  daysUntilDue: number
}): Promise<string> {
  const prompt = `Genera un recordatorio de pago para:
Empresa: ${data.companyName}
Factura: #${data.invoiceNumber}
Monto pendiente: RD$${data.pendingAmount.toLocaleString('es-DO')}
Fecha de vencimiento: ${data.dueDate}
Días hasta vencer: ${data.daysUntilDue}`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: REMINDER_PROMPT }] },
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  })

  return response.text || 'Recordatorio pendiente.'
}

/**
 * Generate daily financial summary
 */
export async function generateDailySummary(data: {
  totalInvoiced: number
  totalPaid: number
  pendingAmount: number
  overdueCount: number
  upcomingDue: Array<{
    companyName: string
    invoiceNumber: string
    amount: number
    dueDate: string
  }>
}): Promise<string> {
  const prompt = `Genera un resumen financiero diario:
Total facturado hoy: RD$${data.totalInvoiced.toLocaleString('es-DO')}
Total pagado hoy: RD$${data.totalPaid.toLocaleString('es-DO')}
Total pendiente: RD$${data.pendingAmount.toLocaleString('es-DO')}
Facturas vencidas: ${data.overdueCount}
Próximos vencimientos:
${data.upcomingDue
  .map(
    (u) =>
      `- ${u.companyName} Factura #${u.invoiceNumber}: RD$${u.amount.toLocaleString('es-DO')} (vence ${u.dueDate})`
  )
  .join('\n')}`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: DAILY_SUMMARY_PROMPT }] },
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      temperature: 0.5,
      maxOutputTokens: 2048,
    },
  })

  return response.text || 'Resumen no disponible.'
}

/**
 * Analyze company payment patterns
 */
export async function analyzeCompanyPatterns(
  companyData: {
    name: string
    invoices: Array<{
      number: string
      total: number
      status: string
      issueDate: string
      dueDate?: string
      payments: Array<{ amount: number; method: string; paidAt: string }>
    }>
  }
): Promise<string> {
  const prompt = `Analiza los patrones de pago de esta empresa:
Empresa: ${companyData.name}
Facturas: ${JSON.stringify(companyData.invoices, null, 2)}`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: COMPANY_ANALYSIS_PROMPT }] },
      { role: 'user', parts: [{ text: prompt }] },
    ],
    config: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  })

  return response.text || 'Análisis no disponible.'
}

/**
 * Generate financial insights from invoice data
 */
export async function generateFinancialInsights(
  invoiceData: Array<{ total: number; status: string }>
): Promise<string> {
  const totalFacturado = invoiceData.reduce((sum, inv) => sum + inv.total, 0)
  const pagadas = invoiceData.filter(i => i.status === 'PAGADA').length
  const pendientes = invoiceData.filter(i => i.status === 'PENDIENTE').length
  const vencidas = invoiceData.filter(i => i.status === 'VENCIDA').length

  const prompt = `Genera insights financieros concisos basados en estos datos:
- Total facturas: ${invoiceData.length}
- Total facturado: $${totalFacturado}
- Pagadas: ${pagadas}
- Pendientes: ${pendientes}
- Vencidas: ${vencidas}
- Tasa de cobro: ${invoiceData.length > 0 ? Math.round((pagadas / invoiceData.length) * 100) : 0}%

Proporciona 3-5 recomendaciones accionables en español.`

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.5,
      maxOutputTokens: 1024,
    },
  })

  return response.text || 'No se pudieron generar insights.'
}
