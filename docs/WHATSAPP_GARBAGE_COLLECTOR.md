# 🧹 Coletor de Lixo de Instâncias WhatsApp

## Visão Geral

O **Coletor de Lixo (Garbage Collector)** é um sistema automatizado que roda diariamente às 03:00 da manhã para limpar instâncias órfãs do WhatsApp na Evolution API, garantindo que apenas instâncias válidas (registradas no nosso banco de dados) permaneçam ativas.

## Como Funciona

### 🔍 Processo de Limpeza

1. **Busca Instâncias Válidas**: Consulta o banco de dados para encontrar todos os tenants com `whatsapp_instance_name` não nulo
2. **Lista Instâncias da Evolution API**: Faz uma chamada para `/instance/all` da Evolution API
3. **Comparação**: Verifica quais instâncias da Evolution API não existem no nosso banco
4. **Limpeza**: Remove instâncias órfãs usando `/instance/delete/{instanceName}`
5. **Relatório**: Gera relatório detalhado da operação

### 📊 Cenários Identificados

- **✅ Instâncias Válidas**: Existem no banco de dados - são mantidas
- **🗑️ Instâncias Órfãs**: Não existem no banco de dados - são removidas
- **⚠️ Instâncias Problemáticas**: Sem nome ou estrutura inválida - são ignoradas

## Arquivos do Sistema

### Scripts TypeScript (Desenvolvimento)
- `scripts/whatsapp-instance-gc.ts` - Lógica principal do coletor
- `scripts/scheduler.ts` - Agendador com tarefas cron

### Scripts JavaScript (Produção)
- `dist/scripts/whatsapp-instance-gc.js` - Versão compilada do coletor
- `dist/scripts/scheduler-cron.js` - Agendador compilado para produção
- `dist/scripts/test-gc.js` - Script de teste manual

## Comandos Disponíveis

```bash
# Executar coletor de lixo manualmente (desenvolvimento)
npm run gc:run

# Executar teste manual (produção)
npm run gc:test

# Iniciar scheduler completo (desenvolvimento)
npm run scheduler:start

# Iniciar scheduler em produção
npm run scheduler:prod
```

## Agendamentos

### 🕐 Tarefas Programadas

1. **Lembretes WhatsApp**: A cada 5 minutos
   - Expressão cron: `*/5 * * * *`
   - Função: `sendWhatsappReminders()`

2. **Limpeza de Instâncias**: Diariamente às 03:00
   - Expressão cron: `0 3 * * *`
   - Função: `cleanupOrphanedInstances()`

## Logs e Monitoramento

### 📋 Exemplo de Saída

```
[GARBAGE-COLLECTOR] 🧹 Iniciando limpeza diária de instâncias órfãs...
[GARBAGE-COLLECTOR] 🔗 Conectando com Evolution API: https://api.evolution.com
[GARBAGE-COLLECTOR] 📊 Encontradas 3 instâncias válidas no banco de dados:
[GARBAGE-COLLECTOR]   - barbearia_joao_abc123 (Barbearia do João)
[GARBAGE-COLLECTOR]   - salao_maria_def456 (Salão da Maria)
[GARBAGE-COLLECTOR] 🔍 Encontradas 5 instâncias na Evolution API.
[GARBAGE-COLLECTOR] 🗑️ Instância órfã encontrada: "teste_old_instance". Removendo...
[GARBAGE-COLLECTOR] ✅ Instância "teste_old_instance" removida com sucesso.

[GARBAGE-COLLECTOR] 📋 RELATÓRIO FINAL:
[GARBAGE-COLLECTOR]   - Instâncias válidas no banco: 3
[GARBAGE-COLLECTOR]   - Instâncias na Evolution API: 5
[GARBAGE-COLLECTOR]   - Instâncias órfãs encontradas: 2
[GARBAGE-COLLECTOR]   - Instâncias deletadas com sucesso: 2
[GARBAGE-COLLECTOR]   - Erros durante deleção: 0
[GARBAGE-COLLECTOR] 🎉 Todas as instâncias órfãs foram removidas com sucesso!
```

## Configuração

### Variáveis de Ambiente Necessárias

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-api
DATABASE_URL=sua-conexao-do-banco
```

### Timezone

Todas as operações usam o timezone `America/Sao_Paulo` para consistência com o sistema brasileiro.

## Segurança e Confiabilidade

### 🛡️ Medidas de Proteção

- **Timeouts**: Operações limitadas a 15-30 segundos
- **Rate Limiting**: 1 segundo entre cada deleção
- **Validação**: Verifica se instância tem nome válido
- **Relatórios**: Log detalhado de todas as operações
- **Graceful Shutdown**: Desconecta do Prisma ao finalizar

### 🚨 Tratamento de Erros

- Continua operação mesmo se uma instância falhar ao ser deletada
- Log detalhado de erros para debug
- Não interrompe outras tarefas agendadas em caso de erro

## Integração com Sistema Existente

O coletor de lixo trabalha em conjunto com:

1. **Rota de Conexão**: `/api/tenants/[tenantId]/whatsapp/connect` - Reutiliza instâncias existentes
2. **Sistema de Lembretes**: Mantém compatibilidade com instâncias ativas
3. **Dashboard**: Não interfere com conexões estabelecidas

## Monitoramento de Produção

Para monitorar o sistema em produção:

1. Verifique logs do scheduler às 03:00 diariamente
2. Monitore relatórios de limpeza
3. Acompanhe métricas de instâncias órfãs removidas
4. Verifique se não há erros recorrentes

---

**Desenvolvido para garantir a saúde e performance do sistema WhatsApp multi-tenant** 🚀
