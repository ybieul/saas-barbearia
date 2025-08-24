const { PrismaClient } = require('@prisma/client')

// Usar banco de produção para o teste
process.env.DATABASE_URL = "mysql://u102726947_agenda:Mz6$FIx63|>@srv1001.hstgr.io:3306/u102726947_agenda"

console.log('DATABASE_URL carregada:', process.env.DATABASE_URL ? '✅' : '❌')

async function testFolgaScenario() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧪 TESTE: Verificando cenário de folga do Jeffiter na segunda-feira')
    
    // 1. Buscar o Jeffiter
    const jeffiter = await prisma.professional.findFirst({
      where: { 
        name: { contains: 'Jeffiter' }
      },
      include: {
        professionalSchedule: true,
        scheduleExceptions: true
      }
    })
    
    if (!jeffiter) {
      console.log('❌ Profissional Jeffiter não encontrado')
      return
    }
    
    console.log(`✅ Jeffiter encontrado (ID: ${jeffiter.id})`)
    
    // 2. Verificar se tem horário de trabalho na segunda-feira (dayOfWeek = 1)
    const mondaySchedule = jeffiter.professionalSchedule.filter(s => s.dayOfWeek === 1)
    console.log('📅 Horários na segunda-feira:', mondaySchedule)
    
    // 3. Verificar se tem folga na segunda-feira
    const mondayException = jeffiter.scheduleExceptions.filter(exc => 
      exc.type === 'DAY_OFF' && 
      exc.startDatetime.getDay() === 1 // Segunda-feira
    )
    console.log('🚫 Exceções (folgas) na segunda-feira:', mondayException)
    
    // 4. Testar data específica: próxima segunda-feira
    const nextMonday = new Date()
    const daysUntilMonday = (1 + 7 - nextMonday.getDay()) % 7 || 7
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)
    
    console.log(`📅 Testando data: ${nextMonday.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`)
    
    // 5. Simular a validação que foi implementada
    console.log('\n🔍 SIMULANDO VALIDAÇÃO REFATORADA:')
    
    // Passo 1: Verificar se profissional trabalha neste dia da semana
    const dayOfWeek = nextMonday.getDay()
    const hasScheduleForDay = jeffiter.professionalSchedule.some(s => s.dayOfWeek === dayOfWeek)
    console.log(`1️⃣ Tem horário para dia ${dayOfWeek} (segunda): ${hasScheduleForDay}`)
    
    // Passo 2: Verificar exceções (folgas)
    const startOfDay = new Date(nextMonday)
    const endOfDay = new Date(nextMonday)
    endOfDay.setHours(23, 59, 59, 999)
    
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        professionalId: jeffiter.id,
        type: 'DAY_OFF',
        OR: [
          {
            startDatetime: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          {
            AND: [
              { startDatetime: { lte: startOfDay } },
              { endDatetime: { gte: endOfDay } }
            ]
          }
        ]
      }
    })
    
    const hasDayOffException = exceptions.length > 0
    console.log(`2️⃣ Tem folga neste dia: ${hasDayOffException}`)
    console.log('   Exceções encontradas:', exceptions.map(e => ({
      tipo: e.type,
      inicio: e.startDatetime.toLocaleDateString('pt-BR'),
      fim: e.endDatetime?.toLocaleDateString('pt-BR')
    })))
    
    // Resultado final
    const shouldBeAvailable = hasScheduleForDay && !hasDayOffException
    console.log(`\n🎯 RESULTADO: Jeffiter ${shouldBeAvailable ? 'PODE' : 'NÃO PODE'} receber agendamentos na segunda-feira`)
    
    if (!shouldBeAvailable) {
      console.log('✅ CORRETO: Sistema deve EXCLUIR Jeffiter da lista "Qualquer profissional"')
    } else {
      console.log('❌ ATENÇÃO: Sistema permitiria agendamento - verificar configuração de folga')
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFolgaScenario()
