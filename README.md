# Agente Bolelos — Centro Inteligente de Control Financiero

Sistema inteligente para recepción, análisis, seguimiento y pago de facturas.

## Características

- **OCR + IA**: Mistral OCR para extraer texto → Gemini para análisis estructurado
- **Gestión de facturas**: CRUD completo con estados automáticos
- **Pagos y comprobantes**: Registro de pagos con generación de comprobantes
- **Recordatorios**: Sistema de recordatorios con email vía Resend
- **Cerebro IA**: Memoria, patrones y análisis financiero inteligente
- **Reportes**: Generador de reportes de deudas en PDF

## Deploy en Railway

### Opción 1: Deploy automático (recomendado)

1. Crea una cuenta en [Railway](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente la configuración
4. ¡Listo! El sistema se despliega solo con la base de datos

### Opción 2: Deploy manual

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway init

# Configurar variables de entorno
railway variables set DATABASE_URL="file:./dev.db"
railway variables set MISTRAL_API_KEY="tu-clave"
railway variables set GEMINI_API_KEY="tu-clave"
railway variables set RESEND_API_KEY="tu-clave"

# Deploy
railway up
```

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de la base de datos (SQLite: `file:./dev.db`) |
| `MISTRAL_API_KEY` | API key de Mistral AI (OCR) |
| `GEMINI_API_KEY` | API key de Google Gemini |
| `RESEND_API_KEY` | API key de Resend (email) |

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma db push
npx prisma generate

# Poblar datos iniciales
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

## Estructura del proyecto

```
src/
├── app/
│   ├── api/           # API routes
│   ├── calendario/    # Vista de calendario
│   ├── cerebro/       # Panel de IA
│   ├── empresas/      # Gestión de empresas
│   ├── facturas/      # Gestión de facturas + OCR
│   ├── pagos/         # Gestión de pagos
│   ├── recordatorios/ # Sistema de recordatorios
│   └── reportes/      # Generador de reportes PDF
├── components/        # Componentes compartidos
├── lib/               # Utilidades y servicios
│   ├── ai/            # Mistral OCR + Gemini
│   └── notifications/ # Email vía Resend
└── img/               # Imágenes de facturas
```

## Tecnologías

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Prisma + SQLite
- **IA**: Mistral OCR + Google Gemini
- **Email**: Resend
- **Deploy**: Railway
