// Teste da nova abordagem - valores numéricos puros
const { format } = require('date-fns');

console.log('=== TESTE NOVA ABORDAGEM - VALORES NUMÉRICOS PUROS ===\n');

// Simulando horário do banco: 2025-08-27 16:14:08.000
const dbDateTime = '2025-08-27 16:14:08.000';
console.log('1. Banco de dados:', dbDateTime);

// Simulando Date object do Prisma  
const prismaDate = new Date(dbDateTime + ' GMT-0300');
console.log('2. Prisma Date:', prismaDate.toString());
console.log('   - getHours():', prismaDate.getHours());

// Nova abordagem: extrair valores numéricos
const dateValues = {
  year: prismaDate.getFullYear(),
  month: prismaDate.getMonth(),
  day: prismaDate.getDate(),
  hours: prismaDate.getHours(),
  minutes: prismaDate.getMinutes(),
  seconds: prismaDate.getSeconds()
};

console.log('3. Valores numéricos extraídos:', dateValues);

// API retorna valores numéricos (via JSON.stringify)
const apiResponse = { sentAt: dateValues };
const jsonString = JSON.stringify(apiResponse);
console.log('4. JSON da API:', jsonString);

// Frontend reconstrói Date
const parsed = JSON.parse(jsonString);
const frontendDate = new Date(
  parsed.sentAt.year,
  parsed.sentAt.month,
  parsed.sentAt.day,
  parsed.sentAt.hours,
  parsed.sentAt.minutes,
  parsed.sentAt.seconds
);

console.log('5. Date reconstruído no frontend:', frontendDate.toString());
console.log('   - getHours():', frontendDate.getHours());

// Formatação final
const result = format(frontendDate, 'dd/MM/yyyy HH:mm');
console.log('6. Resultado final formatado:', result);

// Verificação
const expectedHour = dbDateTime.split(' ')[1].substring(0, 5);
const resultHour = result.split(' ')[1];
console.log('\n=== VERIFICAÇÃO ===');
console.log('Banco esperado:', dbDateTime.split(' ')[1].substring(0, 5));
console.log('Resultado obtido:', resultHour);
console.log('Status:', expectedHour === resultHour ? '✅ PERFEITO!' : '❌ AINDA COM PROBLEMA');
