import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// POST - Enviar promoção para clientes inativos
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { clientIds, templateId, message } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { message: 'Lista de clientes é obrigatória' },
        { status: 400 }
      )
    }

    if (!templateId && !message) {
      return NextResponse.json(
        { message: 'Template ou mensagem é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se todos os clientes pertencem ao tenant
    const clients = await prisma.endUser.findMany({
      where: {
        id: { in: clientIds },
        tenantId: user.tenantId
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    })

    if (clients.length !== clientIds.length) {
      return NextResponse.json(
        { message: 'Alguns clientes não foram encontrados' },
        { status: 400 }
      )
    }

    console.log(`📤 [API] Enviando promoções para ${clients.length} clientes...`)
    
    // Configurar Evolution API
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionURL || !evolutionKey || !instanceName) {
      return NextResponse.json({
        message: 'Evolution API não configurada no servidor'
      }, { status: 500 })
    }

    // Função para formatar telefone
    const formatPhoneNumber = (phone: string): string => {
      const cleaned = phone.replace(/\D/g, '')
      if (cleaned.length === 11 && cleaned.startsWith('11')) {
        return `55${cleaned}@s.whatsapp.net`
      } else if (cleaned.length === 10 || cleaned.length === 11) {
        return `55${cleaned}@s.whatsapp.net`
      }
      return `${cleaned}@s.whatsapp.net`
    }

    // Enviar mensagens via Evolution API
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const client of clients) {
      try {
        const formattedNumber = formatPhoneNumber(client.phone)
        const apiUrl = `${evolutionURL}/message/sendText/${instanceName}`
        
        const requestBody = {
          number: formattedNumber,
          text: message,
          delay: 1000
        }

        console.log(`📱 [API] Enviando para ${client.name} (${formattedNumber})`)

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(15000)
        })

        const responseData = await response.json()

        if (response.ok) {
          successCount++
          console.log(`✅ [API] Mensagem enviada com sucesso para ${client.name}`)
          
          // Registrar sucesso no banco
          await prisma.whatsAppLog.create({
            data: {
              tenantId: user.tenantId,
              to: client.phone,
              type: 'PROMOTION',
              message: message,
              status: 'SENT',
              sentAt: new Date()
            }
          })

          results.push({
            clientId: client.id,
            clientName: client.name,
            phone: client.phone,
            status: 'success',
            data: responseData
          })
        } else {
          errorCount++
          console.error(`❌ [API] Erro ao enviar para ${client.name}:`, responseData)
          
          // Registrar erro no banco
          await prisma.whatsAppLog.create({
            data: {
              tenantId: user.tenantId,
              to: client.phone,
              type: 'PROMOTION',
              message: message,
              status: 'FAILED',
              sentAt: new Date()
            }
          })

          results.push({
            clientId: client.id,
            clientName: client.name,
            phone: client.phone,
            status: 'error',
            error: responseData.message || 'Erro desconhecido'
          })
        }

        // Delay entre envios para não sobrecarregar
        if (clients.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        errorCount++
        console.error(`❌ [API] Erro ao processar ${client.name}:`, error)
        
        results.push({
          clientId: client.id,
          clientName: client.name,
          phone: client.phone,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    return NextResponse.json({ 
      message: `Promoções processadas: ${successCount} enviadas, ${errorCount} falharam`,
      sentCount: successCount,
      errorCount: errorCount,
      totalCount: clients.length,
      results: results
    })
  } catch (error) {
    console.error('Erro ao enviar promoções:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
