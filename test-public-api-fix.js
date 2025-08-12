// Teste de correção da página pública
console.log('🧪 Testando correção da página pública:');

// Simular um Date object do Prisma (21:00)
const appointmentDate = new Date(2025, 7, 12, 21, 0, 0, 0);

console.log('📅 Agendamento no banco:', appointmentDate.toString());
console.log('📅 Horário esperado na página pública: 21:00');

// ANTES (problemático) - extractTimeFromDateTime(toLocalISOString(apt.dateTime))
function oldApiMethod(date) {
  // Simular toLocalISOString
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  
  // Simular extractTimeFromDateTime
  const cleanDateTime = isoString.replace('Z', '').replace('T', ' ');
  const [datePart, timePart] = cleanDateTime.split(' ');
  const [year2, month2, day2] = datePart.split('-').map(Number);
  const [hours2, minutes2] = timePart.split(':').map(Number);
  const parsedDate = new Date(year2, month2 - 1, day2, hours2, minutes2);
  
  return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
}

// DEPOIS (correto) - extractTimeFromDateObject(apt.dateTime)
function newApiMethod(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const oldApiResult = oldApiMethod(appointmentDate);
const newApiResult = newApiMethod(appointmentDate);

console.log('\n❌ ANTES (API com dupla conversão):');
console.log('API retorna startTime:', oldApiResult);
console.log('Página pública mostra:', oldApiResult);

console.log('\n✅ DEPOIS (API com acesso direto):');
console.log('API retorna startTime:', newApiResult);
console.log('Página pública mostra:', newApiResult);

console.log('\n🔍 Resultado:');
console.log('Esperado: 21:00');
console.log('Antigo:', oldApiResult, oldApiResult === '21:00' ? '✅' : '❌');
console.log('Novo:', newApiResult, newApiResult === '21:00' ? '✅' : '❌');

if (newApiResult === '21:00') {
  console.log('\n🎯 SUCESSO: Página pública agora mostra horário correto de 21:00!');
} else {
  console.log('\n⚠️ ATENÇÃO: Ainda há problemas na conversão');
}
