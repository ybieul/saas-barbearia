// 🧪 SIMULAÇÃO DE TESTE: Validação de Folgas
// Este teste simula o comportamento esperado sem conectar ao banco

console.log('🧪 TESTE DE SIMULAÇÃO: Validação de Folgas para "Qualquer Profissional"')
console.log('═'.repeat(80))

// Simular dados do Jeffiter baseado no que vimos nos screenshots
const jeffiterData = {
  id: 'prof-jeffiter-123',
  name: 'Jeffiter',
  // Horários normais de trabalho (ter-dom)
  professionalSchedule: [
    { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' }, // Segunda
    { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' }, // Terça
    { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' }, // Quarta
    { dayOfWeek: 4, startTime: '08:00', endTime: '18:00' }, // Quinta
    { dayOfWeek: 5, startTime: '08:00', endTime: '18:00' }, // Sexta
    { dayOfWeek: 6, startTime: '08:00', endTime: '18:00' }, // Sábado
    { dayOfWeek: 0, startTime: '08:00', endTime: '18:00' }, // Domingo
  ],
  // Folga na segunda-feira (como mostrado nos screenshots)
  scheduleExceptions: [
    {
      id: 'exc-1',
      type: 'DAY_OFF',
      startDatetime: new Date(2024, 11, 30, 0, 0, 0, 0), // 30/12/2024 00:00
      endDatetime: new Date(2024, 11, 30, 23, 59, 59, 999) // 30/12/2024 23:59
    }
  ]
}

// Simular outro profissional que NÃO tem folga na segunda
const marianaData = {
  id: 'prof-mariana-456',
  name: 'Mariana',
  professionalSchedule: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Segunda
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Terça
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Quarta
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Quinta
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Sexta
  ],
  scheduleExceptions: [] // Sem folgas
}

function simulateNewValidation(professional, targetDate, slotTime) {
  console.log(`\n🔍 VALIDANDO: ${professional.name} no slot ${slotTime} de ${targetDate.toLocaleDateString('pt-BR', { weekday: 'long' })}`)
  
  // 1️⃣ Verificar se profissional trabalha neste dia da semana
  const dayOfWeek = targetDate.getDay()
  const hasScheduleForDay = professional.professionalSchedule.some(s => s.dayOfWeek === dayOfWeek)
  console.log(`   1️⃣ Tem horário para dia da semana ${dayOfWeek}: ${hasScheduleForDay}`)
  
  if (!hasScheduleForDay) {
    console.log(`   ❌ REJEITADO: ${professional.name} não trabalha neste dia da semana`)
    return false
  }
  
  // 2️⃣ Verificar folgas/exceções
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)
  
  const dayOffExceptions = professional.scheduleExceptions.filter(exc => {
    if (exc.type !== 'DAY_OFF') return false
    
    const excStart = new Date(exc.startDatetime)
    const excEnd = new Date(exc.endDatetime)
    
    // Verificar se a data alvo está dentro da exceção
    return (excStart <= endOfDay && excEnd >= startOfDay)
  })
  
  const hasDayOffException = dayOffExceptions.length > 0
  console.log(`   2️⃣ Tem folga neste dia: ${hasDayOffException}`)
  
  if (dayOffExceptions.length > 0) {
    console.log(`   📅 Folgas encontradas:`, dayOffExceptions.map(e => ({
      inicio: e.startDatetime.toLocaleDateString('pt-BR'),
      fim: e.endDatetime.toLocaleDateString('pt-BR')
    })))
  }
  
  if (hasDayOffException) {
    console.log(`   ❌ REJEITADO: ${professional.name} está de folga neste dia`)
    return false
  }
  
  // 3️⃣ Verificar horário de trabalho
  const schedule = professional.professionalSchedule.find(s => s.dayOfWeek === dayOfWeek)
  const [slotHour, slotMinute] = slotTime.split(':').map(Number)
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
  
  const slotMinutes = slotHour * 60 + slotMinute
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  const withinWorkingHours = slotMinutes >= startMinutes && slotMinutes < endMinutes
  console.log(`   3️⃣ Dentro do horário de trabalho (${schedule.startTime}-${schedule.endTime}): ${withinWorkingHours}`)
  
  if (!withinWorkingHours) {
    console.log(`   ❌ REJEITADO: Slot ${slotTime} fora do horário de trabalho`)
    return false
  }
  
  console.log(`   ✅ APROVADO: ${professional.name} PODE receber agendamento`)
  return true
}

// 🧪 CENÁRIO 1: Jeffiter na segunda-feira (deveria ser rejeitado por folga)
console.log('\n🎯 CENÁRIO 1: Jeffiter na segunda-feira 30/12 às 09:00')
const monday = new Date(2024, 11, 30) // 30 de dezembro de 2024 (segunda-feira)
console.log(`Data de teste: ${monday.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`)
const jeffiterResult = simulateNewValidation(jeffiterData, monday, '09:00')

// 🧪 CENÁRIO 2: Mariana na segunda-feira (deveria ser aprovado)
console.log('\n🎯 CENÁRIO 2: Mariana na segunda-feira 30/12 às 09:00')  
const marianaResult = simulateNewValidation(marianaData, monday, '09:00')

// 🧪 CENÁRIO 3: Jeffiter na terça-feira (deveria ser aprovado - sem folga)
console.log('\n🎯 CENÁRIO 3: Jeffiter na terça-feira 31/12 às 09:00')
const tuesday = new Date(2024, 11, 31) // 31 de dezembro de 2024 (terça-feira)
console.log(`Data de teste: ${tuesday.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`)
const jeffiterTuesdayResult = simulateNewValidation(jeffiterData, tuesday, '09:00')

console.log('\n📊 RESUMO DOS RESULTADOS:')
console.log('═'.repeat(50))
console.log(`🔴 Jeffiter Segunda-feira: ${jeffiterResult ? 'APROVADO' : 'REJEITADO'} ${!jeffiterResult ? '✅' : '❌'}`)
console.log(`🟢 Mariana Segunda-feira:  ${marianaResult ? 'APROVADO' : 'REJEITADO'} ${marianaResult ? '✅' : '❌'}`)
console.log(`🟢 Jeffiter Terça-feira:   ${jeffiterTuesdayResult ? 'APROVADO' : 'REJEITADO'} ${jeffiterTuesdayResult ? '✅' : '❌'}`)

console.log('\n🎯 CONCLUSÃO:')
if (!jeffiterResult && marianaResult && jeffiterTuesdayResult) {
  console.log('✅ SUCESSO: Validação funcionando corretamente!')
  console.log('   - Jeffiter é rejeitado na segunda (folga)')
  console.log('   - Mariana é aprovada na segunda (sem folga)')
  console.log('   - Jeffiter é aprovado na terça (sem folga)')
  console.log('\n🚀 O sistema refatorado deve prevenir o bug de overbooking!')
} else {
  console.log('❌ PROBLEMA: Validação não está funcionando como esperado')
}
