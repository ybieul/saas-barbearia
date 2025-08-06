import jsPDF from 'jspdf'
import 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { formatBrazilDate, getBrazilNow } from './timezone'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void
    lastAutoTable: {
      finalY: number
    }
  }
}

interface ReportData {
  businessName: string
  userEmail: string
  period: string
  financialStats: Array<{
    title: string
    value: string
    change: string
    changeType: string
  }>
  dailyRevenue: {
    total: number
    average: number
    best: number
    bestDate: string
    data: Array<{
      date: string
      revenue: number
      appointmentCount: number
    }>
  }
  monthlyAnalysis: {
    month: string
    revenue: number
    appointments: number
    ticketMedio: number
    mediaDiaria: number
  }
  recentTransactions: Array<{
    client: string
    service: string
    amount: number
    method: string
    time: string
  }>
  topServices: Array<{
    service: string
    count: number
    revenue: number
    percentage: number
  }>
  paymentMethods: Array<{
    method: string
    percentage: number
    amount: number
    count: number
  }>
}

export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  let yPos = 20

  // Cores do tema
  const primaryColor = '#10b981'
  const textColor = '#374151'
  const headerColor = '#1f2937'

  // Helper function para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.height - 20) {
      doc.addPage()
      yPos = 20
    }
  }

  // 1. CABEÇALHO
  doc.setFontSize(24)
  doc.setTextColor(headerColor)
  doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  doc.setFontSize(12)
  doc.setTextColor(textColor)
  doc.text(`Empresa: ${data.businessName}`, 20, yPos)
  yPos += 8
  doc.text(`E-mail: ${data.userEmail}`, 20, yPos)
  yPos += 8
  doc.text(`Período: ${data.period}`, 20, yPos)
  yPos += 8
  doc.text(`Gerado em: ${formatBrazilDate(getBrazilNow())} às ${getBrazilNow().toLocaleTimeString('pt-BR')}`, 20, yPos)
  yPos += 20

  // 2. RESUMO FINANCEIRO
  checkPageBreak(60)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('📊 RESUMO FINANCEIRO', 20, yPos)
  yPos += 10

  const financialData = data.financialStats.map(stat => [
    stat.title,
    stat.value,
    stat.change
  ])

  doc.autoTable({
    head: [['Métrica', 'Valor', 'Variação']],
    body: financialData,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // 3. RECEITA DIÁRIA
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('📈 RECEITA DIÁRIA - ÚLTIMOS 30 DIAS', 20, yPos)
  yPos += 15

  doc.setFontSize(12)
  doc.setTextColor(textColor)
  doc.text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.total)}`, 20, yPos)
  yPos += 8
  doc.text(`Média Diária: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.average)}`, 20, yPos)
  yPos += 8
  doc.text(`Melhor Dia: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.best)} (${data.dailyRevenue.bestDate})`, 20, yPos)
  yPos += 15

  // Tabela dos últimos 7 dias (para não sobrecarregar)
  const recentDays = data.dailyRevenue.data.slice(-7).map(day => [
    new Date(day.date).toLocaleDateString('pt-BR'),
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue),
    day.appointmentCount.toString()
  ])

  doc.autoTable({
    head: [['Data', 'Receita', 'Agendamentos']],
    body: recentDays,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // 4. ANÁLISE MENSAL
  checkPageBreak(60)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('📆 ANÁLISE MENSAL', 20, yPos)
  yPos += 10

  const monthlyData = [[
    data.monthlyAnalysis.month,
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.monthlyAnalysis.revenue),
    data.monthlyAnalysis.appointments.toString(),
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.monthlyAnalysis.ticketMedio),
    data.monthlyAnalysis.mediaDiaria.toString()
  ]]

  doc.autoTable({
    head: [['Mês', 'Faturamento Total', 'Agendamentos', 'Ticket Médio', 'Média Diária']],
    body: monthlyData,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // 5. TRANSAÇÕES RECENTES
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('💰 TRANSAÇÕES RECENTES', 20, yPos)
  yPos += 10

  const transactionData = data.recentTransactions.slice(0, 10).map(transaction => [
    transaction.client,
    transaction.service,
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount),
    transaction.method,
    transaction.time
  ])

  doc.autoTable({
    head: [['Cliente', 'Serviço', 'Valor', 'Pagamento', 'Horário']],
    body: transactionData,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // 6. SERVIÇOS MAIS VENDIDOS
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('🏆 SERVIÇOS MAIS VENDIDOS', 20, yPos)
  yPos += 10

  const servicesData = data.topServices.map(service => [
    service.service,
    service.count.toString(),
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.revenue),
    `${service.percentage}%`
  ])

  doc.autoTable({
    head: [['Serviço', 'Atendimentos', 'Total Faturado', '% do Total']],
    body: servicesData,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 20

  // 7. FORMAS DE PAGAMENTO
  checkPageBreak(80)
  doc.setFontSize(16)
  doc.setTextColor(primaryColor)
  doc.text('💳 FORMAS DE PAGAMENTO', 20, yPos)
  yPos += 10

  const paymentData = data.paymentMethods.map(payment => [
    payment.method,
    `${payment.percentage}%`,
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount),
    payment.count.toString()
  ])

  doc.autoTable({
    head: [['Método', '% do Total', 'Valor Total', 'Transações']],
    body: paymentData,
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  })

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor('#9CA3AF')
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' })
  }

  // Gerar o arquivo e fazer download
  const fileName = `relatorio-financeiro-${formatBrazilDate(getBrazilNow()).split('/').reverse().join('-')}.pdf`
  
  const pdfBlob = doc.output('blob')
  const url = window.URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  
  window.URL.revokeObjectURL(url)
}

export async function generateExcelReport(data: ReportData): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // 1. ABA RESUMO
  const resumoSheet = workbook.addWorksheet('Resumo')
  
  // Cabeçalho do relatório
  resumoSheet.addRow(['RELATÓRIO FINANCEIRO'])
  resumoSheet.addRow([`Empresa: ${data.businessName}`])
  resumoSheet.addRow([`E-mail: ${data.userEmail}`])
  resumoSheet.addRow([`Período: ${data.period}`])
  resumoSheet.addRow([`Gerado em: ${formatBrazilDate(getBrazilNow())} às ${getBrazilNow().toLocaleTimeString('pt-BR')}`])
  resumoSheet.addRow([]) // Linha vazia
  
  // Resumo financeiro
  resumoSheet.addRow(['RESUMO FINANCEIRO'])
  resumoSheet.addRow(['Métrica', 'Valor', 'Variação'])
  data.financialStats.forEach(stat => {
    resumoSheet.addRow([stat.title, stat.value, stat.change])
  })

  // 2. ABA RECEITA DIÁRIA
  const receitaSheet = workbook.addWorksheet('Receita Diária')
  
  receitaSheet.addRow(['RECEITA DIÁRIA - ÚLTIMOS 30 DIAS'])
  receitaSheet.addRow([`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.total)}`])
  receitaSheet.addRow([`Média Diária: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.average)}`])
  receitaSheet.addRow([`Melhor Dia: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.best)} (${data.dailyRevenue.bestDate})`])
  receitaSheet.addRow([]) // Linha vazia
  
  receitaSheet.addRow(['Data', 'Receita do Dia', 'Agendamentos'])
  data.dailyRevenue.data.forEach(day => {
    receitaSheet.addRow([
      new Date(day.date).toLocaleDateString('pt-BR'),
      day.revenue,
      day.appointmentCount
    ])
  })

  // 3. ABA ANÁLISE MENSAL
  const mensalSheet = workbook.addWorksheet('Análise Mensal')
  
  mensalSheet.addRow(['ANÁLISE MENSAL'])
  mensalSheet.addRow(['Mês', 'Faturamento Total', 'Agendamentos', 'Ticket Médio', 'Média Diária'])
  mensalSheet.addRow([
    data.monthlyAnalysis.month,
    data.monthlyAnalysis.revenue,
    data.monthlyAnalysis.appointments,
    data.monthlyAnalysis.ticketMedio,
    data.monthlyAnalysis.mediaDiaria
  ])

  // 4. ABA TRANSAÇÕES
  const transacoesSheet = workbook.addWorksheet('Transações')
  
  transacoesSheet.addRow(['TRANSAÇÕES RECENTES'])
  transacoesSheet.addRow(['Cliente', 'Serviço', 'Valor', 'Pagamento', 'Horário'])
  data.recentTransactions.forEach(transaction => {
    transacoesSheet.addRow([
      transaction.client,
      transaction.service,
      transaction.amount,
      transaction.method,
      transaction.time
    ])
  })

  // 5. ABA SERVIÇOS
  const servicosSheet = workbook.addWorksheet('Serviços')
  
  servicosSheet.addRow(['SERVIÇOS MAIS VENDIDOS'])
  servicosSheet.addRow(['Serviço', 'Atendimentos', 'Total Faturado', '% do Total'])
  data.topServices.forEach(service => {
    servicosSheet.addRow([
      service.service,
      service.count,
      service.revenue,
      service.percentage
    ])
  })

  // 6. ABA PAGAMENTOS
  const pagamentosSheet = workbook.addWorksheet('Pagamentos')
  
  pagamentosSheet.addRow(['FORMAS DE PAGAMENTO'])
  pagamentosSheet.addRow(['Método', '% do Total', 'Valor Total', 'Transações'])
  data.paymentMethods.forEach(payment => {
    pagamentosSheet.addRow([
      payment.method,
      payment.percentage,
      payment.amount,
      payment.count
    ])
  })

  // Gerar o arquivo e fazer download
  const fileName = `relatorio-financeiro-${formatBrazilDate(getBrazilNow()).split('/').reverse().join('-')}.xlsx`
  
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  
  window.URL.revokeObjectURL(url)
}
