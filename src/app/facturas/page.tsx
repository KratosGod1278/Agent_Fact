'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface Invoice {
  id: string
  companyId: string
  companyName: string
  number: string
  ncf: string | null
  issueDate: string
  dueDate: string | null
  total: number
  status: string
  priority: string
  totalPagado: number
  pendiente: number
  itemsCount: number
  paymentsCount: number
  createdAt: string
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    const res = await fetch('/api/facturas')
    const data = await res.json()
    setInvoices(data)
    setLoading(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filter !== 'ALL' && inv.status !== filter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        inv.companyName.toLowerCase().includes(searchLower) ||
        inv.number.toLowerCase().includes(searchLower) ||
        (inv.ncf && inv.ncf.toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando facturas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧾 Facturas</h2>
          <p className="text-sm text-gray-500">{invoices.length} facturas registradas</p>
        </div>
        <Link
          href="/facturas/nueva"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva Factura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por empresa, número o NCF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex space-x-1">
          {['ALL', 'PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'ALL' ? 'Todas' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">🧾</div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {invoices.length === 0 ? 'No hay facturas registradas' : 'No se encontraron facturas'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {invoices.length === 0 ? 'Comienza subiendo tu primera factura.' : 'Intenta con otros filtros.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Factura</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Pagado</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Pendiente</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/empresas/${invoice.companyId}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {invoice.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/facturas/${invoice.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        #{invoice.number}
                      </Link>
                      {invoice.ncf && (
                        <p className="text-xs text-gray-400">NCF: {invoice.ncf}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(invoice.issueDate)}</td>
                    <td className="px-4 py-3">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(invoice.totalPagado)}</td>
                    <td className="px-4 py-3 text-orange-600">{formatCurrency(invoice.pendiente)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
