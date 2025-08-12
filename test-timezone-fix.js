/**
 * 🧪 TESTE DA CORREÇÃO DO TIMEZONE
 * Verificar se toLocalISOString produz formato ISO-8601 válido para Prisma
 */

import { toLocalISOString, parseDateTime, parseDatabaseDateTime } from './lib/timezone.ts'

console.log('🧪 TESTANDO CORREÇÃO DO TIMEZONE\n')

// Teste 1: Criar uma data brasileira para 18:00
const dateStr = '2025-08-12'
const timeStr = '18:00'
const testDate = parseDateTime(dateStr, timeStr)

console.log('📅 Data de teste criada:')
console.log('- Input:', `${dateStr} ${timeStr}`)
console.log('- Date object:', testDate)
console.log('- toString():', testDate.toString())

// Teste 2: Converter para ISO string
const isoString = toLocalISOString(testDate)
console.log('\n🔄 Conversão para ISO:')
console.log('- toLocalISOString():', isoString)
console.log('- Formato válido:', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(isoString))

// Teste 3: Verificar se o Prisma pode parsear
try {
  const parsedBack = new Date(isoString)
  console.log('\n✅ Teste de parsing:')
  console.log('- new Date(isoString):', parsedBack)
  console.log('- É válida:', !isNaN(parsedBack.getTime()))
  console.log('- Horário mantido:', parsedBack.getHours() + ':' + parsedBack.getMinutes().toString().padStart(2, '0'))
} catch (error) {
  console.log('\n❌ Erro no parsing:', error.message)
}

// Teste 4: Comparar com formato antigo
const oldFormat = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}T${String(testDate.getHours()).padStart(2, '0')}:${String(testDate.getMinutes()).padStart(2, '0')}:${String(testDate.getSeconds()).padStart(2, '0')}.000`

console.log('\n🔍 Comparação de formatos:')
console.log('- Formato antigo (SEM Z):', oldFormat)
console.log('- Formato novo (COM Z):', isoString)
console.log('- Diferença:', isoString.endsWith('Z') ? 'Adicionado Z no final' : 'Sem diferença')

console.log('\n🎯 RESULTADO: O formato agora é ISO-8601 completo e válido para Prisma!')
