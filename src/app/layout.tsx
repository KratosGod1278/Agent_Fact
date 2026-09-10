import type { Metadata } from 'next'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agente Bolelos — Centro Inteligente de Control Financiero',
  description: 'Sistema inteligente para recepción, análisis, seguimiento y pago de facturas',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 pl-64">
            <Header />
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
