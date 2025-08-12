import { extractTimeFromDateObject } from './lib/timezone.js'

// Simular dados que estariam no banco (como o Prisma retorna)
const mockAppointment = {
  id: '1',
  dateTime: new Date('2025-08-12T21:00:00.000Z'), // UTC
  professionalId: 'prof1',
  duration: 30
}

console.log('🔍 TESTE DE CONVERSÃO:')
console.log('Dados originais do banco:', mockAppointment.dateTime)
console.log('ISO String:', mockAppointment.dateTime.toISOString())
console.log('Horário extraído:', extractTimeFromDateObject(mockAppointment.dateTime))

// Simular como seria criado o startOfDay na API
const date = '2025-08-12'
const [year, month, day] = date.split('-').map(Number)
const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

console.log('\n🔍 TESTE DE RANGE:')
console.log('Data pesquisada:', date)
console.log('Início do dia:', startOfDay)
console.log('Início do dia (ISO):', startOfDay.toISOString())
console.log('Fim do dia:', endOfDay)
console.log('Fim do dia (ISO):', endOfDay.toISOString())

// Verificar se o agendamento está no range
const appointmentUTC = mockAppointment.dateTime
console.log('\n🔍 VERIFICAÇÃO DE RANGE:')
console.log('Agendamento UTC:', appointmentUTC.toISOString())
console.log('Está >= início?', appointmentUTC >= startOfDay)
console.log('Está <= fim?', appointmentUTC <= endOfDay)
console.log('Está no range?', appointmentUTC >= startOfDay && appointmentUTC <= endOfDay)
