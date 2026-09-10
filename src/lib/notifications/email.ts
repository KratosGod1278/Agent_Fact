import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendPaymentReceiptParams {
  to: string
  companyName: string
  companyRnc?: string
  invoiceNumber: string
  invoiceTotal: number
  paymentAmount: number
  pendingAmount: number
  paymentMethod: string
  paymentDate: string
  paymentTime: string
  bank?: string
  reference?: string
  registeredBy: string
  status: string
}

interface SendReminderParams {
  to: string
  companyName: string
  invoiceNumber: string
  pendingAmount: number
  dueDate: string
  daysUntilDue: number
  status: string
}

interface SendDailySummaryParams {
  to: string
  date: string
  totalInvoiced: number
  totalPaid: number
  pendingAmount: number
  overdueCount: number
  upcomingDue: Array<{
    companyName: string
    invoiceNumber: string
    amount: number
    dueDate: string
  }>
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(params: SendPaymentReceiptParams) {
  const statusEmoji = params.status === 'PAGADA' ? '🟢' : '🟠'
  const statusText = params.status === 'PAGADA' ? 'PAGO COMPLETO' : 'PAGO PARCIAL'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; color: #111827; }
    .amount-highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .amount-big { font-size: 28px; font-weight: 700; color: #16a34a; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .status-pending { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
    .status-paid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Comprobante de Pago</h1>
      <p>Agente Bolelos — Centro Inteligente de Control Financiero</p>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Empresa</div>
        <div class="detail-row">
          <span class="detail-label">Nombre:</span>
          <span class="detail-value">${params.companyName}</span>
        </div>
        ${params.companyRnc ? `
        <div class="detail-row">
          <span class="detail-label">RNC:</span>
          <span class="detail-value">${params.companyRnc}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Factura</div>
        <div class="detail-row">
          <span class="detail-label">Número:</span>
          <span class="detail-value">#${params.invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Factura:</span>
          <span class="detail-value">RD$${params.invoiceTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div class="amount-highlight">
        <div style="color: #6b7280; margin-bottom: 5px;">Pago Realizado</div>
        <div class="amount-big">RD$${params.paymentAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
        <div style="margin-top: 10px;">
          <span class="status-badge ${params.status === 'PAGADA' ? 'status-paid' : 'status-pending'}">
            ${statusEmoji} ${statusText}
          </span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalles del Pago</div>
        <div class="detail-row">
          <span class="detail-label">Método:</span>
          <span class="detail-value">${params.paymentMethod === 'EFECTIVO' ? '💵 Efectivo' : '🏦 Transferencia'}</span>
        </div>
        ${params.bank ? `
        <div class="detail-row">
          <span class="detail-label">Banco:</span>
          <span class="detail-value">${params.bank}</span>
        </div>
        ` : ''}
        ${params.reference ? `
        <div class="detail-row">
          <span class="detail-label">Referencia:</span>
          <span class="detail-value">${params.reference}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Fecha:</span>
          <span class="detail-value">${params.paymentDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hora:</span>
          <span class="detail-value">${params.paymentTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Registrado por:</span>
          <span class="detail-value">${params.registeredBy}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pendiente:</span>
          <span class="detail-value" style="color: ${params.pendingAmount > 0 ? '#ea580c' : '#16a34a'};">
            RD$${params.pendingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Este comprobante fue generado automáticamente por Agente Bolelos.</p>
      <p>Centro Inteligente de Control Financiero v0.1.0</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Agente Bolelos <onboarding@resend.dev>',
      to: params.to,
      subject: `Comprobante de Pago — ${params.companyName} — Factura #${params.invoiceNumber}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

/**
 * Send payment reminder email
 */
export async function sendReminder(params: SendReminderParams) {
  const urgencyColor = params.daysUntilDue <= 0 ? '#dc2626' : params.daysUntilDue <= 3 ? '#ea580c' : '#2563eb'
  const urgencyText = params.daysUntilDue <= 0 ? 'VENCIDA' : params.daysUntilDue <= 0 ? 'Vence hoy' : `Vence en ${params.daysUntilDue} días`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: ${urgencyColor}; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; color: #111827; }
    .amount-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .amount-big { font-size: 24px; font-weight: 700; color: #d97706; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Recordatorio de Pago</h1>
      <p>${urgencyText}</p>
    </div>
    <div class="content">
      <div class="detail-row">
        <span class="detail-label">Empresa:</span>
        <span class="detail-value">${params.companyName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Factura:</span>
        <span class="detail-value">#${params.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vencimiento:</span>
        <span class="detail-value">${params.dueDate}</span>
      </div>
      <div class="amount-box">
        <div style="color: #92400e;">Monto Pendiente</div>
        <div class="amount-big">RD$${params.pendingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
    <div class="footer">
      <p>Agente Bolelos — Centro Inteligente de Control Financiero</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Agente Bolelos <onboarding@resend.dev>',
      to: params.to,
      subject: `Recordatorio: Factura #${params.invoiceNumber} — ${params.companyName}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

/**
 * Send daily financial summary email
 */
export async function sendDailySummary(params: SendDailySummaryParams) {
  const upcomingHtml = params.upcomingDue
    .map(
      (u) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${u.companyName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">#${u.invoiceNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">RD$${u.amount.toLocaleString('es-DO')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${u.dueDate}</td>
      </tr>
    `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f9fafb; padding: 10px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Resumen Diario</h1>
      <p>${params.date}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value" style="color: #2563eb;">RD$${params.totalInvoiced.toLocaleString('es-DO')}</div>
          <div class="stat-label">Total Facturado</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: #16a34a;">RD$${params.totalPaid.toLocaleString('es-DO')}</div>
          <div class="stat-label">Total Pagado</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: #ea580c;">RD$${params.pendingAmount.toLocaleString('es-DO')}</div>
          <div class="stat-label">Total Pendiente</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: #dc2626;">${params.overdueCount}</div>
          <div class="stat-label">Facturas Vencidas</div>
        </div>
      </div>

      ${params.upcomingDue.length > 0 ? `
      <h3 style="margin-top: 20px; font-size: 16px;">📅 Próximos Vencimientos</h3>
      <table>
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Factura</th>
            <th style="text-align: right;">Monto</th>
            <th>Vence</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingHtml}
        </tbody>
      </table>
      ` : ''}
    </div>
    <div class="footer">
      <p>Agente Bolelos — Centro Inteligente de Control Financiero</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Agente Bolelos <onboarding@resend.dev>',
      to: params.to,
      subject: `📊 Resumen Diario — ${params.date}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}
