// Configurações da aplicação
// Este arquivo força a injeção de variáveis NEXT_PUBLIC no bundle

export const APP_CONFIG = {
  // Número do suporte - referência estática garante injeção pelo Next.js
  SUPPORT_PHONE: process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE || '24981757110',
  
  // Debug das variáveis disponíveis
  getAvailableEnvVars: () => {
    return Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC'));
  },
  
  // Debug específico da variável de suporte
  debugSupportVar: () => {
    console.log('🔍 Debug da variável de suporte:');
    console.log('NEXT_PUBLIC_NUMERO_PARA_SUPORTE:', process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE);
    console.log('Valor configurado:', APP_CONFIG.SUPPORT_PHONE);
    console.log('Todas as NEXT_PUBLIC:', APP_CONFIG.getAvailableEnvVars());
  }
}
