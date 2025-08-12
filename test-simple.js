// Teste simples do formato ISO
const date = new Date(2025, 7, 12, 18, 0, 0, 0); // Aug 12, 2025 18:00
console.log('🧪 Teste do formato ISO-8601:');
console.log('Date original:', date);
console.log('toString():', date.toString());

// Simular a função corrigida
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');
const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

const newFormat = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
const oldFormat = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000`;

console.log('Formato ANTIGO (sem Z):', oldFormat);
console.log('Formato NOVO (com Z):', newFormat);

// Testar se o novo formato é válido para parsing
console.log('\n🔍 Teste de parsing:');
try {
  const parsed = new Date(newFormat);
  console.log('✅ Parsing do novo formato:', parsed);
  console.log('✅ É válido:', !isNaN(parsed.getTime()));
  console.log('✅ Hora UTC parseada:', parsed.getUTCHours() + ':' + parsed.getUTCMinutes().toString().padStart(2, '0'));
  
  // Testar regex ISO-8601
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  console.log('✅ Formato ISO-8601 válido:', iso8601Regex.test(newFormat));
} catch (error) {
  console.log('❌ Erro no parsing:', error.message);
}

// Testar formato antigo
console.log('\n🔍 Teste formato antigo:');
try {
  const parsedOld = new Date(oldFormat);
  console.log('Parsing formato antigo:', parsedOld);
  console.log('É válido:', !isNaN(parsedOld.getTime()));
} catch (error) {
  console.log('❌ Erro formato antigo:', error.message);
}

console.log('\n🎯 CONCLUSÃO: Formato novo com Z é ISO-8601 completo!');
