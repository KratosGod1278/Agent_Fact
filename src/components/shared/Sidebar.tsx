'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Empresas', href: '/empresas', icon: '🏢' },
  { name: 'Facturas', href: '/facturas', icon: '🧾' },
  { name: 'Pagos', href: '/pagos', icon: '💰' },
  { name: 'Calendario', href: '/calendario', icon: '📅' },
  { name: 'Recordatorios', href: '/recordatorios', icon: '🔔' },
    { name: 'Cerebro IA', href: '/cerebro', icon: '🧠' },
    { name: 'Reportes', href: '/reportes', icon: '📄' },
  ]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-gray-900">🧾</span>
          <span className="ml-2 text-lg font-semibold text-gray-900">Agente Bolelos</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500">
            Centro Inteligente de Control Financiero
          </div>
          <div className="mt-1 text-xs text-gray-400">
            v0.1.0 — Fase 1
          </div>
        </div>
      </div>
    </aside>
  )
}
