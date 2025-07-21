# 🕒 Horários de Funcionamento Multi-Tenant

## 🎯 Funcionalidade Implementada

Sistema de horários de funcionamento integrado ao banco de dados com suporte multi-tenant, onde cada estabelecimento tem seus próprios horários independentes.

## ✨ Características

### 🔒 **Multi-Tenant**
- Cada estabelecimento (tenant) possui seus próprios horários
- Isolamento completo entre diferentes clientes
- Autenticação JWT obrigatória

### 🗄️ **Integração com Banco de Dados**
- Modelo `WorkingHours` no schema Prisma
- Persistência no MySQL
- Relacionamento com tabela `Tenant`

### 🎨 **Interface Intuitiva**
- Switch para ativar/desativar dias
- Seletores de horário de início e fim
- Indicadores visuais de status (Fechado/Aberto)
- Loading states e tratamento de erros

### 🛠️ **Funcionalidades Automáticas**
- Criação automática de horários padrão para novos usuários
- Atualização em tempo real
- Feedback visual com toasts de sucesso/erro

## 📋 Horários Padrão

Quando um usuário acessa pela primeira vez, são criados automaticamente:

```
Segunda a Sexta: 08:00 - 18:00 (Ativo)
Sábado: 08:00 - 16:00 (Ativo)
Domingo: 09:00 - 15:00 (Inativo)
```

## 🏗️ Estrutura Técnica

### **Banco de Dados**
```sql
-- Tabela working_hours
CREATE TABLE working_hours (
  id VARCHAR(255) PRIMARY KEY,
  dayOfWeek VARCHAR(50) NOT NULL,
  startTime VARCHAR(5) NOT NULL,
  endTime VARCHAR(5) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  tenantId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME ON UPDATE NOW(),
  
  UNIQUE KEY unique_tenant_day (tenantId, dayOfWeek),
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### **API Endpoints**

#### `GET /api/working-hours`
- Busca horários do tenant autenticado
- Cria horários padrão se não existirem
- Requer autenticação JWT

#### `PUT /api/working-hours`
- Atualiza horários existentes
- Usa `upsert` para criar/atualizar
- Requer autenticação JWT

### **Frontend Hook**
```typescript
const { 
  workingHours,
  loading,
  error,
  updateWorkingHours 
} = useWorkingHours()
```

## 🔄 Fluxo de Funcionamento

1. **Carregamento**: Hook faz GET para buscar horários do tenant
2. **Verificação**: Se não existem horários, API cria padrão automaticamente
3. **Exibição**: Interface mostra horários formatados para o usuário
4. **Edição**: Usuário altera horário via switches/inputs
5. **Salvamento**: Hook converte formato UI → DB e faz PUT
6. **Feedback**: Toast confirma sucesso ou exibe erro

## 📁 Arquivos Envolvidos

### **Backend**
- `prisma/schema.prisma` - Modelo WorkingHours
- `app/api/working-hours/route.ts` - API endpoints

### **Frontend**
- `hooks/use-working-hours.ts` - Hook personalizado
- `app/dashboard/configuracoes/page.tsx` - Interface

### **Utilitários**
- Conversão UI ↔ DB format
- Validação de dados
- Tratamento de erros

## ✅ Status de Implementação

- ✅ Modelo de banco de dados criado
- ✅ API multi-tenant implementada
- ✅ Hook customizado funcional
- ✅ Interface integrada
- ✅ Horários padrão automáticos
- ✅ Atualização em tempo real
- ✅ Tratamento de erros
- ✅ Autenticação integrada

## 🚀 Como Testar

1. Faça login como usuário
2. Vá para `Dashboard > Configurações`
3. Clique na aba "Horários"
4. Veja os horários padrão carregados automaticamente
5. Altere horários usando switches e inputs
6. Verifique toasts de confirmação
7. Recarregue a página para confirmar persistência

## 🔮 Funcionalidades Futuras

- Horários especiais para feriados
- Múltiplos turnos por dia
- Horários diferenciados por profissional
- Integração com sistema de agendamento
- Notificações automáticas de mudanças

---

✨ **Sistema totalmente funcional e pronto para produção!**
