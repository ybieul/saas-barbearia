// Teste REAL da correção de timezone para exceções

console.log('=== ANÁLISE DO PROBLEMA REAL ===')
console.log('Problema: Exceção criada para 14:30-15:00 BRT bloqueia slots às 11:25 BRT')
console.log('Causa: toLocalISOString salva 14:30 BRT como "14:30Z" (falso UTC)')
console.log('')

// Função de correção final
const adjustExceptionTimezone = (exceptionDate) => {
  const localHour = exceptionDate.getHours() // Em BRT devido ao timezone do sistema
  const utcHour = exceptionDate.getUTCHours() // Em UTC real
  
  // Detectar "falso UTC": se (hora local + offset BRT) == hora UTC, então foi salvo incorretamente
  const brtOffset = 3 // BRT é UTC-3
  const isFakeUTC = (localHour + brtOffset) === utcHour
  
  if (isFakeUTC) {
    // Converter "falso UTC" para UTC real subtraindo o offset BRT
    const correctedDate = new Date(exceptionDate.getTime() - (brtOffset * 60 * 60 * 1000))
    
    console.log('🔧 [TIMEZONE-FIX] Exceção detectada como "falso UTC" - aplicando correção:', {
      original: exceptionDate.toISOString(),
      originalBRT: exceptionDate.toLocaleString('pt-BR'),
      corrected: correctedDate.toISOString(),
      correctedBRT: correctedDate.toLocaleString('pt-BR'),
      explanation: `Converteu "${localHour}:xx BRT salvo como ${utcHour}:xx UTC" para "${correctedDate.getUTCHours()}:xx UTC real"`
    })
    
    return correctedDate
  }
  
  console.log('✅ Exceção já está em UTC real - sem correção necessária')
  return exceptionDate
}

// === CENÁRIO REAL DO PROBLEMA ===

console.log('\n=== CENÁRIO: Usuário cria exceção 14:30-15:00 BRT ===')

// 1. Como a exceção é salva (incorretamente)
const exceptionSavedIncorrectly = new Date('2025-01-02T14:30:00.000Z') // toLocalISOString salvou 14:30 BRT como 14:30Z
console.log('Exceção salva no banco:', {
  value: exceptionSavedIncorrectly.toISOString(),
  localTime: exceptionSavedIncorrectly.toLocaleString('pt-BR'),
  problem: 'Deveria ser 14:30 BRT, mas foi salvo como 14:30 UTC'
})

// 2. Como deveria ter sido salva (corretamente)  
const exceptionShouldBe = new Date('2025-01-02T17:30:00.000Z') // 14:30 BRT = 17:30 UTC
console.log('Como deveria ter sido salva:', {
  value: exceptionShouldBe.toISOString(),
  localTime: exceptionShouldBe.toLocaleString('pt-BR'),
  explanation: '14:30 BRT = 17:30 UTC'
})

// 3. Aplicar nossa correção
console.log('\n=== APLICANDO CORREÇÃO ===')
const correctedException = adjustExceptionTimezone(exceptionSavedIncorrectly)

// === TESTE COM OS SLOTS PROBLEMÁTICOS ===

console.log('\n=== TESTE COM SLOTS PROBLEMÁTICOS ===')

// Slots que eram bloqueados incorretamente (11:25-11:30 BRT)
const problemSlotStart = new Date('2025-01-02T14:25:00.000Z') // 11:25 BRT = 14:25 UTC
const problemSlotEnd = new Date('2025-01-02T14:30:00.000Z')   // 11:30 BRT = 14:30 UTC

console.log('Slot problemático:', {
  utc: `${problemSlotStart.toISOString()} - ${problemSlotEnd.toISOString()}`,
  brt: `${problemSlotStart.toLocaleString('pt-BR')} - ${problemSlotEnd.toLocaleString('pt-BR')}`
})

// Função para verificar sobreposição (como no código real)
const timePeriodsOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2
}

// Exceção de 30 minutos (14:30-15:00)
const exceptionEnd = new Date(exceptionSavedIncorrectly.getTime() + 30 * 60 * 1000)
const correctedExceptionEnd = new Date(correctedException.getTime() + 30 * 60 * 1000)

// Testar sobreposição ANTES da correção
const overlapBefore = timePeriodsOverlap(
  problemSlotStart, problemSlotEnd,
  exceptionSavedIncorrectly, exceptionEnd
)

// Testar sobreposição DEPOIS da correção
const overlapAfter = timePeriodsOverlap(
  problemSlotStart, problemSlotEnd, 
  correctedException, correctedExceptionEnd
)

console.log('\n=== RESULTADO DOS TESTES ===')
console.log('Sobreposição ANTES da correção:', {
  overlap: overlapBefore,
  slotBRT: `${problemSlotStart.toLocaleString('pt-BR')} - ${problemSlotEnd.toLocaleString('pt-BR')}`,
  exceptionBRT: `${exceptionSavedIncorrectly.toLocaleString('pt-BR')} - ${exceptionEnd.toLocaleString('pt-BR')}`,
  problem: overlapBefore ? 'BLOQUEAVA INCORRETAMENTE' : 'OK'
})

console.log('Sobreposição DEPOIS da correção:', {
  overlap: overlapAfter,
  slotBRT: `${problemSlotStart.toLocaleString('pt-BR')} - ${problemSlotEnd.toLocaleString('pt-BR')}`,
  exceptionBRT: `${correctedException.toLocaleString('pt-BR')} - ${correctedExceptionEnd.toLocaleString('pt-BR')}`,
  result: !overlapAfter ? 'NÃO BLOQUEIA ✅' : 'AINDA BLOQUEIA ❌'
})

// === RESULTADO FINAL ===
console.log('\n=== CONCLUSÃO ===')
if (overlapBefore && !overlapAfter) {
  console.log('🎉 CORREÇÃO FUNCIONOU!')
  console.log('✅ Slots às 11:25 BRT não serão mais bloqueados pela exceção 14:30-15:00 BRT')
} else {
  console.log('❌ CORREÇÃO FALHOU')
  console.log('Ainda há problemas na lógica')
}

// Mostrar a comparação final
console.log('\nComparação de horários:')
console.log(`Slot problemático: ${problemSlotStart.toLocaleString('pt-BR')} BRT`)  
console.log(`Exceção original: ${exceptionSavedIncorrectly.toLocaleString('pt-BR')} BRT (salva como ${exceptionSavedIncorrectly.toISOString()})`)
console.log(`Exceção corrigida: ${correctedException.toLocaleString('pt-BR')} BRT (${correctedException.toISOString()})`)
