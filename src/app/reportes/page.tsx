'use client'

import { useEffect, useRef } from 'react'

export default function ReportesPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Load the GenFact.html content into the iframe
    if (iframeRef.current) {
      iframeRef.current.src = '/GenFact.html'
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📄 Generador de Reportes</h2>
          <p className="text-sm text-gray-500">Genera reportes de deudas pendientes en PDF</p>
        </div>
        <a
          href="/GenFact.html"
          target="_blank"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Abrir en nueva pestaña
        </a>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full h-[calc(100vh-200px)]"
          title="Generador de Reportes"
        />
      </div>
    </div>
  )
}
