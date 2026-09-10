import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  PENDIENTE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
  PARCIAL: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🟠' },
  PAGADA: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🟢' },
  VENCIDA: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '⚫' },
  'AL DÍA': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🟢' },
  'PAGOS PENDIENTES': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🟠' },
  ENVIADO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '✅' },
  CANCELADO: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', icon: '❌' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🔵' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className="mr-1">{config.icon}</span>
      {status}
    </span>
  )
}
