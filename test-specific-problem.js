// Teste ESPECÍFICO baseado no relatório do usuário

console.log('=== SIMULAÇÃO EXATA DO PROBLEMA ===')
console.log('Usuário reportou: exceção 14:30-15:00 BRT bloqueia slots às 11:25 BRT')
console.log()

// Dados exatos do problema reportado
const userIntendedExceptionStart = '14:30 BRT' // O que o usuário queria
const problemSlotTime = '11:25 BRT'           // O que está sendo bloqueado

// 1. Como a exceção está sendo salva (problema)
const savedExceptionTime = new Date('2025-01-02T14:30:00.000Z') // toLocalISOString salvou assim

// 2. Slot que está sendo bloqueado incorretamente  
const blockedSlotStart = new Date('2025-01-02T14:25:00.000Z') // 11:25 BRT = 14:25 UTC
const blockedSlotEnd = new Date('2025-01-02T14:30:00.000Z')   // 11:30 BRT = 14:30 UTC

console.log('Situação atual no banco:')
console.log('Exceção salva como:', {
  iso: savedExceptionTime.toISOString(), 
  utcTime: `${savedExceptionTime.getUTCHours()}:${savedExceptionTime.getUTCMinutes().toString().padStart(2,'0')} UTC`,
  localTime: savedExceptionTime.toLocaleString('pt-BR'),
  localHour: `${savedExceptionTime.getHours()}:${savedExceptionTime.getMinutes().toString().padStart(2,'0')} BRT`
})

console.log('Slot sendo bloqueado:', {
  iso: `${blockedSlotStart.toISOString()} - ${blockedSlotEnd.toISOString()}`,
  utcTime: `${blockedSlotStart.getUTCHours()}:${blockedSlotStart.getUTCMinutes().toString().padStart(2,'0')} - ${blockedSlotEnd.getUTCHours()}:${blockedSlotEnd.getUTCMinutes().toString().padStart(2,'0')} UTC`,
  localTime: `${blockedSlotStart.toLocaleString('pt-BR')} - ${blockedSlotEnd.toLocaleString('pt-BR')}`,
  localHour: `${blockedSlotStart.getHours()}:${blockedSlotStart.getMinutes().toString().padStart(2,'0')} - ${blockedSlotEnd.getHours()}:${blockedSlotEnd.getMinutes().toString().padStart(2,'0')} BRT`
})

// 3. Verificar se há sobreposição com o algoritmo atual (que está causando o problema)
const exceptionEndTime = new Date(savedExceptionTime.getTime() + 30 * 60 * 1000) // +30min

// Algoritmo atual: usar .getHours() direto (mistura timezones)
const currentExceptionStartMinutes = savedExceptionTime.getHours() * 60 + savedExceptionTime.getMinutes()
const currentExceptionEndMinutes = exceptionEndTime.getHours() * 60 + exceptionEndTime.getMinutes()

const currentSlotStartMinutes = blockedSlotStart.getHours() * 60 + blockedSlotStart.getMinutes()
const currentSlotEndMinutes = blockedSlotEnd.getHours() * 60 + blockedSlotEnd.getMinutes()

const currentOverlap = currentSlotStartMinutes < currentExceptionEndMinutes && currentSlotEndMinutes > currentExceptionStartMinutes

console.log('\n=== ALGORITMO ATUAL (PROBLEMÁTICO) ===')
console.log('Usando .getHours() direto (mistura timezones):')
console.log('Exceção em minutos:', `${currentExceptionStartMinutes}-${currentExceptionEndMinutes} (${Math.floor(currentExceptionStartMinutes/60)}:${(currentExceptionStartMinutes%60).toString().padStart(2,'0')} - ${Math.floor(currentExceptionEndMinutes/60)}:${(currentExceptionEndMinutes%60).toString().padStart(2,'0')})`)
console.log('Slot em minutos:', `${currentSlotStartMinutes}-${currentSlotEndMinutes} (${Math.floor(currentSlotStartMinutes/60)}:${(currentSlotStartMinutes%60).toString().padStart(2,'0')} - ${Math.floor(currentSlotEndMinutes/60)}:${(currentSlotEndMinutes%60).toString().padStart(2,'0')})`)
console.log('Há sobreposição?', currentOverlap ? '❌ SIM (problema!)' : '✅ NÃO')

// 4. Nossa função de correção 
const adjustExceptionTimezone = (exceptionDate) => {
  const localHour = exceptionDate.getHours() 
  const utcHour = exceptionDate.getUTCHours()
  const brtOffset = 3
  
  if ((localHour + brtOffset) === utcHour) {
    return new Date(exceptionDate.getTime() - (brtOffset * 60 * 60 * 1000))
  }
  
  return exceptionDate
}

const correctedExceptionStart = adjustExceptionTimezone(savedExceptionTime)
const correctedExceptionEnd = new Date(correctedExceptionStart.getTime() + 30 * 60 * 1000)

// 5. Algoritmo CORRIGIDO
const correctedExceptionStartMinutes = correctedExceptionStart.getHours() * 60 + correctedExceptionStart.getMinutes()
const correctedExceptionEndMinutes = correctedExceptionEnd.getHours() * 60 + correctedExceptionEnd.getMinutes()

const correctedOverlap = currentSlotStartMinutes < correctedExceptionEndMinutes && currentSlotEndMinutes > correctedExceptionStartMinutes

console.log('\n=== ALGORITMO CORRIGIDO ===')
console.log('Exceção corrigida:', {
  original: savedExceptionTime.toISOString(),
  corrected: correctedExceptionStart.toISOString(),
  originalBRT: savedExceptionTime.toLocaleString('pt-BR'),
  correctedBRT: correctedExceptionStart.toLocaleString('pt-BR')
})
console.log('Exceção corrigida em minutos:', `${correctedExceptionStartMinutes}-${correctedExceptionEndMinutes} (${Math.floor(correctedExceptionStartMinutes/60)}:${(correctedExceptionStartMinutes%60).toString().padStart(2,'0')} - ${Math.floor(correctedExceptionEndMinutes/60)}:${(correctedExceptionEndMinutes%60).toString().padStart(2,'0')})`)
console.log('Slot em minutos:', `${currentSlotStartMinutes}-${currentSlotEndMinutes} (${Math.floor(currentSlotStartMinutes/60)}:${(currentSlotStartMinutes%60).toString().padStart(2,'0')} - ${Math.floor(currentSlotEndMinutes/60)}:${(currentSlotEndMinutes%60).toString().padStart(2,'0')})`)
console.log('Há sobreposição após correção?', correctedOverlap ? '❌ SIM' : '✅ NÃO')

// 6. Resultado
console.log('\n=== RESULTADO FINAL ===')
if (currentOverlap && !correctedOverlap) {
  console.log('🎉 CORREÇÃO FUNCIONOU!')
  console.log('✅ O slot às 11:25 BRT não será mais bloqueado incorretamente')
} else if (!currentOverlap) {
  console.log('🤔 NÃO CONSEGUI REPRODUZIR O PROBLEMA')
  console.log('O teste não mostrou sobreposição nem antes da correção')
} else {
  console.log('❌ CORREÇÃO NÃO FUNCIONOU')
  console.log('Ainda há sobreposição após a correção')
}
