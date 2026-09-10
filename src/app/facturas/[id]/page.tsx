'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface Invoice {
  id: string
  companyId: string
  number: string
  ncf: string | null
  type: string
  issueDate: string
  dueDate: string | null
  subtotal: number
  itbis: number
  discount: number
  total: number
  currency: string
  status: string
  priority: string
  notes: string | null
  totalPagado: number
  pendiente: number
  company: { id: string; name: string; rnc: string | null; email: string | null }
  items: any[]
  payments: any[]
  reminders: any[]
}

export default function FacturaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'EFECTIVO',
    bank: '',
    reference: '',
    notes: '',
    registeredBy: 'Usuario',
  })
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoice()
  }, [params.id])

  async function fetchInvoice() {
    const res = await fetch(`/api/facturas/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setInvoice(data)
    }
    setLoading(false)
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice) return

    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        amount: parseFloat(paymentData.amount),
        method: paymentData.method,
        bank: paymentData.bank || null,
        reference: paymentData.reference || null,
        notes: paymentData.notes || null,
        registeredBy: paymentData.registeredBy,
      }),
    })

    if (res.ok) {
      const result = await res.json()
      setPaymentSuccess(true)
      setLastPaymentId(result.id)
      setPaymentData({ amount: '', method: 'EFECTIVO', bank: '', reference: '', notes: '', registeredBy: 'Usuario' })
      fetchInvoice()

      setTimeout(() => {
        setPaymentSuccess(false)
        setShowPaymentForm(false)
      }, 3000)
    } else {
      const data = await res.json()
      alert(data.error || 'Error al registrar pago')
    }
  }

  async function handleSendReceipt(paymentId: string) {
    if (!emailAddress) return

    setSendingEmail(true)
    setEmailStatus('')

    try {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          to: emailAddress,
          paymentId,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setEmailStatus('✅ Comprobante enviado correctamente')
        setTimeout(() => {
          setShowEmailModal(false)
          setEmailStatus('')
          setEmailAddress('')
        }, 2000)
      } else {
        setEmailStatus('❌ Error: ' + (result.error?.message || 'Error'))
      }
    } catch (error: any) {
      setEmailStatus('❌ Error: ' + error.message)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleDelete() {
    if (confirm('¿Estás seguro de eliminar esta factura?')) {
      await fetch(`/api/facturas/${params.id}`, { method: 'DELETE' })
      router.push('/facturas')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando factura...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl">❌</div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Factura no encontrada</h2>
        <Link href="/facturas" className="mt-4 text-blue-600 hover:underline">← Volver a facturas</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/facturas" className="text-sm text-blue-600 hover:underline">← Facturas</Link>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Factura #{invoice.number}
          </h2>
          <p className="text-gray-500">
            <Link href={`/empresas/${invoice.companyId}`} className="hover:underline">
              {invoice.company.name}
            </Link>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={invoice.status} />
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Payment Success Alert */}
      {paymentSuccess && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
          ✅ Pago registrado correctamente
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setEmailAddress(invoice.company.email || '')
                setShowEmailModal(true)
              }}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
            >
              📧 Enviar Comprobante
            </button>
            <button
              onClick={() => {
                if (lastPaymentId) {
                  const payment = invoice.payments.find((p: any) => p.id === lastPaymentId)
                  if (payment?.receipt) {
                    alert('Mostrando comprobante...')
                  }
                }
              }}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              🧾 Ver Comprobante
            </button>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Factura</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-600">Pagado</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(invoice.totalPagado)}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <p className="text-sm text-orange-600">Pendiente</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(invoice.pendiente)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            disabled={invoice.status === 'PAGADA'}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {invoice.status === 'PAGADA' ? '✅ Pagada' : '💰 Registrar Pago'}
          </button>
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Registrar Pago</h3>
          <form onSubmit={handlePayment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Monto *</label>
              <input
                type="number"
                required
                max={invoice.pendiente}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                placeholder={`Máximo: ${formatCurrency(invoice.pendiente)}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Método *</label>
              <select
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="TARJETA">💳 Tarjeta</option>
                <option value="CHEQUE">📄 Cheque</option>
              </select>
            </div>
            {paymentData.method === 'TRANSFERENCIA' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Banco</label>
                  <input
                    type="text"
                    value={paymentData.bank}
                    onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Referencia</label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Registrar Pago
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Detalles</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Tipo:</span>
              <span className="font-medium">{invoice.type}</span>
            </div>
            {invoice.ncf && (
              <div className="flex justify-between">
                <span className="text-gray-500">NCF:</span>
                <span className="font-medium">{invoice.ncf}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha Emisión:</span>
              <span className="font-medium">{formatDate(invoice.issueDate)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Vencimiento:</span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Moneda:</span>
              <span className="font-medium">{invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Totales</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ITBIS:</span>
              <span className="font-medium">{formatCurrency(invoice.itbis)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Descuento:</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      {invoice.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Productos / Servicios</h3>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="pb-2 font-medium text-gray-600">Descripción</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Cant.</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Precio</th>
                <th className="pb-2 font-medium text-gray-600 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">💰 Pagos ({invoice.payments.length})</h3>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No hay pagos registrados.</p>
        ) : (
          <div className="space-y-3">
            {invoice.payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                  <p className="text-sm text-gray-500">{payment.method}</p>
                  {payment.bank && <p className="text-xs text-gray-400">{payment.bank}</p>}
                  {payment.reference && <p className="text-xs text-gray-400">Ref: {payment.reference}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                  <p className="text-xs text-gray-400">Por: {payment.registeredBy}</p>
                  {payment.receipt && (
                    <button
                      onClick={() => {
                        setEmailAddress(invoice.company.email || '')
                        setShowEmailModal(true)
                      }}
                      className="mt-1 text-xs text-blue-600 hover:underline"
                    >
                      📧 Enviar comprobante
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">📝 Notas</h3>
          <p className="text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📧 Enviar Comprobante</h3>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailStatus('')
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Enviar a:</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              {emailStatus && (
                <p className={`text-sm ${emailStatus.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {emailStatus}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailStatus('')
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const lastPayment = invoice.payments[invoice.payments.length - 1]
                    if (lastPayment) handleSendReceipt(lastPayment.id)
                  }}
                  disabled={sendingEmail || !emailAddress}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {sendingEmail ? '⏳ Enviando...' : '📤 Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
