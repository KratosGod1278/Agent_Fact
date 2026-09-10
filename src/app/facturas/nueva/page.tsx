'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Company {
  id: string
  name: string
}

interface ExtractedData {
  company: {
    name: string
    rnc?: string
    address?: string
    phone?: string
    email?: string
  }
  invoice: {
    number: string
    ncf?: string
    type: string
    issueDate?: string
    dueDate?: string
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
  notes?: string
  confidence?: number
}

function NuevaFacturaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCompanyId = searchParams.get('companyId') || ''
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrStatus, setOcrStatus] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [companySuggestion, setCompanySuggestion] = useState<any>(null)
  const [analysisNotes, setAnalysisNotes] = useState('')
  const [ocrText, setOcrText] = useState('')

  const [formData, setFormData] = useState({
    companyId: preselectedCompanyId,
    number: '',
    ncf: '',
    type: 'CREDITO_FISCAL',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: '',
    itbis: '',
    discount: '',
    notes: '',
  })
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '' }])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => {
        setCompanies(data)
        setLoading(false)
      })
  }, [])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Start OCR
    setOcrLoading(true)
    setOcrStatus('Convirtiendo imagen...')
    setError('')
    setExtractedData(null)
    setDuplicateWarning(null)
    setCompanySuggestion(null)
    setAnalysisNotes('')

    try {
      // Convert to base64
      setOcrStatus('Enviando a Mistral OCR...')
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })

      // Call OCR API
      setOcrStatus('Analizando factura con IA...')
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error al analizar la factura')
      }

      const result = await res.json()

      if (result.ocrText) {
        setOcrText(result.ocrText)
      }

      // Apply extracted data to form
      if (result.extractedData) {
        const data = result.extractedData as ExtractedData
        setExtractedData(data)

        setFormData(prev => ({
          ...prev,
          number: data.invoice.number || '',
          ncf: data.invoice.ncf || '',
          type: data.invoice.type || 'CREDITO_FISCAL',
          issueDate: data.invoice.issueDate || new Date().toISOString().split('T')[0],
          dueDate: data.invoice.dueDate || '',
          subtotal: data.invoice.subtotal?.toString() || '',
          itbis: data.invoice.itbis?.toString() || '',
          discount: data.invoice.discount?.toString() || '',
          notes: data.notes || '',
        }))

        if (data.items && data.items.length > 0) {
          setItems(data.items.map(item => ({
            description: item.description,
            quantity: item.quantity?.toString() || '1',
            unitPrice: item.unitPrice?.toString() || '',
          })))
        }
      }

      // Handle company suggestion
      if (result.companySuggestion) {
        setCompanySuggestion(result.companySuggestion)
        if (result.companySuggestion.exists) {
          setFormData(prev => ({
            ...prev,
            companyId: result.companySuggestion.id,
          }))
        }
      }

      // Handle duplicates
      if (result.duplicateCheck?.isDuplicate) {
        setDuplicateWarning(result.duplicateCheck)
      }

      // Analysis notes
      if (result.analysis) {
        setAnalysisNotes(result.analysis)
      }

      setOcrStatus(`Análisis completado (Confianza: ${Math.round((result.confidence || 0) * 100)}%)`)
    } catch (err: any) {
      setError(err.message || 'Error al procesar la imagen')
      setOcrStatus('')
    } finally {
      setOcrLoading(false)
    }
  }, [])

  function addItem() {
    setItems([...items, { description: '', quantity: '1', unitPrice: '' }])
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  function updateItem(index: number, field: string, value: string) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  function calculateTotals() {
    const itemsSubtotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      return sum + (qty * price)
    }, 0)

    const hasItems = itemsSubtotal > 0
    const hasOcrSubtotal = formData.subtotal && parseFloat(formData.subtotal) > 0

    let subtotal: number
    let itbis: number
    const discount = parseFloat(formData.discount) || 0

    if (hasItems) {
      subtotal = itemsSubtotal
      itbis = subtotal * 0.18
    } else if (hasOcrSubtotal) {
      subtotal = parseFloat(formData.subtotal)
      itbis = formData.itbis ? parseFloat(formData.itbis) : subtotal * 0.18
    } else {
      subtotal = 0
      itbis = 0
    }

    const total = subtotal + itbis - discount
    return { subtotal, itbis, total }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.companyId || !formData.number) {
      setError('Empresa y número de factura son requeridos')
      return
    }

    const { subtotal, itbis, total } = calculateTotals()
    const validItems = items.filter(item => item.description && item.unitPrice)

    const res = await fetch('/api/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: formData.companyId,
        number: formData.number,
        ncf: formData.ncf || null,
        type: formData.type,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate || null,
        subtotal,
        itbis,
        discount: parseFloat(formData.discount) || 0,
        total,
        notes: formData.notes || null,
        items: validItems.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      }),
    })

    if (res.ok) {
      const invoice = await res.json()
      router.push(`/facturas/${invoice.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Error al crear factura')
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/facturas" className="text-sm text-blue-600 hover:underline">
          ← Facturas
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">🧾 Nueva Factura</h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* OCR Upload Section */}
      <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 shadow-sm">
        <div className="text-center">
          <div className="text-4xl mb-2">📷</div>
          <h3 className="text-lg font-semibold text-gray-900">Analizar Factura con IA</h3>
          <p className="text-sm text-gray-500 mb-4">
            Sube una imagen y la IA extraerá automáticamente los datos
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {ocrLoading ? '⏳ Analizando...' : '📷 Subir Imagen'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.capture = 'environment'
                  fileInputRef.current.click()
                }
              }}
              disabled={ocrLoading}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              📸 Tomar Foto
            </button>
          </div>

          {ocrStatus && (
            <p className="mt-3 text-sm text-blue-600">{ocrStatus}</p>
          )}
        </div>

        {/* Image Preview */}
        {previewImage && (
          <div className="mt-4 flex justify-center">
            <img
              src={previewImage}
              alt="Factura"
              className="max-h-64 rounded-lg border border-gray-200 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <h4 className="font-semibold text-yellow-800">⚠️ Posible Factura Duplicada</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Se encontró una factura similar:
          </p>
          {duplicateWarning.duplicates?.map((dup: any) => (
            <div key={dup.id} className="mt-2 rounded bg-white p-3 border border-yellow-200">
              <p className="text-sm">
                <strong>Empresa:</strong> {dup.companyName} |
                <strong> Factura:</strong> #{dup.number} |
                <strong> Total:</strong> RD${dup.total.toLocaleString('es-DO')}
              </p>
              <Link
                href={`/facturas/${dup.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Ver factura existente →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Company Suggestion */}
      {companySuggestion && (
        <div className={`rounded-lg border p-4 ${
          companySuggestion.exists
            ? 'border-green-300 bg-green-50'
            : 'border-blue-300 bg-blue-50'
        }`}>
          <h4 className={`font-semibold ${
            companySuggestion.exists ? 'text-green-800' : 'text-blue-800'
          }`}>
            {companySuggestion.exists ? '✅ Empresa Encontrada' : '🏢 Nueva Empresa Detectada'}
          </h4>
          <p className="text-sm mt-1">
            {companySuggestion.exists
              ? `Se asoció automáticamente con: ${companySuggestion.name}`
              : `La empresa "${companySuggestion.name}" no está registrada. Se creará al guardar la factura.`}
          </p>
        </div>
      )}

      {/* Analysis Notes */}
      {analysisNotes && (
        <div className="rounded-lg border border-purple-300 bg-purple-50 p-4">
          <h4 className="font-semibold text-purple-800">🧠 Análisis IA</h4>
          <p className="text-sm text-purple-700 mt-1 whitespace-pre-wrap">{analysisNotes}</p>
        </div>
      )}

      {/* OCR Text Preview */}
      {ocrText && (
        <details className="rounded-lg border border-gray-300 bg-gray-50">
          <summary className="cursor-pointer p-4 font-semibold text-gray-800 hover:bg-gray-100">
            📄 Texto OCR Extraído (clic para expandir)
          </summary>
          <div className="border-t border-gray-200 p-4">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto">{ocrText}</pre>
          </div>
        </details>
      )}

      {/* Extracted Data Summary */}
      {extractedData && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h4 className="font-semibold text-green-800">✅ Datos Extraídos</h4>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-600">Subtotal:</span> <strong>RD${extractedData.invoice.subtotal?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></div>
            <div><span className="text-gray-600">ITBIS:</span> <strong>RD${extractedData.invoice.itbis?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></div>
            <div><span className="text-gray-600">Descuento:</span> <strong>RD${extractedData.invoice.discount?.toLocaleString('es-DO', { minimumFractionDigits: 2 }) || '0.00'}</strong></div>
            <div><span className="text-gray-600">Total:</span> <strong className="text-green-700">RD${extractedData.invoice.total?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong></div>
          </div>
          <p className="mt-2 text-xs text-green-600">Puedes editar estos valores antes de guardar.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Información General</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Empresa *</label>
              <select
                required
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Seleccionar empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Número de Factura *</label>
              <input
                type="text"
                required
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Ej: 00125"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NCF</label>
              <input
                type="text"
                value={formData.ncf}
                onChange={(e) => setFormData({ ...formData, ncf: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="CREDITO_FISCAL">Crédito Fiscal</option>
                <option value="CONSUMO">Consumo</option>
                <option value="GOBIERNO">Gobierno</option>
                <option value="EXENTO">Exento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Emisión *</label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Productos / Servicios</h3>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              + Agregar
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <input
                  type="text"
                  placeholder="Descripción"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Cant."
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Totales</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ITBIS (18%):</span>
              <span className="font-medium">{new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.itbis)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descuento</label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Observaciones adicionales..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/facturas"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Crear Factura
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="text-gray-500">Cargando...</div></div>}>
      <NuevaFacturaForm />
    </Suspense>
  )
}
