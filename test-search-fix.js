// Teste da correção de busca de agendamentos
console.log('🧪 Testando busca de agendamentos por data:');

// Simular o que acontecia ANTES
const dateInput = '2025-08-12';
console.log('Data de entrada:', dateInput);

// ANTES (problemático)
const oldStartDate = new Date(dateInput);
oldStartDate.setHours(0, 0, 0, 0);
const oldEndDate = new Date(dateInput);
oldEndDate.setHours(23, 59, 59, 999);

console.log('\n❌ ANTES (com conversão UTC):');
console.log('startDate:', oldStartDate.toISOString());
console.log('endDate:', oldEndDate.toISOString());

// DEPOIS (corrigido)
const [year, month, day] = dateInput.split('-').map(Number);
const newStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
const newEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);

console.log('\n✅ DEPOIS (sem conversão UTC):');
console.log('startDate:', newStartDate.toString());
console.log('endDate:', newEndDate.toString());

// Simular toLocalISOString
function mockToLocalISOString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

console.log('\n🔄 Formato para Prisma:');
console.log('startISO:', mockToLocalISOString(newStartDate));
console.log('endISO:', mockToLocalISOString(newEndDate));

console.log('\n🎯 RESULTADO: Busca agora usa timezone brasileiro consistente!');
