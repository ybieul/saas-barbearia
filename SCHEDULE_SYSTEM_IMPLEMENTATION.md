# Sistema de Gerenciamento de Horários dos Profissionais

## Resumo da Implementação

Este documento descreve a implementação completa do sistema de gerenciamento de horários para o SaaS de barbearias, permitindo que cada profissional gerencie seus próprios horários de trabalho e bloqueios.

## 📋 Estrutura Implementada

### 1. **Migração do Banco de Dados**
- **Arquivo**: `prisma/migrations/20250815_add_professional_schedules_tables/migration.sql`
- **Tabelas Criadas**:
  - `professional_schedules`: Horários padrão semanais
  - `schedule_exceptions`: Bloqueios e folgas pontuais

### 2. **Modelos Prisma Atualizados**
- **ProfessionalSchedule**: Horários semanais padrão
- **ScheduleException**: Exceções e bloqueios
- **ScheduleExceptionType**: ENUM para tipos de bloqueio

### 3. **APIs Implementadas**

#### Gerenciamento de Horários Padrão
- **GET** `/api/professionals/{id}/schedules` - Buscar horários semanais
- **PUT** `/api/professionals/{id}/schedules` - Atualizar horários semanais

#### Gerenciamento de Exceções/Bloqueios
- **GET** `/api/professionals/{id}/exceptions` - Buscar exceções por período
- **POST** `/api/professionals/{id}/exceptions` - Criar novo bloqueio
- **DELETE** `/api/exceptions/{exceptionId}` - Deletar bloqueio

#### Disponibilidade Pública Atualizada
- **GET** `/api/public/business/{slug}/availability-v2` - Nova versão que considera:
  - Horários padrão dos profissionais
  - Agendamentos existentes
  - Bloqueios e exceções

### 4. **Utilitários e Helpers**
- **`lib/schedule-utils.ts`**: Funções para manipulação de horários
- **`lib/types/schedule.ts`**: Tipos TypeScript para o sistema
- **`hooks/use-schedule.ts`**: Hooks React para integração com o frontend

## 🚀 Como Aplicar na Produção

### Passo 1: Aplicar a Migração
```bash
# No servidor VPS
cd /caminho/para/seu/projeto
npm run db:migrate  # ou npx prisma migrate deploy
npm run db:generate # ou npx prisma generate
```

### Passo 2: Validar as Tabelas
```sql
-- Verificar se as tabelas foram criadas
DESCRIBE professional_schedules;
DESCRIBE schedule_exceptions;
```

### Passo 3: Testar as APIs

#### Exemplo: Configurar horário de um profissional
```javascript
// PUT /api/professionals/{id}/schedules
[
  { "dayOfWeek": 1, "startTime": "08:00", "endTime": "17:00" }, // Segunda
  { "dayOfWeek": 2, "startTime": "08:00", "endTime": "17:00" }, // Terça
  { "dayOfWeek": 3, "startTime": "08:00", "endTime": "17:00" }, // Quarta
  { "dayOfWeek": 4, "startTime": "08:00", "endTime": "17:00" }, // Quinta
  { "dayOfWeek": 5, "startTime": "08:00", "endTime": "18:00" }, // Sexta
  { "dayOfWeek": 6, "startTime": "08:00", "endTime": "16:00" }  // Sábado
]
```

#### Exemplo: Criar um bloqueio
```javascript
// POST /api/professionals/{id}/exceptions
{
  "startDatetime": "2025-08-20T12:00:00",
  "endDatetime": "2025-08-20T13:00:00",
  "reason": "Almoço",
  "type": "BLOCK"
}
```

## 🔧 Funcionalidades Principais

### Horários Padrão dos Profissionais
- ✅ Configuração semanal (Domingo a Sábado)
- ✅ Horário de início e fim por dia
- ✅ Suporte para dias de folga
- ✅ Validação de formato de horário
- ✅ Transação segura para atualizações

### Sistema de Bloqueios/Exceções
- ✅ Bloqueios pontuais (intervalos, almoço)
- ✅ Folgas e férias (dia inteiro)
- ✅ Validação contra agendamentos confirmados
- ✅ Descrição/motivo opcional
- ✅ Histórico de criação/atualização

### Cálculo de Disponibilidade Inteligente
- ✅ Considera horário de trabalho do profissional
- ✅ Filtra por agendamentos existentes
- ✅ Respeita bloqueios e exceções
- ✅ Gera slots baseados na duração do serviço
- ✅ Suporte para folgas que cobrem o dia inteiro

## 🛡️ Validações Implementadas

### Segurança
- ✅ Verificação de tenant (multi-tenancy)
- ✅ Autenticação JWT obrigatória
- ✅ Profissionais só podem gerenciar próprios horários

### Integridade de Dados
- ✅ Não permite bloqueios conflitantes com agendamentos
- ✅ Valida formatos de horário (HH:MM ou HH:MM:SS)
- ✅ Impede sobreposição de horários inválidos
- ✅ Constraint única para evitar duplicatas

### Experiência do Usuário
- ✅ Mensagens de erro descritivas
- ✅ Retorna conflitos detalhados
- ✅ Suporte para múltiplos fusos horários
- ✅ Interface otimizada para móvel

## 📱 Integração com Frontend

### Hooks Disponíveis
```typescript
// Gerenciar horários padrão
const { getSchedule, updateSchedule, isLoading, error } = useProfessionalSchedule(professionalId)

// Gerenciar bloqueios/exceções
const { getExceptions, createException, deleteException } = useScheduleExceptions(professionalId)

// Verificar disponibilidade
const { getAvailability } = useAvailability()
```

### Componentes Sugeridos
1. **ProfessionalScheduleForm**: Formulário para configurar horários semanais
2. **ExceptionCalendar**: Calendário para visualizar e criar bloqueios
3. **AvailabilitySlots**: Grid de horários disponíveis para agendamento

## 🔍 Monitoramento e Logs

### Pontos de Log Importantes
- ✅ Criação/atualização de horários
- ✅ Tentativas de bloqueio com conflitos
- ✅ Cálculos de disponibilidade
- ✅ Erros de validação

### Métricas Sugeridas
- Quantidade de bloqueios por profissional
- Horários mais/menos disponíveis
- Taxa de conflitos em bloqueios
- Performance do cálculo de disponibilidade

## 📝 Próximos Passos Sugeridos

1. **Interface do Usuário**:
   - Criar formulários para configuração de horários
   - Implementar calendário visual para bloqueios
   - Dashboard de disponibilidade dos profissionais

2. **Notificações**:
   - Avisar clientes quando profissional criar bloqueio
   - Lembrete de configurar horários para novos profissionais

3. **Relatórios**:
   - Análise de disponibilidade por profissional
   - Relatório de bloqueios e folgas
   - Otimização de agenda

4. **Automações**:
   - Bloqueios automáticos (ex: feriados)
   - Sugestão de horários com base no histórico
   - Integração com calendário externo (Google, Outlook)

---

## 🆘 Suporte e Troubleshooting

Se encontrar algum problema durante a implementação, verifique:

1. **Banco de dados**: As tabelas foram criadas corretamente?
2. **Prisma**: O cliente foi regenerado após a migração?
3. **Autenticação**: O token JWT está sendo enviado corretamente?
4. **Timezone**: As datas estão sendo convertidas para o timezone correto?

**Contato**: Para suporte adicional, consulte a documentação ou entre em contato com a equipe de desenvolvimento.
