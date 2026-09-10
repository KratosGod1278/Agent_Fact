'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface MemoryEntry {
  id: string
  entityType: string
  entityId: string | null
  type: string
  content: string
  confidence: number
  createdAt: string
}

interface ErrorLog {
  id: string
  entityType: string
  entityId: string | null
  type: string
  description: string
  severity: string
  resolved: boolean
  solution: string | null
  createdAt: string
}

interface DashboardStats {
  totalInvoices: number
  totalPayments: number
  totalCompanies: number
  totalFacturado: number
  totalPagado: number
  pendiente: number
  overdueCount: number
  avgPaymentDays: number
  topCompanies: Array<{ name: string; total: number; count: number }>
  recentErrors: ErrorLog[]
  memories: MemoryEntry[]
}

export default function CerebroPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'errors' | 'insights'>('overview')
  const [insights, setInsights] = useState('')
  const [generatingInsights, setGeneratingInsights] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [invoicesRes, paymentsRes, companiesRes, memoryRes, errorsRes] = await Promise.all([
        fetch('/api/facturas'),
        fetch('/api/pagos'),
        fetch('/api/empresas'),
        fetch('/api/cerebro/memory'),
        fetch('/api/cerebro/errors'),
      ])

      const invoices = await invoicesRes.json()
      const payments = await paymentsRes.json()
      const companies = await companiesRes.json()
      const memory = await memoryRes.json()
      const errors = await errorsRes.json()

      const totalFacturado = invoices.reduce((sum: number, inv: any) => sum + inv.total, 0)
      const totalPagado = invoices.reduce((sum: number, inv: any) => sum + inv.totalPagado, 0)

      // Calculate top companies
      const companyMap = new Map<string, { name: string; total: number; count: number }>()
      invoices.forEach((inv: any) => {
        const existing = companyMap.get(inv.companyName)
        if (existing) {
          existing.total += inv.total
          existing.count++
        } else {
          companyMap.set(inv.companyName, { name: inv.companyName, total: inv.total, count: 1 })
        }
      })
      const topCompanies = Array.from(companyMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      setStats({
        totalInvoices: invoices.length,
        totalPayments: payments.length,
        totalCompanies: companies.length,
        totalFacturado,
        totalPagado,
        pendiente: totalFacturado - totalPagado,
        overdueCount: invoices.filter((inv: any) => inv.status === 'VENCIDA').length,
        avgPaymentDays: 0,
        topCompanies,
        recentErrors: errors.slice(0, 5),
        memories: memory.slice(0, 10),
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
    setLoading(false)
  }

  async function generateInsights() {
    setGeneratingInsights(true)
    try {
      const res = await fetch('/api/cerebro/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      })
      const data = await res.json()
      setInsights(data.insights || 'No se pudieron generar insights')
    } catch (error) {
      setInsights('Error al generar insights')
    }
    setGeneratingInsights(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">🧠 Cargando cerebro...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧠 Cerebro IA</h2>
          <p className="text-sm text-gray-500">Memoria, análisis e inteligencia del sistema</p>
        </div>
        <button
          onClick={generateInsights}
          disabled={generatingInsights}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {generatingInsights ? '⏳ Analizando...' : '💡 Generar Insights'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
        {[
          { id: 'overview', label: '📊 Resumen', icon: '📊' },
          { id: 'memory', label: '💾 Memoria', icon: '💾' },
          { id: 'errors', label: '⚠️ Errores', icon: '⚠️' },
          { id: 'insights', label: '💡 Insights', icon: '💡' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-2xl">🧾</div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
              <p className="text-sm text-gray-500">Facturas</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-2xl">💰</div>
              <p className="mt-2 text-2xl font-bold text-green-600">{stats.totalPayments}</p>
              <p className="text-sm text-gray-500">Pagos</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-2xl">🏢</div>
              <p className="mt-2 text-2xl font-bold text-blue-600">{stats.totalCompanies}</p>
              <p className="text-sm text-gray-500">Empresas</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="text-2xl">🔴</div>
              <p className="mt-2 text-2xl font-bold text-red-600">{stats.overdueCount}</p>
              <p className="text-sm text-red-500">Vencidas</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">💰 Resumen Financiero</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Facturado:</span>
                <span className="font-bold text-gray-900">{formatCurrency(stats.totalFacturado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Pagado:</span>
                <span className="font-bold text-green-600">{formatCurrency(stats.totalPagado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pendiente:</span>
                <span className="font-bold text-orange-600">{formatCurrency(stats.pendiente)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tasa de cobro:</span>
                  <span className="font-bold text-blue-600">
                    {stats.totalFacturado > 0
                      ? `${Math.round((stats.totalPagado / stats.totalFacturado) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Companies */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">🏢 Top Empresas</h3>
            <div className="space-y-3">
              {stats.topCompanies.map((company, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-gray-500">{company.count} factura{company.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="font-bold">{formatCurrency(company.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === 'memory' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">💾 Memoria IA</h3>
          {stats?.memories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl">💾</div>
              <p className="mt-4 text-gray-500">La memoria se poblará automáticamente con el uso del sistema.</p>
              <p className="text-sm text-gray-400 mt-2">
                La IA aprende patrones de pago, preferencias de empresas, y comportamiento financiero.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.memories.map(memory => (
                <div key={memory.id} className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧠</span>
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                        {memory.type}
                      </span>
                      <span className="text-xs text-gray-500">{memory.entityType}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Confianza: {Math.round(memory.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{memory.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">⚠️ Log de Errores</h3>
          {stats?.recentErrors.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl">✅</div>
              <p className="mt-4 text-gray-500">No hay errores registrados. ¡Todo funciona correctamente!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.recentErrors.map(error => (
                <div
                  key={error.id}
                  className={`rounded-lg border p-4 ${
                    error.severity === 'CRITICAL'
                      ? 'border-red-300 bg-red-50'
                      : error.severity === 'ERROR'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {error.severity === 'CRITICAL' ? '🔴' : error.severity === 'ERROR' ? '🟠' : '🟡'}
                      </span>
                      <span className="text-xs font-medium bg-white px-2 py-0.5 rounded border">
                        {error.type}
                      </span>
                      <span className="text-xs text-gray-500">{error.entityType}</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      error.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {error.resolved ? 'Resuelto' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{error.description}</p>
                  {error.solution && (
                    <p className="mt-1 text-sm text-green-600">✅ {error.solution}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-purple-900">💡 Insights IA</h3>
          {insights ? (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{insights}</pre>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl">💡</div>
              <p className="mt-4 text-purple-700">Haz clic en "Generar Insights" para obtener análisis inteligente de tu situación financiera.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
