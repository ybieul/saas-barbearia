# 🔒 Sistema de Paywall - Bloqueio por Assinatura

## Visão Geral

Sistema implementado para bloquear automaticamente usuários com assinaturas expiradas ou inativas, redirecionando-os para a página de gerenciamento de assinatura.

## Componentes do Sistema

### 1. Middleware de Proteção (`middleware.ts`)

**Localização:** `/middleware.ts`

**Funcionalidades:**
- ✅ Verificação de autenticação (token JWT)
- ✅ Verificação de status da assinatura (isActive + subscriptionEnd)
- ✅ Redirecionamento automático para `/dashboard/assinatura`
- ✅ Prevenção de loop infinito de redirecionamento
- ✅ Logging para debug

**Fluxo de Verificação:**
```typescript
1. Token existe? → Se não, redireciona para /login
2. Decodifica token para obter tenantId
3. Busca status da assinatura no banco
4. Assinatura ativa = isActive: true AND subscriptionEnd > agora
5. Se assinatura inativa AND não está em /dashboard/assinatura
   → Redireciona para /dashboard/assinatura
```

**Configuração:**
```typescript
export const config = {
  matcher: ['/dashboard/:path*'], // Protege apenas rotas do dashboard
}
```

### 2. Alerta de Paywall (Frontend)

**Localização:** `/app/dashboard/assinatura/page.tsx`

**Características:**
- 🔴 Alert vermelho destacado com borda reforçada
- 🔒 Ícone de bloqueio para identificação visual
- 📝 Mensagem clara sobre o bloqueio
- ℹ️ Instruções sobre como resolver

**Componente do Alerta:**
```tsx
{!subscription.isActive && (
  <Alert variant="destructive" className="border-2 border-red-300 bg-red-50">
    <XCircle className="h-5 w-5" />
    <AlertDescription className="text-red-800 font-medium">
      <div className="space-y-2">
        <div className="text-lg font-semibold">🔒 Sua conta está bloqueada</div>
        <div>
          Sua assinatura está inativa. Para reativar o acesso a todas as 
          funcionalidades do TymerBook, por favor, escolha um plano e efetue o pagamento.
        </div>
        <div className="text-sm text-red-600">
          Enquanto sua assinatura estiver inativa, você não poderá acessar 
          outras funcionalidades do sistema.
        </div>
      </div>
    </AlertDescription>
  </Alert>
)}
```

## Fluxo Completo do Paywall

### Cenário 1: Usuário com Assinatura Ativa
```
1. Login → Dashboard → ✅ Acesso liberado
2. Middleware verifica: isActive: true + subscriptionEnd > hoje
3. Permite navegação normal
```

### Cenário 2: Usuário com Assinatura Expirada
```
1. Login → Tenta acessar /dashboard/agenda
2. Middleware detecta: isActive: false OU subscriptionEnd < hoje  
3. Redireciona automaticamente para /dashboard/assinatura
4. Página mostra alerta de bloqueio 🔒
5. Usuário vê opções de pagamento/reativação
```

### Cenário 3: Usuário já na Página de Assinatura
```
1. Login → Já está em /dashboard/assinatura
2. Middleware detecta que está na página de billing
3. Não redireciona (evita loop)
4. Mostra alerta de paywall + opções de pagamento
```

## Configuração de Segurança

### Variáveis de Ambiente Necessárias
```env
JWT_SECRET=sua_chave_secreta_jwt
DATABASE_URL=sua_conexao_prisma
```

### Dependências Instaladas
```json
{
  "jsonwebtoken": "^9.x.x",
  "@types/jsonwebtoken": "^9.x.x"
}
```

## Verificações de Status

### Status de Assinatura Válida
```typescript
const isSubscriptionActive = tenant.isActive && 
  (tenant.subscriptionEnd ? tenant.subscriptionEnd > getBrazilNow() : true)
```

### Lógica do Redirecionamento
```typescript
const isOnBillingPage = pathname.startsWith('/dashboard/assinatura')

if (!isSubscriptionActive && !isOnBillingPage) {
  return NextResponse.redirect(new URL('/dashboard/assinatura', request.url))
}
```

## Debugging e Logs

### Logs do Middleware
```typescript
console.log(`🔒 PAYWALL: Redirecionando usuário ${tenantId} para /dashboard/assinatura`)
```

### Verificação Manual
```sql
-- Verificar status de assinatura de um tenant
SELECT id, isActive, subscriptionEnd, businessPlan 
FROM Tenant 
WHERE id = 'TENANT_ID';
```

## Comportamento Esperado

### ✅ Funcionamento Correto
- Usuários ativos navegam normalmente
- Usuários inativos são redirecionados apenas UMA vez
- Mensagem clara sobre o bloqueio
- Sem loops de redirecionamento

### 🚫 Cenários de Erro (Tratados)
- Token JWT inválido → Redireciona para login
- Tenant não encontrado → Redireciona para login  
- Erro de conexão com banco → Redireciona para login
- Qualquer erro no middleware → Fallback seguro

## Integração com Sistema de Assinatura

### Hook de Assinatura
```typescript
const { subscriptionInfo, loading, error } = useSubscription()
```

### Portal de Gerenciamento Kirvano
- Botão "Gerenciar Assinatura" continua disponível
- Abre portal da Kirvano para pagamento/renovação
- Integração mantida com sistema existente

## Impacto na Experiência do Usuário

### Vantagens
- 🔒 Proteção automática de recursos pagos
- 📢 Comunicação clara sobre o status da conta  
- 🚀 Redirecionamento direto para solução
- 💡 Interface amigável para reativação

### Considerações
- Bloqueio acontece no nível de middleware (mais seguro)
- Verificação ocorre a cada navegação (performance otimizada)
- Sistema funciona mesmo com JavaScript desabilitado
- Compatível com SSR/SSG do Next.js

---

**Implementado em:** 31/08/2025  
**Status:** ✅ Pronto para Produção  
**Testes:** Aguardando validação do usuário
