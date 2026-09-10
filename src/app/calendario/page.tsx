'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceWithDue {
  id: string
  number: string
  total: number
  status: string
  dueDate: string
  companyName: string
  companyId: string
  pendiente: number
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  invoices: InvoiceWithDue[]
}

export default function CalendarioPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDue[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    const res = await fetch('/api/facturas')
    const data = await res.json()
    const withDue = data
      .filter((inv: any) => inv.dueDate && inv.status !== 'PAGADA')
      .map((inv: any) => ({
        id: inv.id,
        number: inv.number,
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate,
        companyName: inv.companyName,
        companyId: inv.companyId,
        pendiente: inv.pendiente,
      }))
    setInvoices(withDue)
    setLoading(false)
  }

  function getDaysInMonth(date: Date): CalendarDay[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: CalendarDay[] = []

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        invoices: getInvoicesForDate(d),
      })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.getTime() === today.getTime(),
        invoices: getInvoicesForDate(d),
      })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        invoices: getInvoicesForDate(d),
      })
    }

    return days
  }

  function getInvoicesForDate(date: Date): InvoiceWithDue[] {
    return invoices.filter(inv => {
      const due = new Date(inv.dueDate)
      return due.getFullYear() === date.getFullYear() &&
        due.getMonth() === date.getMonth() &&
        due.getDate() === date.getDate()
    })
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const overdueCount = invoices.filter(inv => inv.status === 'VENCIDA').length
  const totalPending = invoices.reduce((sum, inv) => sum + inv.pendiente, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando calendario...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📅 Calendario</h2>
          <p className="text-sm text-gray-500">
            {invoices.length} facturas con vencimiento — Pendiente: {formatCurrency(totalPending)}
          </p>
        </div>
        {overdueCount > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2">
            <span className="text-red-700 font-medium">🔴 {overdueCount} vencida{overdueCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <h3 className="text-lg font-semibold">
              {currentMonth.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(day)}
                className={`
                  relative min-h-[80px] rounded-lg border p-1.5 text-left transition-colors
                  ${day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}
                  ${!day.isCurrentMonth ? 'opacity-40' : ''}
                  ${selectedDay?.date.getTime() === day.date.getTime() ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <span className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day.date.getDate()}
                </span>
                {day.invoices.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {day.invoices.slice(0, 3).map(inv => (
                      <div
                        key={inv.id}
                        className={`rounded px-1 py-0.5 text-[10px] font-medium truncate ${
                          inv.status === 'VENCIDA'
                            ? 'bg-red-100 text-red-700'
                            : inv.status === 'PENDIENTE'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {inv.companyName}
                      </div>
                    ))}
                    {day.invoices.length > 3 && (
                      <div className="text-[10px] text-gray-500 text-center">
                        +{day.invoices.length - 3} más
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Detail */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            {selectedDay
              ? `${selectedDay.date.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : 'Selecciona un día'}
          </h3>

          {!selectedDay ? (
            <p className="text-sm text-gray-500">Haz clic en un día del calendario para ver los detalles.</p>
          ) : selectedDay.invoices.length === 0 ? (
            <p className="text-sm text-gray-500">No hay facturas con vencimiento en este día.</p>
          ) : (
            <div className="space-y-3">
              {selectedDay.invoices.map(inv => (
                <Link
                  key={inv.id}
                  href={`/facturas/${inv.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{inv.companyName}</p>
                      <p className="text-sm text-gray-500">Factura #{inv.number}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.status === 'VENCIDA'
                        ? 'bg-red-100 text-red-700'
                        : inv.status === 'PENDIENTE'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500">Total: {formatCurrency(inv.total)}</span>
                    <span className="font-medium text-orange-600">Pendiente: {formatCurrency(inv.pendiente)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Upcoming List */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="mb-3 font-medium text-gray-700">📅 Próximos Vencimientos</h4>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No hay facturas pendientes.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {invoices
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 10)
                  .map(inv => (
                    <Link
                      key={inv.id}
                      href={`/facturas/${inv.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-2 hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.companyName}</p>
                        <p className="text-xs text-gray-500">#{inv.number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(inv.pendiente)}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.dueDate)}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
