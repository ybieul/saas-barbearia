// API utilities and authentication helpers

import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  userId: string
  email: string
}

export function verifyToken(request: NextRequest): AuthenticatedUser {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autorização não fornecido')
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as AuthenticatedUser
    
    return decoded
  } catch (error) {
    throw new Error('Token inválido ou expirado')
  }
}

export function formatError(message: string, status: number = 500) {
  return {
    message,
    status,
    timestamp: new Date().toISOString()
  }
}

export function formatSuccess(data: any, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  }
}

// Validação de dados
export function validateRequired(data: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field]) {
      return `Campo ${field} é obrigatório`
    }
  }
  return null
}

// Formatação de telefone
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

// Validação de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Formatação de preço
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price)
}

// Cálculo de duração entre datas
export function getMinutesBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

// Verificar se horário está disponível
export function isTimeSlotAvailable(
  appointmentTime: Date,
  duration: number,
  existingAppointments: Array<{ dateTime: Date; duration: number }>
): boolean {
  const appointmentEnd = new Date(appointmentTime.getTime() + duration * 60000)
  
  return !existingAppointments.some(existing => {
    const existingEnd = new Date(existing.dateTime.getTime() + existing.duration * 60000)
    
    return (
      (appointmentTime >= existing.dateTime && appointmentTime < existingEnd) ||
      (appointmentEnd > existing.dateTime && appointmentEnd <= existingEnd) ||
      (appointmentTime <= existing.dateTime && appointmentEnd >= existingEnd)
    )
  })
}
