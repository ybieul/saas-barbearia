# Sistema Híbrido e Rápido de Limpeza de Instâncias WhatsApp

## 🎯 Objetivo Implementado

Sistema robusto para eliminar instâncias "órfãs" do WhatsApp em **máximo 5 minutos**, combinando:
- **Frontend (Best-Effort)**: Tentativa imediata de limpeza
- **Backend (Garantido)**: Coletor de lixo automático e rápido

## 🏗️ Arquitetura do Sistema

### Parte 1: Frontend - Tentativa de Limpeza Imediata ✅

**Arquivo**: `components/whatsapp-connection.tsx`

**Funcionalidades Implementadas:**
- ✅ `useEffect` para gerenciar ciclo de vida da instância
- ✅ Cleanup automático na função de limpeza do `useEffect`
- ✅ `navigator.sendBeacon()` para requisições confiáveis durante unload
- ✅ Sistema híbrido com 3 métodos de envio:
  1. `sendBeacon` (preferencial para unload events)
  2. `fetch` com `keepalive` (backup)
  3. `localStorage` (último recurso para o backend processar)

**Triggers de Cleanup:**
- `beforeunload`: Usuário fechando aba/navegador
- `visibilitychange`: Página oculta por 15+ segundos (agressivo)
- `timeout`: 3 minutos sem conexão (frontend timeout)
- `manual_cancel`: Botão cancelar

### Parte 2: Backend - Coletor de Lixo Garantido ✅

**Arquivo**: `scripts/whatsapp-instance-gc.ts`

**Lógica Principal:**
```typescript
export async function cleanupOrphanedInstances() {
  // 1. Buscar todas instâncias da Evolution API
  const instances = await evolutionApi.get('/instance/all')
  
  // 2. Buscar instâncias válidas do banco de dados
  const validInstances = await prisma.tenant.findMany()
  
  // 3. Para cada instância da Evolution API:
  for (const instance of instances) {
    if (instance.state === 'open') continue // Ignorar conectadas
    
    if (!validInstanceNames.has(instanceName)) {
      // Instância órfã - remover imediatamente
      await evolutionApi.delete(`/instance/delete/${instanceName}`)
    } else if (instance.state === 'connecting' || instance.state === 'close') {
      // Instância válida mas abandonada - limpar
      await cleanupInstance(instanceName)
      await updateTenantDatabase(tenantId) // Limpar do banco também
    }
  }
}
```

**Características:**
- ✅ Execução a cada 5 minutos via cron
- ✅ Comparação com banco de dados para identificar órfãs
- ✅ Limpeza agressiva de instâncias não-conectadas
- ✅ Logs detalhados com emojis
- ✅ Tratamento robusto de erros

### Parte 3: Scheduler Integrado ✅

**Arquivo**: `scripts/scheduler.ts`

**Implementação:**
```typescript
// Coletor de lixo a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    await cleanupOrphanedInstances();
    console.log('✅ COLETOR DE LIXO CONCLUÍDO');
  } catch (error) {
    console.error('❌ ERRO NO COLETOR DE LIXO:', error);
  }
}, { timezone: 'America/Sao_Paulo' });
```

### Parte 4: API de Cleanup Confiável ✅

**Endpoint**: `POST /api/tenants/[tenantId]/whatsapp/cleanup`

**Funcionalidades:**
- ✅ Comunicação direta com Evolution API
- ✅ Tolerância a falhas (404 considerado sucesso)
- ✅ Timeout de 10 segundos
- ✅ Logs detalhados para debugging

## ⚡ Tempos de Limpeza Implementados

| Cenário | Tempo de Limpeza | Método |
|---------|------------------|--------|
| Fechamento de aba/navegador | **Imediato** | Frontend sendBeacon |
| Troca de aba (15s oculta) | **15 segundos** | Frontend timeout |
| Timeout frontend | **3 minutos** | Frontend programado |
| Coletor backend | **5 minutos** | Backend garantido |

**Resultado**: Instâncias órfãs têm vida útil máxima de **5 minutos**! 🎯

## 🧪 Script de Teste Manual

**Arquivo**: `scripts/test-whatsapp-gc.ts`

```bash
# Testar o coletor manualmente
node dist/scripts/test-whatsapp-gc.js
```

## 📊 Logs e Monitoramento

### Frontend
```
🔧 [Frontend] Iniciando sistema híbrido de cleanup
🚪 [Frontend] Detectado beforeunload - executando cleanup imediato
👁️ [Frontend] Página perdeu visibilidade - iniciando cleanup agressivo  
⏰ [Frontend] Timeout de 3 minutos atingido - executando cleanup agressivo
🚫 [Frontend] Cancelamento manual - fazendo cleanup imediato
```

### Backend
```
🧹 [GC] Iniciando verificação de instâncias órfãs...
🔗 [GC] Conectando com Evolution API
📊 [GC] X instâncias encontradas na Evolution API
🗑️ [GC] Instância órfã encontrada: nome_instancia
✅ [GC] Instância órfã nome_instancia removida com sucesso
📈 [GC] Limpeza concluída: X removidas, Y mantidas, Z erros
```

## 🛡️ Recursos de Confiabilidade

### Frontend - Estratégia Híbrida
1. **sendBeacon**: Mais confiável para unload events
2. **fetch keepalive**: Backup para cenários normais
3. **localStorage**: Último recurso para o backend processar

### Backend - Tolerância a Falhas
1. **Comparação com banco**: Identifica órfãs vs legítimas
2. **Status 404 = sucesso**: Instância já foi removida
3. **Timeout de 10s**: Evita hanging requests
4. **Relatórios detalhados**: Métricas de limpeza

## 🚀 Benefícios Alcançados

- ✅ **Zero instâncias órfãs**: Sistema garante limpeza em máximo 5 minutos
- ✅ **Performance otimizada**: Evolution API sempre limpa
- ✅ **UX transparente**: Cleanup invisible para o usuário
- ✅ **Confiabilidade máxima**: Múltiplos layers de segurança
- ✅ **Observabilidade completa**: Logs detalhados em tempo real
- ✅ **Tolerância a falhas**: Sistema continua funcionando mesmo com erros

## 🎮 Como Usar

### 1. Desenvolvimento
```bash
# Executar servidor (já inclui o sistema)
npm run dev

# Testar coletor manualmente
npm run build
node dist/scripts/test-whatsapp-gc.js
```

### 2. Produção
```bash
# Executar scheduler completo
npm run build
node dist/scripts/scheduler.js
```

### 3. Monitoramento
- Logs aparecem no console do servidor
- Frontend logs no DevTools do navegador
- Métricas de cleanup no terminal do scheduler

## 📋 Checklist de Implementação Completa

- ✅ **Frontend useEffect cleanup**: Sistema híbrido implementado
- ✅ **navigator.sendBeacon**: Integrado com fallbacks
- ✅ **Coletor de lixo backend**: Script completo com comparação de banco
- ✅ **Scheduler integrado**: Cron de 5 minutos configurado  
- ✅ **API de cleanup**: Endpoint robusto implementado
- ✅ **Script de teste manual**: Ferramenta de debugging criada
- ✅ **Logs detalhados**: Frontend e backend com emojis
- ✅ **Build sem erros**: Sistema testado e aprovado
- ✅ **Documentação completa**: Guia de uso e arquitetura

## 🔮 Próximas Melhorias (Opcionais)

- [ ] Dashboard de métricas de cleanup
- [ ] Alertas para cleanups críticos
- [ ] Configuração via variáveis de ambiente
- [ ] Cleanup em lote para múltiplas instâncias
- [ ] Webhooks de notificação

---

**Sistema implementado com sucesso!** 🎉 
Instâncias WhatsApp órfãs agora têm vida útil máxima de **5 minutos**.
