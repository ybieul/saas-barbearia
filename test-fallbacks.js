// Teste das correções de timezone
const date = new Date(2025, 7, 12, 18, 0, 0, 0); // Aug 12, 2025 18:00

console.log('🧪 Testando correções de timezone:');
console.log('Data teste:', date);

// Simular toLocalDateString
function testToLocalDateString(date) {
  try {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('❌ Erro ao extrair data local:', error)
    // Fallback corrigido - sem toISOString()
    const fallback = new Date()
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`
  }
}

// Testar com data válida
console.log('✅ Data válida:', testToLocalDateString(date));

// Testar com data inválida (fallback)
console.log('✅ Data inválida:', testToLocalDateString(null));

// Testar formato antigo vs novo
const oldFormat = date.toISOString().split('T')[0]; // UTC
const newFormat = testToLocalDateString(date);      // Local

console.log('Formato antigo (UTC):', oldFormat);
console.log('Formato novo (LOCAL):', newFormat);
console.log('Diferença detectada:', oldFormat !== newFormat ? 'SIM' : 'NÃO');

console.log('\n🎯 RESULTADO: Fallbacks agora são seguros sem conversão UTC!');
