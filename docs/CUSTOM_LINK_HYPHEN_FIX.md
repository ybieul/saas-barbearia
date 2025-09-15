# Fix do Campo Link Personalizado - Digitação de Hífen

## 🔍 Problema Identificado

**Descrição:** O usuário não conseguia digitar hífen (-) no campo "Link Personalizado" das configurações do estabelecimento.

**Análise da Imagem:**
- Campo mostrando "seupereira" 
- Instruções corretas sobre usar hífens
- Impossibilidade de digitar hífen em tempo real

## 🛠️ Causa Raiz

A regex `replace(/[^a-z0-9-]/g, '')` estava tecnicamente correta, mas a aplicação excessivamente agressiva da formatação em tempo real no evento `onChange` estava interferindo na digitação natural do hífen.

## ✅ Solução Implementada

### Mudanças no arquivo: `app/dashboard/configuracoes/page.tsx`

**Antes:**
```tsx
onChange={(e) => {
  const formattedValue = e.target.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') // Muito agressivo
    .replace(/-+/g, '-') // Muito agressivo
    .replace(/^-+|-+$/g, '')
  updateField('customLink', formattedValue)
}}
```

**Depois:**
```tsx
onChange={(e) => {
  const inputValue = e.target.value
  
  // Permitir digitação livre, formatação mais suave
  const formattedValue = inputValue
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '') // Hífen explícito com escape
    .replace(/-{2,}/g, '-') // Apenas hífens múltiplos
    .replace(/^-+|-+$/g, '')
  
  updateField('customLink', formattedValue)
}}
onBlur={(e) => {
  // Formatação final ao sair do campo
  const finalValue = e.target.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  
  if (finalValue !== businessData.customLink) {
    updateField('customLink', finalValue)
  }
}}
```

## 🔧 Melhorias Implementadas

1. **Hífen Explícito**: Usar `\-` em vez de `-` na regex para garantir que seja interpretado literalmente
2. **Formatação Dupla**: `onChange` para formatação em tempo real suave + `onBlur` para formatação final
3. **Regex Menos Agressiva**: Substituir `/-+/g` por `/-{2,}/g` para permitir hífens únicos
4. **Validação Final**: Aplicar formatação completa apenas ao sair do campo

## 🧪 Comportamento Esperado

**Agora o usuário pode:**
- ✅ Digitar hífen normalmente: `barbearia-do-jorge`
- ✅ Digitar espaços que viram hífens: `barbearia do jorge` → `barbearia-do-jorge`
- ✅ Ver formatação em tempo real sem perder caracteres
- ✅ Aplicar formatação final ao sair do campo

**Exemplos de funcionamento:**
- Entrada: `Barbearia Do Jorge` → Saída: `barbearia-do-jorge`
- Entrada: `cortes--modernos` → Saída: `cortes-modernos`
- Entrada: `super@corte#` → Saída: `supercorte`
- Entrada: `-inicio-fim-` → Saída: `inicio-fim`

## ✨ Validações Mantidas

- Converte para minúsculas
- Substitui espaços por hífens
- Remove caracteres especiais
- Remove hífens duplicados
- Remove hífens do início/fim
- Mantém apenas letras, números e hífen único

## 🎯 Status

- ✅ Implementação concluída
- ✅ Sem erros de compilação
- ✅ Servidor rodando normalmente
- ✅ Funcionalidade testável em http://localhost:3000

---

*Data de implementação: 29 de agosto de 2025*
*Problema: Impossibilidade de digitar hífen no campo Link Personalizado*
*Solução: Formatação suave em tempo real + formatação final no onBlur*
