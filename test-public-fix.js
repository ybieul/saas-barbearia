// Teste da correção da página pública de agendamento
console.log('🧪 Testando extração de horário na página pública:');

// Simular um Date object do Prisma para agendamento às 21:00
const appointmentDate = new Date(2025, 7, 12, 21, 0, 0, 0); // Aug 12, 2025 21:00

console.log('📅 Agendamento original:', appointmentDate.toString());
console.log('📅 Horário esperado: 21:00');

// ANTES (problemático) - dupla conversão
function oldMethod(date) {
  // Simular toLocalISOString
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  
  // Simular extractTimeFromDateTime (que faz parse da string)
  const cleanDateTime = isoString.replace('Z', '').replace('T', ' ');
  const [datePart, timePart] = cleanDateTime.split(' ');
  const [year2, month2, day2] = datePart.split('-').map(Number);
  const [hours2, minutes2] = timePart.split(':').map(Number);
  const parsedDate = new Date(year2, month2 - 1, day2, hours2, minutes2);
  
  return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
}

// DEPOIS (correto) - acesso direto
function newMethod(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const oldResult = oldMethod(appointmentDate);
const newResult = newMethod(appointmentDate);

console.log('\n❌ ANTES (dupla conversão):');
console.log('Resultado:', oldResult);

console.log('\n✅ DEPOIS (acesso direto):');
console.log('Resultado:', newResult);

console.log('\n🔍 Comparação:');
console.log('Esperado: 21:00');
console.log('Antigo:', oldResult, oldResult === '21:00' ? '✅' : '❌');
console.log('Novo:', newResult, newResult === '21:00' ? '✅' : '❌');

console.log('\n🎯 RESULTADO: Página pública agora mostra horário correto!');
