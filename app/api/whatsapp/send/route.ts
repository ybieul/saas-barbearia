import { NextRequest, NextResponse } from 'next/server'
import { formatPhoneNumber } from '@/lib/whatsapp'
import jwt from 'jsonwebtoken'

interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

function verifyToken(request: NextRequest): AuthUser {
  // Tentar obter token do header Authorization
  let token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Se não tiver no header, tentar obter do cookie
  if (!token) {
    token = request.cookies.get('token')?.value
  }
  
  // Se ainda não tiver, tentar obter do header x-auth-token
  if (!token) {
    token = request.headers.get('x-auth-token') || undefined
  }

  console.log('🔍 [API] Verificando token:', token ? '✅ Token encontrado' : '❌ Token não encontrado')

  if (!token) {
    throw new Error('Token não fornecido')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    
    if (!decoded.tenantId) {
      throw new Error('Token inválido: tenantId não encontrado')
    }

    console.log('✅ [API] Token válido para usuário:', decoded.email)

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    console.error('❌ [API] Erro ao verificar token:', error)
    throw new Error('Token inválido')
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação JWT
    const user = verifyToken(req)
    console.log('✅ [API] Usuário autenticado:', user.email)

    // Obter dados da requisição
    const { to, message, type = 'custom' } = await req.json()

    if (!to || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Número e mensagem são obrigatórios' 
      }, { status: 400 })
    }

    // Obter variáveis de ambiente
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    console.log('🔍 [API] Verificando variáveis de ambiente:')
    console.log('🔍 EVOLUTION_API_URL:', evolutionURL ? '✅ Definida' : '❌ Undefined')
    console.log('🔍 EVOLUTION_API_KEY:', evolutionKey ? '✅ Definida' : '❌ Undefined')
    console.log('🔍 EVOLUTION_INSTANCE_NAME:', instanceName ? '✅ Definida' : '❌ Undefined')

    if (!evolutionURL || !evolutionKey || !instanceName) {
      return NextResponse.json({
        success: false,
        error: 'Evolution API não configurada no servidor'
      }, { status: 500 })
    }

    console.log(`📤 [API] Enviando mensagem WhatsApp...`)
    console.log(`📱 Para: ${to}`)
    console.log(`📝 Tipo: ${type}`)

    // Formatar número para o padrão internacional
    const formattedNumber = formatPhoneNumber(to)
    
    // Endpoint da Evolution API para envio de mensagem
    const apiUrl = `${evolutionURL}/message/sendText/${instanceName}`
    
    const requestBody = {
      number: formattedNumber,
      text: message,
      delay: 1000
    }

    console.log(`🔗 [API] URL: ${apiUrl}`)
    console.log(`📞 [API] Número formatado: ${formattedNumber}`)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      // Timeout de 15 segundos
      signal: AbortSignal.timeout(15000)
    })

    const responseData = await response.json()

    if (response.ok) {
      console.log('✅ [API] Mensagem WhatsApp enviada com sucesso!')
      console.log('📋 [API] Resposta:', responseData)
      
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: responseData
      })
    } else {
      console.error('❌ [API] Falha ao enviar mensagem')
      console.error('📋 Status:', response.status)
      console.error('📋 Resposta:', responseData)
      
      return NextResponse.json({
        success: false,
        error: `Erro na Evolution API: ${responseData.message || 'Erro desconhecido'}`,
        details: responseData
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [API] Erro ao processar requisição:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
