# Sistema de Cleanup Automático de Instâncias WhatsApp

## Resumo da Implementação

Implementação completa de um sistema automatizado para limpeza de instâncias WhatsApp abandonadas, evitando acúmulo de instâncias órfãs na Evolution API.

## Funcionalidades Implementadas

### 1. Monitoramento Automático no Frontend
- **useEffect** especializado que monitora o estado de conexão WhatsApp
- Ativação apenas quando QR Code está sendo exibido (`connectionStatus === 'connecting'`)
- Múltiplos triggers para detecção de abandono

### 2. Triggers de Cleanup

#### A. **beforeunload Event**
```typescript
window.addEventListener('beforeunload', handleBeforeUnload)
```
- Detecta quando usuário fecha aba/navegador
- Executa cleanup imediato via `navigator.sendBeacon`

#### B. **visibilitychange Event** 
```typescript
document.addEventListener('visibilitychange', handleVisibilityChange)
```
- Detecta quando página perde foco (troca de aba)
- Timeout de 30 segundos antes de fazer cleanup
- Evita falsos positivos de mudanças rápidas de aba

#### C. **Timeout Programado**
```typescript
setTimeout(() => performCleanup(), 300000) // 5 minutos
```
- Cleanup automático após 5 minutos sem conexão
- Previne instâncias muito antigas

#### D. **Cancelamento Manual**
- Botão "Cancelar" executa cleanup imediato
- Feedback via toast de confirmação

### 3. API de Cleanup Confiável

#### Endpoint: `POST /api/tenants/[tenantId]/whatsapp/cleanup`

**Recursos Implementados:**
- Validação de autenticação via Bearer token
- Comunicação direta com Evolution API
- Tolerância a falhas (não falha se instância já foi deletada)
- Logs detalhados para debugging
- Timeout de 10 segundos para evitar hanging requests

**Payload da Requisição:**
```json
{
  "instanceName": "string",
  "reason": "abandoned_qr_scan" | "timeout" | "manual"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Instância limpa com sucesso",
  "instanceName": "example_instance",
  "reason": "abandoned_qr_scan",
  "timestamp": "2024-01-XX..."
}
```

### 4. Tecnologia de Envio Confiável

#### **navigator.sendBeacon** (Preferencial)
```typescript
const blob = new Blob([cleanupData], { type: 'application/json' })
navigator.sendBeacon(cleanupUrl, blob)
```
- API especificamente projetada para eventos unload
- Garante envio mesmo durante fechamento da página
- Não bloqueia o processo de navegação

#### **fetch com keepalive** (Fallback)
```typescript
fetch(cleanupUrl, {
  method: 'POST',
  body: cleanupData,
  keepalive: true // Manter conexão viva
})
```
- Fallback para navegadores sem sendBeacon
- Flag `keepalive` mantém requisição viva durante navegação

### 5. Logs e Debugging

**Frontend:**
- `🔧 Iniciando monitoramento de cleanup`
- `🚪 Detectado beforeunload - executando cleanup`
- `👁️ Página perdeu visibilidade - potencial abandono`
- `⏰ Timeout de 5 minutos atingido`
- `🚫 Cancelamento manual`

**Backend:**
- `🧹 [API] Iniciando cleanup de instância WhatsApp`
- `🔗 [API] Chamando Evolution API para cleanup`
- `✅ [API] Cleanup da instância completado com sucesso`

### 6. Tratamento de Erros Robusto

- **404 da Evolution API**: Considerado sucesso (instância já removida)
- **Erro de rede**: Não falha o cleanup para evitar retry loops
- **Timeout**: 10 segundos máximo por requisição de cleanup
- **Falhas de parsing**: Logs detalhados + resposta 400

## Fluxo de Funcionamento

1. **Usuário clica "Conectar WhatsApp"**
2. **QR Code é exibido** → Monitoramento automático ativado
3. **Usuário abandona escaneamento** (fecha aba, muda foco, etc.)
4. **Trigger detecta abandono** → Executa cleanup via sendBeacon
5. **API recebe requisição** → Remove instância da Evolution API
6. **Logs confirmam limpeza** → Sistema limpo e pronto

## Benefícios da Implementação

- ✅ **Zero instâncias órfãs**: Cleanup automático garante limpeza
- ✅ **Performance otimizada**: Evolution API não acumula lixo
- ✅ **UX melhorada**: Processo transparente para o usuário  
- ✅ **Confiabilidade**: Múltiplos triggers + sendBeacon garantem execução
- ✅ **Observabilidade**: Logs detalhados para monitoramento
- ✅ **Tolerância a falhas**: Sistema continua funcionando mesmo com erros

## Arquivos Modificados

1. **`components/whatsapp-connection.tsx`**
   - Adicionado useEffect de monitoramento
   - Implementado cleanup em múltiplos cenários
   - Melhorado cancelamento manual

2. **`app/api/tenants/[tenantId]/whatsapp/cleanup/route.ts`** (Novo)
   - API endpoint dedicada para cleanup
   - Comunicação com Evolution API
   - Tratamento robusto de erros

## Próximos Passos (Opcionais)

- [ ] Métricas de cleanup no dashboard administrativo
- [ ] Configuração de timeouts via variáveis de ambiente  
- [ ] Cleanup batch para múltiplas instâncias antigas
- [ ] Webhooks para notificação de cleanups críticos
