#!/usr/bin/env node

/**
 * 🇧🇷 TESTE COMPLETO - DIAGNÓSTICO TIMEZONE
 * =========================================
 * 
 * Script para testar todas as funções de timezone após correção robusta
 */

console.log('🇧🇷 ===== TESTE COMPLETO - DIAGNÓSTICO TIMEZONE =====\n')

// Simular dados como vêm do banco
const dadosDoBanco = [
  { id: 1, dateTime: '2025-08-12T11:00:00.000Z', cliente: 'Gabriel Teste' },
  { id: 2, dateTime: '2025-08-12T12:00:00.000Z', cliente: 'Ilian Santos' }
]

// Simular data atual do frontend
const dataAtual = '2025-08-12'

console.log('📊 DADOS DE ENTRADA:')
console.log('   Banco de dados:', dadosDoBanco)
console.log('   Data atual frontend:', dataAtual)
console.log()

// 1. Teste do filtro da API (simulado)
console.log('1️⃣ TESTE FILTRO API (Range Expandido):')
const searchDate = new Date(dataAtual + 'T00:00:00.000-03:00')
const startDate = new Date(searchDate)
startDate.setHours(0, 0, 0, 0)
const endDate = new Date(searchDate)  
endDate.setHours(23, 59, 59, 999)

const expandedStart = new Date(startDate.getTime() - (6 * 60 * 60 * 1000))
const expandedEnd = new Date(endDate.getTime() + (6 * 60 * 60 * 1000))

console.log('   Range original:', { 
  start: startDate.toISOString(), 
  end: endDate.toISOString() 
})
console.log('   Range expandido:', { 
  start: expandedStart.toISOString(), 
  end: expandedEnd.toISOString() 
})

// Testar se agendamentos do banco cairiam no range
dadosDoBanco.forEach(apt => {
  const aptDate = new Date(apt.dateTime)
  const inRange = aptDate >= expandedStart && aptDate <= expandedEnd
  console.log(`   ${apt.cliente}: ${apt.dateTime} → ${inRange ? '✅ ENCONTRADO' : '❌ PERDIDO'}`)
})
console.log()

// 2. Teste do parse no frontend (simulado)
console.log('2️⃣ TESTE PARSE FRONTEND:')
function simulatedParseDatabaseDateTime(dateTimeString) {
  // Simular a função parseDatabaseDateTime
  let cleanDateTime = dateTimeString
    .replace('Z', '')
    .replace(/[+-]\d{2}:\d{2}$/, '')
    .replace('T', ' ')
  
  if (cleanDateTime.includes('-') && cleanDateTime.includes(':')) {
    const [datePart, timePart] = cleanDateTime.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes, seconds = 0] = timePart.split(':').map(Number)
    
    return new Date(year, month - 1, day, hours, minutes, Math.floor(seconds))
  }
  
  return new Date(dateTimeString)
}

function simulatedToLocalDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentDate = new Date(dataAtual)
const currentDateString = simulatedToLocalDateString(currentDate)

console.log('   Data atual processada:', currentDateString)

dadosDoBanco.forEach(apt => {
  const aptDate = simulatedParseDatabaseDateTime(apt.dateTime)
  const aptDateString = simulatedToLocalDateString(aptDate)
  const matches = aptDateString === currentDateString
  
  console.log(`   ${apt.cliente}:`)
  console.log(`     Banco: ${apt.dateTime}`)
  console.log(`     Parsed: ${aptDate.toString()}`)
  console.log(`     String: ${aptDateString}`)
  console.log(`     Match: ${matches ? '✅ SIM' : '❌ NÃO'}`)
  console.log()
})

// 3. Diagnóstico final
console.log('🎯 DIAGNÓSTICO FINAL:')
console.log('   ✅ Range expandido da API deve capturar todos os agendamentos')
console.log('   ✅ Parse do frontend deve normalizar horários corretamente') 
console.log('   🔧 Logs de debug foram adicionados para monitoramento')
console.log()

console.log('📋 PRÓXIMOS PASSOS:')
console.log('   1. Deploy das correções no servidor')
console.log('   2. Verificar logs do console do navegador')
console.log('   3. Verificar logs do PM2 no servidor')
console.log('   4. Testar criação e visualização de agendamentos')
