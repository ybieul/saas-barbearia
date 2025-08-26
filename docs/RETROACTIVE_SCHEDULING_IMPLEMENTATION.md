# 🎯 Implementação: Agendamento Retroativo no Dashboard

## 📋 Resumo da Correção

**Problema:** Dashboard interno não conseguia criar agendamentos retroativos no dia atual (funcionava apenas em dias passados).

**Causa Raiz:** A API `availability-v2` filtrava automaticamente horários passados quando `isToday=true`, bloqueando slots retroativos.

**Solução:** Implementação do parâmetro opcional `allowPastSlots` na API `availability-v2` e hooks relacionados.

## 🔧 Arquivos Modificados

### 1. `/app/api/public/business/[slug]/availability-v2/route.ts`
- ✅ Adicionado parâmetro `allowPastSlots` na query string
- ✅ Modificada lógica de filtro de horários passados:
  ```typescript
  if (isToday && !allowPastSlots) {  // Só filtrar se não permitir horários passados
    // ... filtro de horários
  }
  ```

### 2. `/hooks/use-schedule.ts`
- ✅ Adicionado parâmetro `allowPastSlots: boolean = false` na função `getAvailableSlots`
- ✅ Parâmetro é incluído na URL apenas quando `true` (mantém compatibilidade)

### 3. `/hooks/use-agenda-availability.ts`
- ✅ Atualizado `getProfessionalAvailableSlots` para aceitar `allowPastSlots`
- ✅ Propagação do parâmetro para `getAvailableSlots`

### 4. `/app/dashboard/agenda/page.tsx`
- ✅ Atualizada chamada em `getAvailableTimeSlotsWithProfessionalRules`:
  ```typescript
  const result = await getProfessionalAvailableSlots(
    newAppointment.professionalId,
    newAppointment.date,
    selectedService.duration || 30,
    true  // ✅ DASHBOARD: Permitir horários passados
  )
  ```
- ✅ Atualizada chamada direta da API:
  ```typescript
  const availableSlots = await getAvailableSlotsFromAPI(
    businessSlug,
    professionalId,
    newAppointment.date,
    selectedService.duration || 30,
    true  // ✅ DASHBOARD: Permitir horários passados
  )
  ```

## 🎯 Como Funciona

### Interface Pública (Booking)
```typescript
// Sem parâmetro = comportamento atual (filtra horários passados)
/api/public/business/demo/availability-v2?professionalId=1&date=2025-08-26
```

### Dashboard Interno
```typescript
// Com allowPastSlots=true = inclui horários passados para retroagendamento
/api/public/business/demo/availability-v2?professionalId=1&date=2025-08-26&allowPastSlots=true
```

## ✅ Vantagens da Implementação

1. **Retrocompatível:** Interface pública continua funcionando exatamente igual
2. **Flexível:** Dashboard pode escolher quando permitir agendamentos retroativos
3. **Reutiliza código:** Aproveita toda lógica complexa existente da `availability-v2`
4. **Mínima invasiva:** Apenas adiciona parâmetro opcional
5. **Consistente:** Mesma API para ambos os contextos

## 🔍 Logs de Debug

A API inclui logs específicos para monitorar o funcionamento:

```javascript
// Quando NÃO permite horários passados (comportamento original)
🔍 [AVAILABILITY-V2] Filtro de horário atual aplicado: {
  isToday: true,
  allowPastSlots: false,
  currentTime: "14:30",
  originalSlotsCount: 96,
  filteredSlotsCount: 42
}

// Quando PERMITE horários passados (novo comportamento dashboard)
🔍 [AVAILABILITY-V2] Permitindo horários passados para dashboard: {
  isToday: true,
  allowPastSlots: true,
  allSlotsCount: 96
}
```

## 🧪 Como Testar

### Teste Manual no Dashboard
1. Acesse `/dashboard/agenda`
2. Selecione data atual
3. Selecione profissional e serviço
4. Verifique se horários já passados aparecem disponíveis

### Teste Via API
```bash
# Sem allowPastSlots (comportamento atual)
GET /api/public/business/demo/availability-v2?professionalId=1&date=2025-08-26&serviceDuration=30

# Com allowPastSlots (novo comportamento)
GET /api/public/business/demo/availability-v2?professionalId=1&date=2025-08-26&serviceDuration=30&allowPastSlots=true
```

## 🚀 Status da Implementação

- ✅ API atualizada com suporte a `allowPastSlots`
- ✅ Hooks atualizados para propagar parâmetro
- ✅ Dashboard configurado para usar agendamento retroativo
- ✅ Compatibilidade backward mantida
- ✅ Logs de debug implementados
- ✅ Servidor funcionando e testado

**Resultado:** Dashboard agora consegue criar agendamentos retroativos no dia atual sem quebrar a funcionalidade pública de booking.
