#!/usr/bin/env ts-node

/**
 * Script de teste para verificar a integração com Evolution API
 * Execute: npm run whatsapp:test
 */

import { sendWhatsAppMessage, checkEvolutionApiStatus, formatPhoneNumber } from '../lib/whatsapp'
import { config } from 'dotenv'

// Carregar variáveis de ambiente
config()

async function testEvolutionApi() {
  console.log('🧪 === TESTE DA INTEGRAÇÃO EVOLUTION API ===\n')
  
  // 1. Verificar configurações
  console.log('1. 📋 VERIFICANDO CONFIGURAÇÕES...')
  const evolutionApiUrl = process.env.EVOLUTION_API_URL
  const evolutionApiKey = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME
  
  console.log(`   URL: ${evolutionApiUrl || '❌ Não configurado'}`)
  console.log(`   Instance: ${evolutionInstance || '❌ Não configurado'}`)
  console.log(`   API Key: ${evolutionApiKey ? '✅ Configurado' : '❌ Não configurado'}\n`)
  
  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
    console.log('❌ ERRO: Configurações incompletas. Configure as variáveis:')
    console.log('   - EVOLUTION_API_URL')
    console.log('   - EVOLUTION_API_KEY')  
    console.log('   - EVOLUTION_INSTANCE_NAME')
    process.exit(1)
  }
  
  // 2. Verificar status da instância
  console.log('2. 🔗 VERIFICANDO CONEXÃO COM EVOLUTION API...')
  const apiStatus = await checkEvolutionApiStatus()
  
  if (!apiStatus.isConnected) {
    console.log(`❌ ERRO: Não foi possível conectar com a Evolution API`)
    console.log(`   Erro: ${apiStatus.error}`)
    process.exit(1)
  }
  
  console.log(`✅ Conectado com sucesso!`)
  console.log(`   Status da instância: ${apiStatus.instanceStatus}\n`)
  
  // 3. Teste de envio (apenas se telefone for fornecido)
  const testPhone = process.argv[2]
  
  if (testPhone) {
    console.log('3. 📱 ENVIANDO MENSAGEM DE TESTE...')
    console.log(`   Para: ${testPhone}`)
    
    const formattedPhone = formatPhoneNumber(testPhone)
    console.log(`   Formatado: ${formattedPhone}`)
    
    const testMessage = `🧪 *Teste Evolution API*

Olá! Esta é uma mensagem de teste do sistema SaaS Barbearia.

Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Instância: ${evolutionInstance}

✅ Se você recebeu esta mensagem, a integração está funcionando perfeitamente!`

    const success = await sendWhatsAppMessage({
      to: formattedPhone,
      message: testMessage,
      type: 'custom'
    })
    
    if (success) {
      console.log('✅ MENSAGEM ENVIADA COM SUCESSO!')
      console.log('   Verifique o WhatsApp do número informado.')
    } else {
      console.log('❌ FALHA AO ENVIAR MENSAGEM')
      console.log('   Verifique os logs acima para mais detalhes.')
    }
  } else {
    console.log('3. 📱 TESTE DE ENVIO PULADO')
    console.log('   Para testar envio, execute: npm run whatsapp:test 11999999999')
  }
  
  console.log('\n🎉 === TESTE CONCLUÍDO ===')
}

// Executar se chamado diretamente
if (require.main === module) {
  testEvolutionApi()
    .then(() => {
      console.log('\n✅ Teste finalizado com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro durante o teste:', error)
      process.exit(1)
    })
}

export { testEvolutionApi }
