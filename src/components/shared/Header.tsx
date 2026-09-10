'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/empresas': 'Empresas',
  '/facturas': 'Facturas',
  '/pagos': 'Pagos',
  '/calendario': 'Calendario',
  '/recordatorios': 'Recordatorios',
  '/cerebro': 'Cerebro IA',
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Agente Bolelos'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="ml-auto flex items-center space-x-4">
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-DO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </header>
  )
}
