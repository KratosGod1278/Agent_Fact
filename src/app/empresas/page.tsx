'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface Company {
  id: string
  name: string
  rnc: string | null
  totalFacturado: number
  totalPagado: number
  pendiente: number
  facturasTotales: number
  facturasPendientes: number
  hasOverdue: boolean
  createdAt: string
}

function getCompanyStatus(company: Company): string {
  if (company.hasOverdue) return 'VENCIDA'
  if (company.totalPagado >= company.totalFacturado && company.totalFacturado > 0) return 'AL DÍA'
  return 'PAGOS PENDIENTES'
}

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rnc: '',
    address: '',
    phone: '',
    email: '',
    contactName: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    const res = await fetch('/api/empresas')
    const data = await res.json()
    setCompanies(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (res.ok) {
      setShowForm(false)
      setFormData({ name: '', rnc: '', address: '', phone: '', email: '', contactName: '' })
      fetchCompanies()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Cargando empresas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏢 Empresas</h2>
          <p className="text-sm text-gray-500">{companies.length} empresas registradas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva Empresa
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Nueva Empresa</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">RNC</label>
              <input
                type="text"
                value={formData.rnc}
                onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dirección</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contacto</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Crear Empresa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Companies List */}
      {companies.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">🏢</div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay empresas registradas</h3>
          <p className="mt-2 text-sm text-gray-500">Comienza agregando tu primera empresa proveedora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/empresas/${company.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {company.name}
                  </h3>
                  {company.rnc && (
                    <p className="text-sm text-gray-500">RNC: {company.rnc}</p>
                  )}
                </div>
                <StatusBadge status={getCompanyStatus(company)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Facturado</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(company.totalFacturado)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pagado</p>
                  <p className="font-semibold text-green-600">{formatCurrency(company.totalPagado)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pendiente</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(company.pendiente)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Facturas</p>
                  <p className="font-semibold text-gray-900">
                    {company.facturasTotales}
                    {company.facturasPendientes > 0 && (
                      <span className="ml-1 text-xs text-orange-500">
                        ({company.facturasPendientes} pend.)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
