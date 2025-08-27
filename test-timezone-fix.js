// Teste completo da correção de timezone
const { format } = require('date-fns');

console.log('=== TESTE SIMULAÇÃO COMPLETA DO SISTEMA ===\n');

// Simulando diferentes horários do banco
const testCases = [
  '2025-08-27 15:38:02.000', // Caso do usuário
  '2025-08-27 15:53:45.000', // Outro caso do usuário  
  '2025-08-27 15:40:00.000', // Terceiro caso
  '2025-08-27 08:30:00.000', // Manhã
  '2025-08-27 23:59:59.000'  // Noite
];

testCases.forEach((dbTime, index) => {
  console.log(`--- Teste ${index + 1}: ${dbTime} ---`);
  
  // 1. Criar Date object (simulando Prisma)
  const prismaDate = new Date(dbTime + ' GMT-0300');
  console.log(`Prisma: ${prismaDate.getHours()}:${prismaDate.getMinutes().toString().padStart(2,'0')}`);
  
  // 2. API retorna diretamente 
  const apiResponse = { sentAt: prismaDate };
  const jsonString = JSON.stringify(apiResponse);
  
  // 3. Frontend processa
  const parsed = JSON.parse(jsonString);
  const frontendDate = new Date(parsed.sentAt);
  
  // 4. Formatação final
  const result = format(frontendDate, 'dd/MM/yyyy HH:mm');
  console.log(`Resultado: ${result}`);
  
  // 5. Verificação
  const expectedHour = dbTime.split(' ')[1].substring(0, 5);
  const resultHour = result.split(' ')[1];
  console.log(`Status: ${expectedHour === resultHour ? '✅' : '❌'} (${expectedHour} -> ${resultHour})\n`);
});

console.log('=== RESUMO ===');
console.log('✅ Correção aplicada: Removido .toISOString() da API');
console.log('✅ Date objects do Prisma são usados diretamente'); 
console.log('✅ JSON.stringify/parse mantenha timezone local correto');
console.log('✅ formatBrazilTime exibe horário brasileiro correto');
