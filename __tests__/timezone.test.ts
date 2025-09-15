/**
 * 🧪 TESTES UNITÁRIOS - FUNÇÕES DE TIMEZONE
 * ==========================================
 * 
 * Testes para validar as funções críticas da migração de timezone
 */

import { 
  parseDatabaseDateTime, 
  extractTimeFromDateTime,
  toLocalISOString,
  toLocalDateString,
  parseDateTime,
  formatBrazilTime,
  getBrazilNow
} from '../lib/timezone'

describe('🇧🇷 Timezone Functions', () => {
  
  describe('parseDatabaseDateTime', () => {
    test('deve parsear datetime com Z (UTC) corretamente', () => {
      const input = '2025-08-08T08:00:00.000Z'
      const result = parseDatabaseDateTime(input)
      
      expect(result.getHours()).toBe(8)
      expect(result.getMinutes()).toBe(0)
      expect(result.getDate()).toBe(8)
      expect(result.getMonth()).toBe(7) // Agosto = 7 (0-indexed)
      expect(result.getFullYear()).toBe(2025)
    })

    test('deve parsear datetime sem Z corretamente', () => {
      const input = '2025-08-08 08:00:00'
      const result = parseDatabaseDateTime(input)
      
      expect(result.getHours()).toBe(8)
      expect(result.getMinutes()).toBe(0)
    })

    test('deve parsear datetime com T mas sem Z', () => {
      const input = '2025-08-08T08:00:00.000'
      const result = parseDatabaseDateTime(input)
      
      expect(result.getHours()).toBe(8)
      expect(result.getMinutes()).toBe(0)
    })

    test('deve retornar data atual para string vazia', () => {
      const result = parseDatabaseDateTime('')
      const now = new Date()
      
      expect(result).toBeInstanceOf(Date)
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000)
    })
  })

  describe('extractTimeFromDateTime', () => {
    test('deve extrair horário corretamente de datetime UTC', () => {
      const input = '2025-08-08T08:30:00.000Z'
      const result = extractTimeFromDateTime(input)
      
      expect(result).toBe('08:30')
    })

    test('deve extrair horário corretamente de datetime sem Z', () => {
      const input = '2025-08-08 14:45:00'
      const result = extractTimeFromDateTime(input)
      
      expect(result).toBe('14:45')
    })

    test('deve retornar 00:00 para string vazia', () => {
      const result = extractTimeFromDateTime('')
      expect(result).toBe('00:00')
    })
  })

  describe('toLocalISOString', () => {
    test('deve gerar ISO string sem conversão UTC', () => {
      const date = new Date(2025, 7, 8, 8, 30, 0) // 8 agosto 2025, 8:30
      const result = toLocalISOString(date)
      
      expect(result).toBe('2025-08-08T08:30:00.000')
      expect(result).not.toContain('Z')
    })

    test('deve preservar horário local', () => {
      const date = new Date(2025, 11, 25, 23, 59, 59) // 25 dezembro 2025, 23:59:59
      const result = toLocalISOString(date)
      
      expect(result).toBe('2025-12-25T23:59:59.000')
    })
  })

  describe('toLocalDateString', () => {
    test('deve gerar string de data local', () => {
      const date = new Date(2025, 7, 8, 8, 30, 0) // 8 agosto 2025
      const result = toLocalDateString(date)
      
      expect(result).toBe('2025-08-08')
    })

    test('deve funcionar com diferentes meses/dias', () => {
      const date = new Date(2025, 0, 1, 12, 0, 0) // 1 janeiro 2025
      const result = toLocalDateString(date)
      
      expect(result).toBe('2025-01-01')
    })
  })

  describe('parseDateTime', () => {
    test('deve criar data brasileira a partir de string', () => {
      const result = parseDateTime('2025-08-08', '08:30')
      
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(7) // Agosto
      expect(result.getDate()).toBe(8)
      expect(result.getHours()).toBe(8)
      expect(result.getMinutes()).toBe(30)
    })
  })

  describe('Integration Tests - End to End', () => {
    test('FLUXO COMPLETO: parseDateTime → toLocalISOString → parseDatabaseDateTime', () => {
      // 1. Criar agendamento (frontend)
      const originalDate = parseDateTime('2025-08-08', '08:30')
      
      // 2. Enviar para backend
      const isoString = toLocalISOString(originalDate)
      
      // 3. Ler do banco
      const parsedFromDB = parseDatabaseDateTime(isoString)
      
      // 4. Extrair horário para exibição
      const displayTime = extractTimeFromDateTime(isoString)
      
      // ✅ VALIDAÇÕES: Horário deve ser preservado em todo o fluxo
      expect(originalDate.getHours()).toBe(8)
      expect(originalDate.getMinutes()).toBe(30)
      
      expect(parsedFromDB.getHours()).toBe(8)
      expect(parsedFromDB.getMinutes()).toBe(30)
      
      expect(displayTime).toBe('08:30')
    })

    test('BUG REGRESSÃO: Validar que toISOString() NÃO é usado', () => {
      const date = new Date(2025, 7, 8, 8, 0, 0) // 8 agosto 2025, 8:00
      
      // ❌ Método antigo (problemático)
      const utcISOString = date.toISOString()
      
      // ✅ Método novo (correto)
      const localISOString = toLocalISOString(date)
      
      // 🔍 Os dois devem ser DIFERENTES (provando que a migração funcionou)
      expect(utcISOString).not.toBe(localISOString)
      
      // 🔍 O método correto deve preservar horário
      expect(localISOString).toContain('08:00:00')
    })
  })

  describe('Performance Tests', () => {
    test('parseDatabaseDateTime deve ser rápido', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        parseDatabaseDateTime('2025-08-08T08:00:00.000Z')
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Deve processar 1000 datas em menos de 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})

// 🎯 MOCK DO getBrazilNow para testes determinísticos
jest.mock('../lib/timezone', () => ({
  ...jest.requireActual('../lib/timezone'),
  getBrazilNow: jest.fn(() => new Date(2025, 7, 8, 10, 0, 0)) // 8 agosto 2025, 10:00
}))
