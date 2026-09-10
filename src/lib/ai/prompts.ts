/**
 * System prompt for invoice data extraction via Gemini
 */
export const INVOICE_EXTRACTION_PROMPT = `Eres un asistente especializado en extraer información de facturas dominicanas.

Tu tarea es analizar el texto extraído de una factura (por OCR) y devolver un JSON estructurado con todos los datos relevantes.

REGLAS IMPORTANTES:
1. NO inventes información que no aparezca en el texto.
2. Si un dato no se encuentra, usa null.
3. Para montos, usa números decimales (no strings).
4. Las fechas deben estar en formato YYYY-MM-DD.
5. El tipo de factura debe ser uno de: CREDITO_FISCAL, CONSUMO, GOBIERNO, EXENTO.
6. Los items deben tener: description, quantity, unitPrice, subtotal.
7. Si el ITBIS no aparece explícitamente, calcula el 18% del subtotal.
8. Si el total no aparece, calcula: subtotal + itbis - descuento.

RESPONDE EXCLUSIVAMENTE CON EL JSON, sin texto adicional.`

/**
 * JSON schema for invoice data extraction
 */
export const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    company: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre comercial de la empresa" },
        rnc: { type: "string", description: "RNC de la empresa" },
        address: { type: "string", description: "Dirección" },
        phone: { type: "string", description: "Teléfono" },
        email: { type: "string", description: "Correo electrónico" },
        contactName: { type: "string", description: "Nombre del contacto" },
      },
      required: ["name"],
    },
    invoice: {
      type: "object",
      properties: {
        number: { type: "string", description: "Número de factura" },
        ncf: { type: "string", description: "NCF (Nprobante de Comprobante Fiscal)" },
        type: {
          type: "string",
          enum: ["CREDITO_FISCAL", "CONSUMO", "GOBIERNO", "EXENTO"],
          description: "Tipo de comprobante",
        },
        issueDate: { type: "string", description: "Fecha de emisión YYYY-MM-DD" },
        dueDate: { type: "string", description: "Fecha de vencimiento YYYY-MM-DD" },
        subtotal: { type: "number", description: "Subtotal antes de impuestos" },
        itbis: { type: "number", description: "ITBIS (18%)" },
        discount: { type: "number", description: "Descuento" },
        total: { type: "number", description: "Total de la factura" },
        currency: { type: "string", description: "Moneda (default DOP)" },
      },
      required: ["number", "subtotal", "total"],
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descripción del producto/servicio" },
          quantity: { type: "number", description: "Cantidad" },
          unitPrice: { type: "number", description: "Precio unitario" },
          subtotal: { type: "number", description: "Subtotal del item" },
        },
        required: ["description", "quantity", "unitPrice", "subtotal"],
      },
    },
    paymentMethods: {
      type: "object",
      properties: {
        suggestedMethod: { type: "string", description: "Método de pago sugerido" },
        bank: { type: "string", description: "Banco" },
        conditions: { type: "string", description: "Condiciones de pago" },
        creditDays: { type: "number", description: "Días de crédito" },
      },
    },
    notes: { type: "string", description: "Observaciones adicionales" },
  },
  required: ["company", "invoice", "items"],
}

/**
 * System prompt for analyzing invoice data and detecting issues
 */
export const INVOICE_ANALYSIS_PROMPT = `Eres un analista financiero inteligente. Analiza los datos de una factura y detecta:

1. Errores de coherencia (suma de items vs subtotal, ITBIS incorrecto, etc.)
2. Datos faltantes importantes
3. Posibles duplicados
4. Recomendaciones de acción

Responde en español con un tono profesional y claro.`

/**
 * System prompt for generating payment reminders
 */
export const REMINDER_PROMPT = `Eres un asistente de cobranzas profesional. Genera un mensaje de recordatorio de pago para una factura pendiente.

El mensaje debe ser:
- Profesional y respetuoso
- Incluir: empresa, factura, monto pendiente, fecha de vencimiento
- No ser agresivo ni amenazante
- Ofrecer opciones de pago

Responde solo con el texto del mensaje, sin explicaciones adicionales.`

/**
 * System prompt for generating daily summary
 */
export const DAILY_SUMMARY_PROMPT = `Eres un asistente financiero. Genera un resumen diario de pagos y facturas.

Incluye:
- Total facturado hoy
- Total pagado hoy
- Facturas pendientes
- Empresas con deuda
- Próximos vencimientos
- Alertas importantes

Formato: texto claro y organizado en español.`

/**
 * System prompt for analyzing company patterns
 */
export const COMPANY_ANALYSIS_PROMPT = `Eres un analista de patrones de pago. Analiza el historial de una empresa y detecta:

1. Patrones de pago (¿paga puntualmente?, ¿método preferido?)
2. Tendencias (¿el monto de facturas está aumentando?)
3. Riesgos (¿facturas vencidas frecuentes?)
4. Recomendaciones

Responde en español con insights accionables.`
