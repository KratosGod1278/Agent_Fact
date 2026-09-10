'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  method: string
  bank: string | null
  reference: string | null
  paidAt: string
  registeredBy: string
  notes: string | null
  company: { name: string; email: string | null }
  invoice: { number: string; total: number }
  receipt: { content: string } | null
}

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showReceipt, setShowReceipt] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<{ paymentId: string; companyName: string } | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [dailySummaryEmail, setDailySummaryEmail] = useState('')
  const [sendingSummary, setSendingSummary] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    const res = await fetch('/api/pagos')
    const data = await res.json()
    setPayments(data)
    setLoading(false)
  }

  async function handleSendReceipt() {
    if (!emailModal || !emailAddress) return

    setSendingEmail(true)
    setEmailStatus('')

    try {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          to: emailAddress,
          paymentId: emailModal.paymentId,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setEmailStatus('✅ Comprobante enviado correctamente')
        setTimeout(() => {
          setEmailModal(null)
          setEmailStatus('')
          setEmailAddress('')
        }, 2000)
      } else {
        setEmailStatus('❌ Error al enviar: ' + (result.error?.message || 'Error desconocido'))
      }
    } catch (error: any) {
      setEmailStatus('❌ Error: ' + error.message)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleSendDailySummary() {
    if (!dailySummaryEmail) return

    setSendingSummary(true)

    try {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily-summary',
          to: dailySummaryEmail,
        }),
      })

      const result = await res.json()

      if (result.success) {
        alert('✅ Resumen diario enviado correctamente')
        setDailySummaryEmail('')
      } else {
        alert('❌ Error al enviar')
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message)
    } finally {
      setSendingSummary(false)
    }
  }

  const totalPagado = payments.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando pagos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💰 Pagos</h2>
          <p className="text-sm text-gray-500">{payments.length} pagos registrados — Total: {formatCurrency(totalPagado)}</p>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-900">📊 Enviar Resumen Diario</h3>
            <p className="text-sm text-purple-600">Recibe un resumen completo de tu situación financiera</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="tu@email.com"
              value={dailySummaryEmail}
              onChange={(e) => setDailySummaryEmail(e.target.value)}
              className="rounded-lg border border-purple-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={handleSendDailySummary}
              disabled={sendingSummary || !dailySummaryEmail}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {sendingSummary ? '⏳' : '📤 Enviar'}
            </button>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">💰</div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay pagos registrados</h3>
          <p className="mt-2 text-sm text-gray-500">Registra pagos desde las facturas.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Factura</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Monto</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Método</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{payment.company.name}</td>
                    <td className="px-4 py-3">#{payment.invoice.number}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {payment.method === 'EFECTIVO' ? '💵' : payment.method === 'TRANSFERENCIA' ? '🏦' : '💳'} {payment.method}
                      </span>
                      {payment.bank && (
                        <p className="mt-1 text-xs text-gray-400">{payment.bank}</p>
                      )}
                      {payment.reference && (
                        <p className="text-xs text-gray-400">Ref: {payment.reference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatDate(payment.paidAt)}</p>
                      <p className="text-xs text-gray-400">{payment.registeredBy}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {payment.receipt && (
                          <button
                            onClick={() => setShowReceipt(payment.receipt!.content)}
                            className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                          >
                            🧾 Ver
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEmailModal({
                              paymentId: payment.id,
                              companyName: payment.company.name,
                            })
                            setEmailAddress(payment.company.email || '')
                          }}
                          className="rounded bg-green-50 px-2 py-1 text-xs text-green-600 hover:bg-green-100"
                        >
                          📧 Enviar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Comprobante de Pago</h3>
              <button
                onClick={() => setShowReceipt(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-sm">
              {showReceipt}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  const blob = new Blob([showReceipt], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `comprobante-${Date.now()}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                📥 Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📧 Enviar Comprobante</h3>
              <button
                onClick={() => {
                  setEmailModal(null)
                  setEmailStatus('')
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                <p className="text-gray-900">{emailModal.companyName}</p>
              </div>

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
                    setEmailModal(null)
                    setEmailStatus('')
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReceipt}
                  disabled={sendingEmail || !emailAddress}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {sendingEmail ? '⏳ Enviando...' : '📤 Enviar Comprobante'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
