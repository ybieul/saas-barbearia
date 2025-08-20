// Teste da função de correção de timezone para exceções

// Simular dados do problema real
const originalExceptionDate = new Date('2025-01-02T14:30:00.000Z') // "Falso UTC" - 14:30 BRT salvo como UTC

console.log('=== TESTE DA CORREÇÃO DE TIMEZONE ===')

// Função de correção CORRIGIDA
const adjustExceptionTimezone = (exceptionDate) => {
  // A heurística correta: se o horário mostrado localmente (BRT) + 3h == UTC, 
  // então foi salvo como "falso UTC"
  
  const localHour = exceptionDate.getHours() // Hora em BRT devido ao timezone do sistema
  const utcHour = exceptionDate.getUTCHours() // Hora em UTC real
  
  console.log(`🔍 Analisando exceção:`, {
    original: exceptionDate.toISOString(),
    localHour: localHour,  // Hora mostrada em BRT
    utcHour: utcHour,      // Hora em UTC 
    localPlus3: localHour + 3, // Se igual ao UTC, então é "falso UTC"
    isFakeUTC: (localHour + 3) === utcHour
  })
  
  // Se (hora local + 3) == hora UTC, então foi salvo como "falso UTC"
  // Exemplo: 14:30 BRT salvo como 14:30Z apareceria como:
  // - Local: 11h (14h - 3h offset)
  // - UTC: 14h
  // - Test: 11 + 3 = 14 ✓ (é falso UTC)
  if ((localHour + 3) === utcHour) {
    // NÃO aplicar correção! O problema é o inverso.
    // Se 14:30 BRT foi salvo como 14:30Z, então precisa SUBTRAIR 3h para virar 11:30Z
    const correctedDate = new Date(exceptionDate.getTime() - (3 * 60 * 60 * 1000))
    
    console.log('🔧 [TIMEZONE-FIX] Correção aplicada:', {
      original: exceptionDate.toISOString(),
      corrected: correctedDate.toISOString(),
      originalLocal: exceptionDate.toLocaleString('pt-BR'),
      correctedLocal: correctedDate.toLocaleString('pt-BR'),
      offsetApplied: '-3 hours (para converter falso UTC para UTC real)'
    })
    
    return correctedDate
  }
  
  console.log('✅ Data já está em UTC real, sem correção necessária')
  return exceptionDate
}

// Teste 1: Exceção problemática (14:30 BRT salva como "falso UTC" 14:30Z)
console.log('\n=== TESTE 1: Exceção problemática ===')
const exceptionFalseUTC = new Date('2025-01-02T14:30:00.000Z') // Esta foi salva incorretamente
const correctedResult1 = adjustExceptionTimezone(exceptionFalseUTC)

// Teste 2: Exceção já correta (seria 17:30 UTC se fosse salva corretamente)
console.log('\n=== TESTE 2: Como seria se estivesse correto ===')
const exceptionRealUTC = new Date('2025-01-02T17:30:00.000Z') // 14:30 BRT = 17:30 UTC
const correctedResult2 = adjustExceptionTimezone(exceptionRealUTC)

// Teste 3: Verificar impacto nos horários
console.log('\n=== TESTE 3: Verificar impacto nos slots ===')

// Slots que estavam sendo bloqueados incorretamente (11:25-11:30)
const problemSlotStart = new Date('2025-01-02T14:25:00.000Z') // 11:25 BRT em UTC
const problemSlotEnd = new Date('2025-01-02T14:30:00.000Z')   // 11:30 BRT em UTC

// Verificar sobreposição com exceção original (incorreta)
const overlapWithOriginal = (problemSlotStart < new Date('2025-01-02T14:30:00.000Z') && 
                           problemSlotEnd > new Date('2025-01-02T14:30:00.000Z'))

// Verificar sobreposição com exceção corrigida  
const overlapWithCorrected = (problemSlotStart < correctedResult1 && 
                            problemSlotEnd > correctedResult1)

console.log('Análise de sobreposição:', {
  problemSlot: `${problemSlotStart.toISOString()} - ${problemSlotEnd.toISOString()}`,
  problemSlotLocal: `${problemSlotStart.toLocaleString('pt-BR')} - ${problemSlotEnd.toLocaleString('pt-BR')}`,
  
  originalException: exceptionFalseUTC.toISOString(),
  originalExceptionLocal: exceptionFalseUTC.toLocaleString('pt-BR'),
  overlapWithOriginal,
  
  correctedException: correctedResult1.toISOString(),
  correctedExceptionLocal: correctedResult1.toLocaleString('pt-BR'),
  overlapWithCorrected,
  
  fixed: !overlapWithCorrected && overlapWithOriginal
})

console.log('\n=== RESULTADO ===')
console.log(`✅ Correção ${overlapWithOriginal && !overlapWithCorrected ? 'FUNCIONOU' : 'FALHOU'}!`)
if (overlapWithOriginal && !overlapWithCorrected) {
  console.log('👉 Agora o slot 11:25-11:30 BRT NÃO será bloqueado pela exceção 14:30-15:00 BRT')
} else {
  console.log('❌ Ainda há problema na lógica de correção')
}
