const fs = require('fs');
const path = require('path');

// Função para envolver console.log em if de desenvolvimento
function wrapLogsInDevelopment(content) {
  // Encontrar linhas com console.log que não estão já envolvidas
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Se é uma linha com console.log e não está já envolvida em if development
    if (line.includes('console.log(') && !line.includes('process.env.NODE_ENV')) {
      // Verificar se a linha anterior já tem o if development
      const previousLine = i > 0 ? lines[i - 1] : '';
      if (!previousLine.includes('process.env.NODE_ENV === \'development\'')) {
        // Obter indentação da linha atual
        const indent = line.match(/^\s*/)[0];
        
        // Adicionar if development antes
        result.push(`${indent}if (process.env.NODE_ENV === 'development') {`);
        result.push(line);
        result.push(`${indent}}`);
      } else {
        result.push(line);
      }
    } else if (line.includes('console.error(') && !line.includes('process.env.NODE_ENV')) {
      // Para console.error, mantemos mas dentro do if também
      const previousLine = i > 0 ? lines[i - 1] : '';
      if (!previousLine.includes('process.env.NODE_ENV === \'development\'')) {
        const indent = line.match(/^\s*/)[0];
        result.push(`${indent}if (process.env.NODE_ENV === 'development') {`);
        result.push(line);
        result.push(`${indent}}`);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

// Ler arquivo
const filePath = 'E:\\SaasV0\\app\\api\\dashboard\\route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Aplicar correções específicas
content = content.replace(/console\.log\('📅 Start date:'/g, "if (process.env.NODE_ENV === 'development') {\n    console.log('📅 Start date:'");
content = content.replace(/console\.log\('📅 End date:'/g, "    console.log('📅 End date:'");
content = content.replace(/console\.log\('📅 Start local:'/g, "    console.log('📅 Start local:'");
content = content.replace(/console\.log\('📅 End local:'/g, "    console.log('📅 End local:'\n    }");

// Salvar arquivo
fs.writeFileSync(filePath, content);

console.log('Logs do dashboard corrigidos!');
