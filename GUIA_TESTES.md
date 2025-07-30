# 🧪 Guia de Testes - Sistema de Agendamento

## 📋 Resumo do que foi implementado

### ✅ Correções Realizadas:
1. **Currency Formatting**: Criado `lib/currency.ts` com formatação profissional em R$
2. **Async Params**: Corrigido todos os erros de `params` nas APIs do Next.js 15
3. **Availability API**: Sistema completo de verificação de disponibilidade em tempo real
4. **Production Ready**: Removido dependências de dados demo

### 🔧 APIs Implementadas:
- `/api/public/business/[slug]` - Dados do negócio
- `/api/public/business/[slug]/services` - Serviços disponíveis  
- `/api/public/business/[slug]/professionals` - Profissionais
- `/api/public/business/[slug]/working-hours` - Horários de funcionamento
- `/api/public/business/[slug]/availability` - Disponibilidade em tempo real
- `/api/public/clients/search` - Busca de clientes

## 🚀 Como Testar

### 1. Teste Local (sem dados)
```bash
# Iniciar servidor
npm run dev

# Testar com qualquer slug (retornará 404, mas API funcionará)
node test-apis-node.js qualquer-slug
```

### 2. Teste em Produção (com seus dados reais)
```bash
# Testar no seu servidor VPS
node test-apis-node.js SEU-TENANT-SLUG https://seu-dominio.com
```

### 3. Teste Manual via Browser/Postman
```
GET https://seu-dominio.com/api/public/business/SEU-SLUG
GET https://seu-dominio.com/api/public/business/SEU-SLUG/services
GET https://seu-dominio.com/api/public/business/SEU-SLUG/availability?date=2025-07-30&serviceDuration=30
```

## 🎯 Funcionalidades do Sistema de Disponibilidade

### Parâmetros da API de Disponibilidade:
- `date` (obrigatório): Data no formato YYYY-MM-DD
- `serviceDuration` (obrigatório): Duração em minutos
- `professionalId` (opcional): ID do profissional específico

### Exemplo de Resposta:
```json
{
  "date": "2025-07-30",
  "dayOfWeek": 2,
  "isWorkingDay": true,
  "slots": [
    {
      "time": "09:00",
      "available": true,
      "occupied": false
    },
    {
      "time": "09:30", 
      "available": false,
      "occupied": true,
      "reason": "Agendamento existente"
    }
  ]
}
```

## 🌐 Interface Pública de Agendamento

### URL de Acesso:
```
https://seu-dominio.com/agendamento/SEU-TENANT-SLUG
```

### Funcionalidades:
- ✅ Seleção de serviços com preços formatados em R$
- ✅ Seleção de profissionais  
- ✅ Calendário com dias disponíveis
- ✅ Horários em tempo real (slots ocupados em vermelho)
- ✅ Formulário de cliente com busca por telefone
- ✅ Confirmação de agendamento

## 🔍 Verificações Importantes

### 1. Timezone
- ✅ Banco salva em UTC
- ✅ Interface mostra em horário de Brasília
- ✅ Conversões automáticas

### 2. Conflitos de Horário
- ✅ Verifica agendamentos existentes
- ✅ Considera duração dos serviços
- ✅ Bloqueia horários ocupados

### 3. Formatação de Moeda
- ✅ Valores em R$ (pt-BR)
- ✅ Função `formatCurrency()` centralizada
- ✅ Aplicado em todos os componentes

## 🐛 Logs e Debug

### Para debugar problemas:
1. **Logs do servidor**: `pm2 logs` no VPS
2. **Logs da aplicação**: Console do browser (F12)
3. **API errors**: Network tab das ferramentas de desenvolvimento

### Códigos de Status Esperados:
- `200`: Sucesso
- `404`: Tenant não encontrado
- `400`: Parâmetros inválidos
- `500`: Erro interno (verificar logs)

## 📝 Próximos Passos (para você testar)

1. **Teste as APIs** usando o script `test-apis-node.js`
2. **Acesse a interface** em `/agendamento/seu-slug`
3. **Verifique os horários ocupados** estão aparecendo corretamente
4. **Teste um agendamento completo**
5. **Confirme que os preços** estão formatados em R$

## 🆘 Troubleshooting

### Se der erro 500:
- Verificar logs: `pm2 logs`
- Verificar se banco está conectado
- Verificar se variáveis de ambiente estão configuradas

### Se horários não aparecerem:
- Verificar se há working hours cadastrados
- Verificar timezone do servidor
- Verificar se data está no formato correto

### Se preços não formatarem:
- Verificar se `formatCurrency` está sendo importado
- Verificar se valores não são null/undefined

---
**Status**: ✅ Pronto para testes em produção!
