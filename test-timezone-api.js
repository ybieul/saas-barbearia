const { parseDate, toLocalISOString, extractTimeFromDateObject } = require('./lib/timezone.ts')

// Simular um agendamento às 21:00h
const testDate = new Date(2025, 7, 12, 21, 0, 0) // Agosto = mês 7 (0-indexed)
console.log('🕘 Data original do agendamento:', testDate)
console.log('🕘 ISO String:', testDate.toISOString())
console.log('🕘 Local ISO String:', toLocalISOString(testDate))

// Simular extração do horário
const extractedTime = extractTimeFromDateObject(testDate)
console.log('🕘 Horário extraído:', extractedTime)

// Simular consulta de data para 2025-08-12
const dateParam = '2025-08-12'
const [year, month, day] = dateParam.split('-').map(Number)

const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

console.log('\n🔍 Range de busca:')
console.log('Início do dia:', startOfDay)
console.log('Início do dia (ISO):', toLocalISOString(startOfDay))
console.log('Fim do dia:', endOfDay)
console.log('Fim do dia (ISO):', toLocalISOString(endOfDay))

// Verificar se o agendamento está dentro do range
const appointmentISO = toLocalISOString(testDate)
const startISO = toLocalISOString(startOfDay)
const endISO = toLocalISOString(endOfDay)

console.log('\n✅ Verificação de range:')
console.log('Agendamento:', appointmentISO)
console.log('Está >= início?', appointmentISO >= startISO)
console.log('Está <= fim?', appointmentISO <= endISO)
console.log('Está no range?', appointmentISO >= startISO && appointmentISO <= endISO)
