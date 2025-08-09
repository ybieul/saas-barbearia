/**
 * 🧪 TESTES DE INTEGRAÇÃO - AGENDAMENTOS
 * =====================================
 * 
 * Testes E2E para validar fluxo completo de agendamentos
 */

import { parseDatabaseDateTime, toLocalISOString, extractTimeFromDateTime } from '../lib/timezone'

describe('🔄 Integration Tests - Appointment Flow', () => {
  
  describe('Fluxo Completo: Dashboard → Banco → Exibição', () => {
    test('deve preservar horário em todo o fluxo (Dashboard)', () => {
      // 📝 CENÁRIO: Usuário cria agendamento às 8:00 no dashboard
      
      // 1. Usuário seleciona data e hora
      const selectedDate = '2025-08-08'
      const selectedTime = '08:00'
      
      // 2. Frontend cria DateTime brasileiro
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
      
      // 3. Frontend envia para API usando toLocalISOString
      const sentToAPI = toLocalISOString(appointmentDateTime)
      
      // 4. Banco armazena (simulação)
      const storedInDB = sentToAPI // Banco armazena exatamente o que recebeu
      
      // 5. API retorna para frontend
      const receivedFromAPI = storedInDB
      
      // 6. Frontend parseia para exibição
      const parsedForDisplay = parseDatabaseDateTime(receivedFromAPI)
      const displayTime = extractTimeFromDateTime(receivedFromAPI)
      
      // ✅ VALIDAÇÕES: Horário preservado em todo o fluxo
      expect(appointmentDateTime.getHours()).toBe(8)
      expect(appointmentDateTime.getMinutes()).toBe(0)
      
      expect(sentToAPI).toBe('2025-08-08T08:00:00.000')
      expect(sentToAPI).not.toContain('Z') // Não deve ter indicador UTC
      
      expect(parsedForDisplay.getHours()).toBe(8)
      expect(parsedForDisplay.getMinutes()).toBe(0)
      
      expect(displayTime).toBe('08:00')
    })

    test('deve preservar horário em todo o fluxo (Agendamento Público)', () => {
      // 📝 CENÁRIO: Cliente cria agendamento às 14:30 na página pública
      
      // 1. Cliente seleciona data e hora
      const selectedDate = '2025-08-08'
      const selectedTime = '14:30'
      
      // 2. Frontend público cria DateTime brasileiro
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
      
      // 3. ✅ CORREÇÃO APLICADA: Frontend envia usando toLocalISOString
      const sentToAPI = toLocalISOString(appointmentDateTime)
      
      // 4. Banco armazena
      const storedInDB = sentToAPI
      
      // 5. Dashboard lê e exibe
      const parsedForDashboard = parseDatabaseDateTime(storedInDB)
      const dashboardDisplayTime = extractTimeFromDateTime(storedInDB)
      
      // ✅ VALIDAÇÕES: Consistência entre público e dashboard
      expect(appointmentDateTime.getHours()).toBe(14)
      expect(appointmentDateTime.getMinutes()).toBe(30)
      
      expect(sentToAPI).toBe('2025-08-08T14:30:00.000')
      
      expect(parsedForDashboard.getHours()).toBe(14)
      expect(parsedForDashboard.getMinutes()).toBe(30)
      
      expect(dashboardDisplayTime).toBe('14:30')
    })
  })

  describe('Validação de Regressão: toISOString vs toLocalISOString', () => {
    test('deve demonstrar diferença entre métodos UTC e local', () => {
      // Criar data: 8 agosto 2025, 8:00 (horário brasileiro)
      const date = new Date(2025, 7, 8, 8, 0, 0)
      
      // ❌ Método antigo (problemático)
      const utcMethod = date.toISOString()
      
      // ✅ Método novo (correto)
      const localMethod = toLocalISOString(date)
      
      // 🔍 Validações
      expect(utcMethod).toContain('Z') // UTC tem indicador Z
      expect(localMethod).not.toContain('Z') // Local não tem Z
      
      expect(localMethod).toContain('08:00:00') // Preserva horário local
      
      // Se estamos em UTC-3, o UTC seria 11:00:00
      // Mas o local mantém 08:00:00
      console.log('UTC Method:', utcMethod)
      console.log('Local Method:', localMethod)
    })
  })

  describe('Testes de Edge Cases', () => {
    test('deve lidar com horários de final de dia', () => {
      const date = new Date(2025, 7, 8, 23, 59, 59)
      const isoString = toLocalISOString(date)
      const parsed = parseDatabaseDateTime(isoString)
      
      expect(parsed.getHours()).toBe(23)
      expect(parsed.getMinutes()).toBe(59)
      expect(parsed.getSeconds()).toBe(59)
    })

    test('deve lidar com horários de início de dia', () => {
      const date = new Date(2025, 7, 8, 0, 0, 0)
      const isoString = toLocalISOString(date)
      const parsed = parseDatabaseDateTime(isoString)
      
      expect(parsed.getHours()).toBe(0)
      expect(parsed.getMinutes()).toBe(0)
      expect(parsed.getSeconds()).toBe(0)
    })

    test('deve lidar com mudança de ano', () => {
      const date = new Date(2025, 11, 31, 23, 59, 59) // 31 dezembro 2025
      const isoString = toLocalISOString(date)
      const parsed = parseDatabaseDateTime(isoString)
      
      expect(parsed.getFullYear()).toBe(2025)
      expect(parsed.getMonth()).toBe(11) // Dezembro
      expect(parsed.getDate()).toBe(31)
    })
  })

  describe('Performance Tests', () => {
    test('fluxo completo deve ser rápido', () => {
      const start = performance.now()
      
      for (let i = 0; i < 100; i++) {
        const date = new Date(2025, 7, 8, 8, i % 60, 0)
        const iso = toLocalISOString(date)
        const parsed = parseDatabaseDateTime(iso)
        extractTimeFromDateTime(iso)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Deve processar 100 fluxos completos em menos de 50ms
      expect(duration).toBeLessThan(50)
    })
  })

  describe('Validação de Dados Legados', () => {
    test('deve lidar com dados antigos do banco (com Z)', () => {
      // Simular dados antigos que podem estar no banco
      const oldData = '2025-08-08T08:00:00.000Z'
      const parsed = parseDatabaseDateTime(oldData)
      
      // Deve parsear sem erro
      expect(parsed).toBeInstanceOf(Date)
      expect(parsed.getHours()).toBe(8) // Deve interpretar como local
    })

    test('deve lidar com diferentes formatos de data', () => {
      const formats = [
        '2025-08-08T08:00:00.000Z',
        '2025-08-08T08:00:00.000',
        '2025-08-08 08:00:00',
        '2025-08-08T08:00:00'
      ]
      
      formats.forEach(format => {
        const parsed = parseDatabaseDateTime(format)
        expect(parsed).toBeInstanceOf(Date)
        expect(parsed.getHours()).toBe(8)
        expect(parsed.getMinutes()).toBe(0)
      })
    })
  })
})
