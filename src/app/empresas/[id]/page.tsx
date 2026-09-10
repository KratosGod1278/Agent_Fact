'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  rnc: string | null
  address: string | null
  phone: string | null
  email: string | null
  contactName: string | null
  totalFacturado: number
  totalPagado: number
  pendiente: number
  invoices: any[]
  payments: any[]
  createdAt: string
}

export default function EmpresaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompany()
  }, [params.id])

  async function fetchCompany() {
    const res = await fetch(`/api/empresas/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setCompany(data)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (confirm('¿Estás seguro de eliminar esta empresa? Esta acción no se puede deshacer.')) {
      await fetch(`/api/empresas/${params.id}`, { method: 'DELETE' })
      router.push('/empresas')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando empresa...</div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl">❌</div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Empresa no encontrada</h2>
        <Link href="/empresas" className="mt-4 text-blue-600 hover:underline">
          ← Volver a empresas
        </Link>
      </div>
    )
  }

  const getCompanyStatus = () => {
    const hasOverdue = company.invoices.some((i: any) => i.status === 'VENCIDA')
    if (hasOverdue) return 'VENCIDA'
    if (company.totalPagado >= company.totalFacturado && company.totalFacturado > 0) return 'AL DÍA'
    return 'PAGOS PENDIENTES'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/empresas" className="text-sm text-blue-600 hover:underline">
            ← Empresas
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">🏢 {company.name}</h2>
          {company.rnc && <p className="text-gray-500">RNC: {company.rnc}</p>}
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={getCompanyStatus()} />
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Facturado</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(company.totalFacturado)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Pagado</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(company.totalPagado)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pendiente</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(company.pendiente)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Facturas</p>
          <p className="text-xl font-bold text-gray-900">{company.invoices.length}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Información de Contacto</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Dirección</p>
            <p className="font-medium">{company.address || 'No especificada'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Teléfono</p>
            <p className="font-medium">{company.phone || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{company.email || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contacto</p>
            <p className="font-medium">{company.contactName || 'No especificado'}</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🧾 Facturas</h3>
          <Link
            href={`/facturas/nueva?companyId=${company.id}`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nueva Factura
          </Link>
        </div>
        {company.invoices.length === 0 ? (
          <p className="text-sm text-gray-500">No hay facturas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Número</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.invoices.map((invoice: any) => {
                  const pagado = invoice.payments.reduce((s: number, p: any) => s + p.amount, 0)
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/facturas/${invoice.id}`} className="font-medium text-blue-600 hover:underline">
                          #{invoice.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatDate(invoice.issueDate)}</td>
                      <td className="px-4 py-3">
                        {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(invoice.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">💰 Pagos Recientes</h3>
        {company.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No hay pagos registrados.</p>
        ) : (
          <div className="space-y-3">
            {company.payments.slice(0, 5).map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  <p className="text-sm text-gray-500">{payment.method} — {payment.registeredBy}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                  {payment.bank && <p className="text-xs text-gray-400">{payment.bank}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
