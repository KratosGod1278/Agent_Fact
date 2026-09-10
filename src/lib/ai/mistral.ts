import { Mistral } from '@mistralai/mistralai'

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
})

export interface OCRResult {
  markdown: string
  images: Array<{
    id: string
    base64?: string
  }>
  pageIndex: number
}

export interface ExtractInvoiceData {
  ocrText: string
  rawResponse: any
}

/**
 * Extract text from an invoice image using Mistral OCR
 * Accepts base64 encoded image or URL
 */
export async function extractTextFromImage(
  imageInput: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractInvoiceData> {
  const isBase64 = imageInput.startsWith('data:') || /^[A-Za-z0-9+/=]+$/.test(imageInput)

  let document: any

  if (isBase64) {
    const base64Data = imageInput.startsWith('data:')
      ? imageInput.split(',')[1]
      : imageInput

    document = {
      type: 'image_url' as const,
      imageUrl: `data:${mimeType};base64,${base64Data}`,
    }
  } else {
    document = {
      type: 'document_url' as const,
      documentUrl: imageInput,
    }
  }

  const ocrResponse = await mistral.ocr.process({
    model: 'mistral-ocr-latest',
    document,
    includeImageBase64: false,
  })

  // Combine all pages into single markdown
  const fullMarkdown = ocrResponse.pages
    ?.map((page: any) => page.markdown || '')
    .join('\n\n') || ''

  return {
    ocrText: fullMarkdown,
    rawResponse: ocrResponse,
  }
}

/**
 * Extract text from multiple invoice images
 */
export async function extractTextFromMultipleImages(
  images: Array<{ data: string; mimeType: string }>
): Promise<ExtractInvoiceData> {
  const results = await Promise.all(
    images.map((img) => extractTextFromImage(img.data, img.mimeType))
  )

  return {
    ocrText: results.map((r) => r.ocrText).join('\n\n---\n\n'),
    rawResponse: results.map((r) => r.rawResponse),
  }
}
