// Teste da função isTimeInPast corrigida
console.log('📅 Data atual:', new Date().toLocaleDateString('pt-BR'))
console.log('🕐 Hora atual:', new Date().toLocaleTimeString('pt-BR'))
console.log('')

const isTimeInPast = (date, time) => {
  try {
    const [year, month, day] = date.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    // Se é data futura, definitivamente não é passado
    if (selectedDate.getTime() > today.getTime()) {
      return false
    }
    
    // Se é data passada, definitivamente é passado
    if (selectedDate.getTime() < today.getTime()) {
      return true
    }
    
    // Se é hoje, verificar o horário
    const [hours, minutes] = time.split(':').map(Number)
    const slotTime = new Date()
    slotTime.setHours(hours, minutes, 0, 0)
    const now = new Date()
    
    return slotTime < now
  } catch (error) {
    console.error('Erro:', error)
    return false
  }
}

// Teste 1: Amanhã (deve ser false para todos os horários)
console.log('🟢 TESTE 1: Amanhã (2025-08-05)')
console.log('09:00 é passado?', isTimeInPast('2025-08-05', '09:00'))
console.log('15:00 é passado?', isTimeInPast('2025-08-05', '15:00'))
console.log('23:59 é passado?', isTimeInPast('2025-08-05', '23:59'))
console.log('')

// Teste 2: Ontem (deve ser true para todos os horários)
console.log('🔴 TESTE 2: Ontem (2025-08-03)')
console.log('09:00 é passado?', isTimeInPast('2025-08-03', '09:00'))
console.log('15:00 é passado?', isTimeInPast('2025-08-03', '15:00'))
console.log('23:59 é passado?', isTimeInPast('2025-08-03', '23:59'))
console.log('')

// Teste 3: Hoje (depende do horário atual)
const hoje = new Date().toISOString().split('T')[0]
console.log('🟡 TESTE 3: Hoje (' + hoje + ')')
console.log('06:00 é passado?', isTimeInPast(hoje, '06:00'))
console.log('23:00 é passado?', isTimeInPast(hoje, '23:00'))
console.log('23:59 é passado?', isTimeInPast(hoje, '23:59'))

console.log('')
console.log('✅ Se amanhã (05/08) aparece como false = CORRETO')
console.log('✅ Se ontem (03/08) aparece como true = CORRETO')
console.log('✅ Se hoje depende do horário atual = CORRETO')
