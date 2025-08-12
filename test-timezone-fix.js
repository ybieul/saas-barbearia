#!/usr/bin/env node

/**
 * 🇧🇷 TESTE DE CORREÇÃO DO TIMEZONE
 * =================================
 * 
 * Este script testa se as correções de timezone estão funcionando corretamente
 * após a migração do Ubuntu e configuração do MySQL.
 */

console.log('🇧🇷 ===== TESTE DE TIMEZONE - PÓS MIGRAÇÃO =====\n')

// 1. Testar Node.js básico
console.log('1️⃣ TESTE NODE.JS BÁSICO:')
const testDate = new Date('2025-08-11T09:00:00.000')
console.log(`   Input: "2025-08-11T09:00:00.000"`)
console.log(`   Output: ${testDate.toString()}`)
console.log(`   Hours: ${testDate.getHours()}:${testDate.getMinutes().toString().padStart(2, '0')}`)
console.log(`   ISO: ${testDate.toISOString()}`)
console.log()

// 2. Testar com timezone explícito
console.log('2️⃣ TESTE COM TIMEZONE EXPLÍCITO:')
const testDateWithTz = new Date('2025-08-11T09:00:00.000-03:00')
console.log(`   Input: "2025-08-11T09:00:00.000-03:00"`)
console.log(`   Output: ${testDateWithTz.toString()}`)
console.log(`   Hours: ${testDateWithTz.getHours()}:${testDateWithTz.getMinutes().toString().padStart(2, '0')}`)
console.log(`   ISO: ${testDateWithTz.toISOString()}`)
console.log()

// 3. Testar funções do sistema (se disponível)
try {
  const { toBrazilISOString, parseDateTime, toLocalISOString } = require('./lib/timezone.ts')
  
  console.log('3️⃣ TESTE FUNÇÕES DO SISTEMA:')
  const systemDate = parseDateTime('2025-08-11', '09:00')
  console.log(`   parseDateTime('2025-08-11', '09:00'):`)
  console.log(`   Result: ${systemDate.toString()}`)
  console.log(`   toBrazilISOString: ${toBrazilISOString(systemDate)}`)
  console.log(`   toLocalISOString: ${toLocalISOString(systemDate)}`)
  console.log()
} catch (e) {
  console.log('3️⃣ FUNÇÕES DO SISTEMA: Não disponíveis em teste Node.js puro')
  console.log()
}

// 4. Resultado esperado
console.log('🎯 RESULTADO ESPERADO:')
console.log('   ✅ 09:00 deve aparecer como 09:00 (não 12:00)')
console.log('   ✅ Timezone brasileiro deve ser respeitado')
console.log('   ✅ MySQL deve receber horário correto')
console.log()

console.log('🚀 Para testar completamente, execute este script no servidor e')
console.log('   depois teste criando um agendamento no sistema.')
