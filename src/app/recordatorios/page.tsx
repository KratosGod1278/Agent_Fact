'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface Reminder {
  id: string
  invoiceId: string
  companyId: string
  remindAt: string
  channel: string
  message: string | null
  status: string
  sentAt: string | null
  createdAt: string
  invoice: { number: string; total: number; status: string; dueDate: string | null }
  company: { name: string; email: string | null }
}

export default function RecordatoriosPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [createData, setCreateData] = useState({
    invoiceId: '',
    remindAt: '',
    channel: 'INTERNAL',
    message: '',
  })

  useEffect(() => {
    fetchReminders()
    fetchInvoices()
  }, [])

  async function fetchReminders() {
    const res = await fetch('/api/recordatorios')
    const data = await res.json()
    setReminders(data)
    setLoading(false)
  }

  async function fetchInvoices() {
    const res = await fetch('/api/facturas')
    const data = await res.json()
    setInvoices(data.filter((inv: any) => inv.status !== 'PAGADA'))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/recordatorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    })
    if (res.ok) {
      setShowCreate(false)
      setCreateData({ invoiceId: '', remindAt: '', channel: 'INTERNAL', message: '' })
      fetchReminders()
    }
  }

  async function handleCancel(id: string) {
    await fetch(`/api/recordatorios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELADO' }),
    })
    fetchReminders()
  }

  async function handleSendNow(reminder: Reminder) {
    try {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reminder',
          to: reminder.company.email,
          invoiceId: reminder.invoiceId,
        }),
      })
      const result = await res.json()
      if (result.success) {
        await fetch(`/api/recordatorios/${reminder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ENVIADO', sentAt: new Date().toISOString() }),
        })
        fetchReminders()
        alert('✅ Recordatorio enviado')
      } else {
        alert('❌ Error al enviar')
      }
    } catch (error) {
      alert('❌ Error de red')
    }
  }

  const filtered = reminders.filter(r => {
    if (filter === 'ALL') return true
    return r.status === filter
  })

  const pendingCount = reminders.filter(r => r.status === 'PENDIENTE').length
  const sentCount = reminders.filter(r => r.status === 'ENVIADO').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando recordatorios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🔔 Recordatorios</h2>
          <p className="text-sm text-gray-500">
            {pendingCount} pendientes · {sentCount} enviados
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo Recordatorio
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Nuevo Recordatorio</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Factura *</label>
              <select
                required
                value={createData.invoiceId}
                onChange={(e) => setCreateData({ ...createData, invoiceId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Seleccionar factura...</option>
                {invoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.companyName} — #{inv.number} — {formatCurrency(inv.pendiente || inv.total)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha y Hora *</label>
              <input
                type="datetime-local"
                required
                value={createData.remindAt}
                onChange={(e) => setCreateData({ ...createData, remindAt: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Canal</label>
              <select
                value={createData.channel}
                onChange={(e) => setCreateData({ ...createData, channel: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="INTERNAL">🔔 Interno</option>
                <option value="EMAIL">📧 Email</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Mensaje (opcional)</label>
              <textarea
                value={createData.message}
                onChange={(e) => setCreateData({ ...createData, message: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Mensaje personalizado..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Crear Recordatorio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-2">
        {['ALL', 'PENDIENTE', 'ENVIADO', 'CANCELADO'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'ALL' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">🔔</div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {reminders.length === 0 ? 'No hay recordatorios' : 'No se encontraron recordatorios'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {reminders.length === 0 ? 'Crea tu primer recordatorio para dar seguimiento a las facturas.' : 'Intenta con otros filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reminder => (
            <div
              key={reminder.id}
              className={`rounded-xl border p-4 ${
                reminder.status === 'PENDIENTE'
                  ? 'border-yellow-200 bg-yellow-50'
                  : reminder.status === 'ENVIADO'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {reminder.status === 'PENDIENTE' ? '🔔' : reminder.status === 'ENVIADO' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold text-gray-900">{reminder.company.name}</span>
                    <span className="text-sm text-gray-500">Factura #{reminder.invoice.number}</span>
                    <StatusBadge status={reminder.invoice.status} />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Programado:</span>
                      <span className="ml-2 font-medium">{formatDate(reminder.remindAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Canal:</span>
                      <span className="ml-2 font-medium">
                        {reminder.channel === 'EMAIL' ? '📧 Email' : '🔔 Interno'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total factura:</span>
                      <span className="ml-2 font-medium">{formatCurrency(reminder.invoice.total)}</span>
                    </div>
                    {reminder.sentAt && (
                      <div>
                        <span className="text-gray-500">Enviado:</span>
                        <span className="ml-2 font-medium">{formatDate(reminder.sentAt)}</span>
                      </div>
                    )}
                  </div>

                  {reminder.message && (
                    <p className="mt-2 text-sm text-gray-600 italic">"{reminder.message}"</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {reminder.status === 'PENDIENTE' && (
                    <>
                      <button
                        onClick={() => handleSendNow(reminder)}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        📤 Enviar Ahora
                      </button>
                      <button
                        onClick={() => handleCancel(reminder.id)}
                        className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
