// Utilitário global de envio WhatsApp via Evolution API (instância oficial TymerBook)
// Agnóstico de tenant: usa EVOLUTION_API_URL/KEY/INSTANCE_NAME do ambiente

type SendWhatsAppParams = {
  to: string
  message: string
}

// Formata número para padrão aceito (usa regra simples BR +55)
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('55') && cleaned.length >= 12) return cleaned
  if (cleaned.length >= 10 && cleaned.length <= 11) return `55${cleaned}`
  return cleaned
}

export async function sendWhatsAppMessage({ to, message }: SendWhatsAppParams): Promise<boolean> {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [GLOBAL-WHATSAPP] Variáveis de ambiente ausentes para Evolution API', {
          EVOLUTION_API_URL: EVOLUTION_API_URL ? '✅' : '❌',
          EVOLUTION_API_KEY: EVOLUTION_API_KEY ? '✅' : '❌',
          EVOLUTION_INSTANCE_NAME: EVOLUTION_INSTANCE_NAME ? '✅' : '❌',
        })
      }
      return false
    }

    const number = formatPhoneForWhatsApp(to)
    const payload = { number, text: message, delay: 1000 }
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 [GLOBAL-WHATSAPP] Enviando mensagem...', { to: number, url })
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      // Timeout de 15s
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(15000) : undefined,
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('❌ [GLOBAL-WHATSAPP] Falha na Evolution API', res.status, txt)
      return false
    }

    if (process.env.NODE_ENV === 'development') {
      const data = await res.json().catch(() => ({}))
      console.log('✅ [GLOBAL-WHATSAPP] Mensagem enviada', data)
    }
    return true
  } catch (err) {
    console.error('❌ [GLOBAL-WHATSAPP] Erro ao enviar mensagem:', err)
    return false
  }
}
