const fs = require('fs');
const path = require('path');

// Função para corrigir logs em um arquivo
function fixConsoleLogsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Padrões para diferentes tipos de console logs
    const patterns = [
      // console.log simples
      {
        regex: /^(\s*)console\.log\(/gm,
        replacement: '$1if (process.env.NODE_ENV === \'development\') {\n$1  console.log('
      },
      // console.error simples
      {
        regex: /^(\s*)console\.error\(/gm,
        replacement: '$1if (process.env.NODE_ENV === \'development\') {\n$1  console.error('
      },
      // console.warn simples
      {
        regex: /^(\s*)console\.warn\(/gm,
        replacement: '$1if (process.env.NODE_ENV === \'development\') {\n$1  console.warn('
      },
      // console.info simples
      {
        regex: /^(\s*)console\.info\(/gm,
        replacement: '$1if (process.env.NODE_ENV === \'development\') {\n$1  console.info('
      },
      // console.debug simples
      {
        regex: /^(\s*)console\.debug\(/gm,
        replacement: '$1if (process.env.NODE_ENV === \'development\') {\n$1  console.debug('
      }
    ];
    
    // Aplicar padrões
    patterns.forEach(pattern => {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    });
    
    // Adicionar fechamentos de chaves para os ifs criados
    if (hasChanges) {
      // Encontrar todas as linhas que terminam com )
      content = content.replace(/(\s*if \(process\.env\.NODE_ENV === 'development'\) \{\s*console\.[a-z]+\(.*?\))/gm, '$1\n$1'.replace(/console\.[a-z]+\(.*?\).*/, '}'));
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Arquivo específico da agenda
const agendaFile = 'e:\\SaasV0\\app\\dashboard\\agenda\\page.tsx';

console.log('🔧 Iniciando correção de logs de console...\n');

if (fs.existsSync(agendaFile)) {
  const fixed = fixConsoleLogsInFile(agendaFile);
  if (fixed) {
    console.log('\n✅ Correções aplicadas com sucesso!');
  } else {
    console.log('\n🔍 Nenhuma alteração necessária.');
  }
} else {
  console.log('❌ Arquivo da agenda não encontrado.');
}
