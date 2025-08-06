// Interfaces para os dados do relatório financeiro

export interface EstablishmentData {
  name: string
  cnpj: string
  address: string
  phone: string
  email: string
}

export interface GeneratedByData {
  name: string
  email: string
}

export interface PeriodData {
  label: string
  start: string | null
  end: string | null
  generatedAt: string
}

export interface SummaryData {
  totalRevenue: number
  totalAppointments: number
  averageTicket: number
  conversionRate: string
}

export interface TransactionData {
  date: string
  time: string
  client: string
  professional: string
  services: string
  amount: number
  method: string
}

export interface RevenueByServiceData {
  serviceName: string
  total: number
  count: number
  percentage: string
}

export interface RevenueByProfessionalData {
  professionalName: string
  total: number
  count: number
  percentage: string
}

export interface DailyRevenueData {
  date: string
  revenue: number
  appointmentCount: number
}

export interface DailyRevenueStats {
  total: number
  average: number
  best: number
  bestDate: string
  data: DailyRevenueData[]
}

export interface PaymentMethodData {
  method: string
  count: number
  amount: number
  percentage: string
}

export interface FinancialReportData {
  establishment: EstablishmentData
  generatedBy: GeneratedByData
  period: PeriodData
  summary: SummaryData
  transactions: TransactionData[]
  revenueByService: RevenueByServiceData[]
  revenueByProfessional: RevenueByProfessionalData[]
  dailyRevenue: DailyRevenueStats
  paymentMethods: PaymentMethodData[]
}
