import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'DOP'): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'PENDIENTE': return 'bg-red-100 text-red-800 border-red-200'
    case 'PARCIAL': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'PAGADA': return 'bg-green-100 text-green-800 border-green-200'
    case 'VENCIDA': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

export function getInvoiceStatusIcon(status: string): string {
  switch (status) {
    case 'PENDIENTE': return '🔴'
    case 'PARCIAL': return '🟠'
    case 'PAGADA': return '🟢'
    case 'VENCIDA': return '⚫'
    default: return '🔵'
  }
}

export function getCompanyStatusColor(totalFacturado: number, totalPagado: number, hasOverdue: boolean): string {
  if (hasOverdue) return 'bg-red-100 text-red-800 border-red-200'
  if (totalPagado >= totalFacturado && totalFacturado > 0) return 'bg-green-100 text-green-800 border-green-200'
  return 'bg-orange-100 text-orange-800 border-orange-200'
}

export function getCompanyStatusText(totalFacturado: number, totalPagado: number, hasOverdue: boolean): string {
  if (hasOverdue) return 'VENCIDA'
  if (totalPagado >= totalFacturado && totalFacturado > 0) return 'AL DÍA'
  return 'PAGOS PENDIENTES'
}
