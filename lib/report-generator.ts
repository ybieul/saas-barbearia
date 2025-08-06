"use client"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { formatBrazilDate, getBrazilNow } from './timezone'
import { FinancialReportData } from './types/financial-report'

// Função para obter token com múltiplos fallbacks
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  // Tentar múltiplas chaves de token no localStorage
  const tokenKeys = ['auth_token', 'token', 'authToken']
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key)
    if (token) {
      console.log(`✅ Token encontrado na chave: ${key}`)
      return token
    }
  }

  // Fallback: tentar obter de cookies
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'auth_token' && value) {
      console.log('✅ Token encontrado em cookies')
      return value
    }
  }

  return null
}

// Função para buscar dados da API
async function fetchReportData(period: string = 'today'): Promise<FinancialReportData> {
  // Verificar se está no cliente
  if (typeof window === 'undefined') {
    throw new Error('Esta função só pode ser executada no cliente')
  }

  const token = getAuthToken()
  
  if (!token) {
    console.error('❌ Debug de autenticação:')
    console.error('- localStorage.auth_token:', localStorage.getItem('auth_token'))
    console.error('- localStorage.token:', localStorage.getItem('token'))
    console.error('- document.cookie:', document.cookie)
    throw new Error('Token de autenticação não encontrado. Faça login novamente.')
  }

  console.log('🔐 Fazendo requisição com token:', token.substring(0, 20) + '...')

  const response = await fetch(`/api/reports/financial?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('❌ Erro na API:', response.status, errorData)
    
    if (response.status === 401) {
      throw new Error('Token expirado ou inválido. Faça login novamente.')
    }
    
    throw new Error(`Erro ao buscar dados do relatório: ${response.status}`)
  }

  const data = await response.json()
  console.log('✅ Dados do relatório obtidos com sucesso')
  return data
}

// Função para gerar PDF com design profissional
export async function generatePDFReport(period: string = 'today'): Promise<void> {
  try {
    const data = await fetchReportData(period)
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let yPos = 20

    // Cores do tema profissional (como tuplas)
    const primaryColor: [number, number, number] = [16, 185, 129] // Verde elegante
    const secondaryColor: [number, number, number] = [55, 65, 81] // Cinza escuro
    const lightGray: [number, number, number] = [243, 244, 246] // Cinza claro

    // Helper function para verificar quebra de página
    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 30) {
        doc.addPage()
        yPos = 20
      }
    }

    // ========== CABEÇALHO PROFISSIONAL ==========
    doc.setFontSize(28)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Linha divisória
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(2)
    doc.line(40, yPos, pageWidth - 40, yPos)
    yPos += 15

    // Informações da empresa
    doc.setFontSize(14)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`${data.establishment.name}`, 40, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    if (data.establishment.cnpj) {
      doc.text(`CNPJ: ${data.establishment.cnpj}`, 40, yPos)
      yPos += 6
    }
    if (data.establishment.address) {
      doc.text(`Endereço: ${data.establishment.address}`, 40, yPos)
      yPos += 6
    }
    if (data.establishment.phone) {
      doc.text(`Telefone: ${data.establishment.phone}`, 40, yPos)
      yPos += 6
    }
    doc.text(`E-mail: ${data.establishment.email}`, 40, yPos)
    yPos += 15

    // Informações do relatório
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`Período: ${data.period.label}`, 40, yPos)
    yPos += 6
    doc.text(`Gerado em: ${formatBrazilDate(new Date(data.period.generatedAt))} às ${new Date(data.period.generatedAt).toLocaleTimeString('pt-BR')}`, 40, yPos)
    yPos += 6
    doc.text(`Gerado por: ${data.generatedBy.name} (${data.generatedBy.email})`, 40, yPos)
    yPos += 20

    // ========== RESUMO EXECUTIVO - KPIs ==========
    checkPageBreak(80)
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('📊 RESUMO EXECUTIVO', 40, yPos)
    yPos += 15

    const kpiData = [
      ['Faturamento Total', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.totalRevenue)],
      ['Total de Agendamentos', data.summary.totalAppointments.toString()],
      ['Ticket Médio', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.averageTicket)],
      ['Taxa de Conversão', `${data.summary.conversionRate}%`]
    ]

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: kpiData,
      startY: yPos,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255,
        fontSize: 12,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 11,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { left: 40, right: 40 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 20

    // ========== RECEITA DIÁRIA - ÚLTIMOS 30 DIAS ==========
    checkPageBreak(100)
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('📈 RECEITA DIÁRIA - ÚLTIMOS 30 DIAS', 40, yPos)
    yPos += 10

    // Estatísticas da receita diária
    doc.setFontSize(11)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`Total nos últimos 30 dias: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.total)}`, 40, yPos)
    yPos += 6
    doc.text(`Média diária: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.average)}`, 40, yPos)
    yPos += 6
    doc.text(`Melhor dia: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.dailyRevenue.best)} (${data.dailyRevenue.bestDate})`, 40, yPos)
    yPos += 15

    // Tabela dos últimos 10 dias (para não sobrecarregar)
    const recentDays = data.dailyRevenue.data.slice(-10).map(day => [
      day.date,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue),
      day.appointmentCount.toString()
    ])

    autoTable(doc, {
      head: [['Data', 'Receita', 'Agendamentos']],
      body: recentDays,
      startY: yPos,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'center' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 20

    // ========== TRANSAÇÕES RECENTES ==========
    checkPageBreak(100)
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('💰 TRANSAÇÕES RECENTES', 40, yPos)
    yPos += 15

    const transactionData = data.transactions.slice(0, 15).map(transaction => [
      transaction.date,
      transaction.client,
      transaction.services.substring(0, 20) + (transaction.services.length > 20 ? '...' : ''),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount),
      transaction.method
    ])

    autoTable(doc, {
      head: [['Data', 'Cliente', 'Serviços', 'Valor', 'Pagamento']],
      body: transactionData,
      startY: yPos,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25 }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 20

    // ========== SERVIÇOS MAIS VENDIDOS ==========
    checkPageBreak(80)
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('🏆 SERVIÇOS MAIS VENDIDOS', 40, yPos)
    yPos += 15

    const servicesData = data.revenueByService.slice(0, 10).map(service => [
      service.serviceName,
      service.count.toString(),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.total),
      `${service.percentage}%`
    ])

    autoTable(doc, {
      head: [['Serviço', 'Qtd', 'Total Faturado', '% do Total']],
      body: servicesData,
      startY: yPos,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 20

    // ========== RECEITA POR PROFISSIONAL ==========
    if (data.revenueByProfessional.length > 0) {
      checkPageBreak(80)
      doc.setFontSize(18)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('👨‍💼 RECEITA POR PROFISSIONAL', 40, yPos)
      yPos += 15

      const professionalData = data.revenueByProfessional.map(professional => [
        professional.professionalName,
        professional.count.toString(),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(professional.total),
        `${professional.percentage}%`
      ])

      autoTable(doc, {
        head: [['Profissional', 'Agendamentos', 'Total Faturado', '% do Total']],
        body: professionalData,
        startY: yPos,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor, 
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: secondaryColor
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        margin: { left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 20
    }

    // ========== FORMAS DE PAGAMENTO ==========
    if (data.paymentMethods.length > 0) {
      checkPageBreak(80)
      doc.setFontSize(18)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('💳 FORMAS DE PAGAMENTO', 40, yPos)
      yPos += 15

      const paymentData = data.paymentMethods.map(payment => [
        payment.method,
        payment.count.toString(),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount),
        `${payment.percentage}%`
      ])

      autoTable(doc, {
        head: [['Forma de Pagamento', 'Transações', 'Valor Total', '% das Transações']],
        body: paymentData,
        startY: yPos,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor, 
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: secondaryColor
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        margin: { left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' }
        }
      })
    }

    // ========== RODAPÉ ==========
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 40, pageHeight - 10, { align: 'right' })
      doc.text(`Relatório gerado em ${formatBrazilDate(new Date())} por ${data.generatedBy.name}`, 40, pageHeight - 10)
    }

    // Fazer download do PDF
    const fileName = `relatorio-financeiro-${data.period.label.toLowerCase().replace(/\s+/g, '-')}-${formatBrazilDate(new Date()).replace(/\//g, '-')}.pdf`
    doc.save(fileName)
    
    console.log('✅ PDF gerado com sucesso:', fileName)

  } catch (error) {
    console.error('❌ Erro ao gerar relatório PDF:', error)
    
    // Lançar erro mais específico baseado no tipo
    if (error instanceof Error) {
      if (error.message.includes('Token')) {
        throw new Error('Sessão expirada. Faça login novamente para gerar o relatório.')
      } else if (error.message.includes('buscar dados')) {
        throw new Error('Erro ao obter dados do servidor. Verifique sua conexão e tente novamente.')
      } else if (error.message.includes('cliente')) {
        throw new Error('Erro interno. Recarregue a página e tente novamente.')
      }
    }
    
    throw new Error('Erro inesperado ao gerar PDF. Tente novamente em alguns instantes.')
  }
}

// Função para gerar Excel com múltiplas abas e design profissional
export async function generateExcelReport(period: string = 'today'): Promise<void> {
  try {
    const data = await fetchReportData(period)
    
    const workbook = new ExcelJS.Workbook()
    workbook.creator = data.generatedBy.name
    workbook.lastModifiedBy = data.generatedBy.name
    workbook.created = new Date()
    workbook.modified = new Date()

    // ========== ABA 1: RESUMO EXECUTIVO ==========
    const summarySheet = workbook.addWorksheet('Resumo')
    
    // Configurar larguras das colunas
    summarySheet.columns = [
      { key: 'A', width: 25 },
      { key: 'B', width: 20 },
      { key: 'C', width: 20 },
      { key: 'D', width: 20 }
    ]

    // Cabeçalho da empresa
    summarySheet.getCell('A1').value = 'RELATÓRIO FINANCEIRO'
    summarySheet.getCell('A1').font = { size: 20, bold: true, color: { argb: '10B981' } }
    summarySheet.mergeCells('A1:D1')
    summarySheet.getCell('A1').alignment = { horizontal: 'center' }

    summarySheet.getCell('A3').value = data.establishment.name
    summarySheet.getCell('A3').font = { size: 14, bold: true }
    summarySheet.mergeCells('A3:D3')

    if (data.establishment.cnpj) {
      summarySheet.getCell('A4').value = `CNPJ: ${data.establishment.cnpj}`
      summarySheet.getCell('A4').font = { size: 10 }
    }

    if (data.establishment.address) {
      summarySheet.getCell('A5').value = `Endereço: ${data.establishment.address}`
      summarySheet.getCell('A5').font = { size: 10 }
    }

    summarySheet.getCell('A6').value = `Período: ${data.period.label}`
    summarySheet.getCell('A6').font = { size: 10, bold: true }

    summarySheet.getCell('A7').value = `Gerado em: ${formatBrazilDate(new Date(data.period.generatedAt))} por ${data.generatedBy.name}`
    summarySheet.getCell('A7').font = { size: 10 }

    // KPIs Principais
    summarySheet.getCell('A10').value = 'INDICADORES PRINCIPAIS'
    summarySheet.getCell('A10').font = { size: 14, bold: true, color: { argb: '10B981' } }
    summarySheet.mergeCells('A10:B10')

    const kpiStartRow = 12
    const kpis = [
      ['Faturamento Total', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.totalRevenue)],
      ['Total de Agendamentos', data.summary.totalAppointments.toString()],
      ['Ticket Médio', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.averageTicket)],
      ['Taxa de Conversão', `${data.summary.conversionRate}%`]
    ]

    kpis.forEach((kpi, index) => {
      const row = kpiStartRow + index
      summarySheet.getCell(`A${row}`).value = kpi[0]
      summarySheet.getCell(`A${row}`).font = { bold: true }
      summarySheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } }
      
      summarySheet.getCell(`B${row}`).value = kpi[1]
      summarySheet.getCell(`B${row}`).font = { bold: true }
      summarySheet.getCell(`B${row}`).alignment = { horizontal: 'right' }
      
      // Bordas
      const cols = ['A', 'B']
      cols.forEach((col: string) => {
        summarySheet.getCell(`${col}${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // ========== ABA 2: TODAS AS TRANSAÇÕES ==========
    const transactionsSheet = workbook.addWorksheet('Todas as Transações')
    
    // Configurar larguras das colunas
    transactionsSheet.columns = [
      { key: 'A', width: 12 }, // Data
      { key: 'B', width: 8 },  // Hora
      { key: 'C', width: 25 }, // Cliente
      { key: 'D', width: 20 }, // Profissional
      { key: 'E', width: 30 }, // Serviços
      { key: 'F', width: 15 }, // Valor
      { key: 'G', width: 15 }  // Pagamento
    ]

    // Cabeçalho
    const headers = ['Data', 'Hora', 'Cliente', 'Profissional', 'Serviços', 'Valor', 'Pagamento']
    headers.forEach((header, index) => {
      const cell = transactionsSheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Dados das transações
    data.transactions.forEach((transaction, index) => {
      const row = index + 2
      transactionsSheet.getCell(`A${row}`).value = transaction.date
      transactionsSheet.getCell(`B${row}`).value = transaction.time
      transactionsSheet.getCell(`C${row}`).value = transaction.client
      transactionsSheet.getCell(`D${row}`).value = transaction.professional
      transactionsSheet.getCell(`E${row}`).value = transaction.services
      transactionsSheet.getCell(`F${row}`).value = transaction.amount
      transactionsSheet.getCell(`F${row}`).numFmt = '"R$" #,##0.00'
      transactionsSheet.getCell(`G${row}`).value = transaction.method

      // Zebrar linhas
      if (index % 2 === 0) {
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
        cols.forEach((col: string) => {
          transactionsSheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } }
        })
      }

      // Bordas
      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
      cols.forEach((col: string) => {
        transactionsSheet.getCell(`${col}${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // Congelar painel no cabeçalho
    transactionsSheet.views = [{ state: 'frozen', ySplit: 1 }]

    // ========== ABA 3: RECEITA POR SERVIÇO ==========
    const servicesSheet = workbook.addWorksheet('Receita por Serviço')
    
    servicesSheet.columns = [
      { key: 'A', width: 30 }, // Serviço
      { key: 'B', width: 15 }, // Quantidade
      { key: 'C', width: 18 }, // Total
      { key: 'D', width: 15 }  // Percentual
    ]

    // Cabeçalho
    const serviceHeaders = ['Serviço', 'Atendimentos', 'Total Faturado', '% do Total']
    serviceHeaders.forEach((header, index) => {
      const cell = servicesSheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Dados dos serviços
    data.revenueByService.forEach((service, index) => {
      const row = index + 2
      servicesSheet.getCell(`A${row}`).value = service.serviceName
      servicesSheet.getCell(`B${row}`).value = service.count
      servicesSheet.getCell(`B${row}`).alignment = { horizontal: 'center' }
      servicesSheet.getCell(`C${row}`).value = service.total
      servicesSheet.getCell(`C${row}`).numFmt = '"R$" #,##0.00'
      servicesSheet.getCell(`D${row}`).value = `${service.percentage}%`
      servicesSheet.getCell(`D${row}`).alignment = { horizontal: 'center' }

      // Zebrar linhas
      if (index % 2 === 0) {
        const cols = ['A', 'B', 'C', 'D']
        cols.forEach((col: string) => {
          servicesSheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } }
        })
      }

      // Bordas
      const cols = ['A', 'B', 'C', 'D']
      cols.forEach((col: string) => {
        servicesSheet.getCell(`${col}${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // ========== ABA 4: RECEITA POR PROFISSIONAL ==========
    if (data.revenueByProfessional.length > 0) {
      const professionalsSheet = workbook.addWorksheet('Receita por Profissional')
      
      professionalsSheet.columns = [
        { key: 'A', width: 25 }, // Profissional
        { key: 'B', width: 15 }, // Agendamentos
        { key: 'C', width: 18 }, // Total
        { key: 'D', width: 15 }  // Percentual
      ]

      // Cabeçalho
      const professionalHeaders = ['Profissional', 'Agendamentos', 'Total Faturado', '% do Total']
      professionalHeaders.forEach((header, index) => {
        const cell = professionalsSheet.getCell(1, index + 1)
        cell.value = header
        cell.font = { bold: true, color: { argb: 'FFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
        cell.alignment = { horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      // Dados dos profissionais
      data.revenueByProfessional.forEach((professional, index) => {
        const row = index + 2
        professionalsSheet.getCell(`A${row}`).value = professional.professionalName
        professionalsSheet.getCell(`B${row}`).value = professional.count
        professionalsSheet.getCell(`B${row}`).alignment = { horizontal: 'center' }
        professionalsSheet.getCell(`C${row}`).value = professional.total
        professionalsSheet.getCell(`C${row}`).numFmt = '"R$" #,##0.00'
        professionalsSheet.getCell(`D${row}`).value = `${professional.percentage}%`
        professionalsSheet.getCell(`D${row}`).alignment = { horizontal: 'center' }

        // Zebrar linhas
        if (index % 2 === 0) {
          const cols = ['A', 'B', 'C', 'D']
          cols.forEach((col: string) => {
            professionalsSheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } }
          })
        }

        // Bordas
        const cols = ['A', 'B', 'C', 'D']
        cols.forEach((col: string) => {
          professionalsSheet.getCell(`${col}${row}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      })
    }

    // ========== ABA 5: RECEITA DIÁRIA ==========
    const dailySheet = workbook.addWorksheet('Receita Diária')
    
    dailySheet.columns = [
      { key: 'A', width: 12 }, // Data
      { key: 'B', width: 18 }, // Receita
      { key: 'C', width: 15 }  // Agendamentos
    ]

    // Cabeçalho
    const dailyHeaders = ['Data', 'Receita', 'Agendamentos']
    dailyHeaders.forEach((header, index) => {
      const cell = dailySheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Dados diários
    data.dailyRevenue.data.forEach((day, index) => {
      const row = index + 2
      dailySheet.getCell(`A${row}`).value = day.date
      dailySheet.getCell(`B${row}`).value = day.revenue
      dailySheet.getCell(`B${row}`).numFmt = '"R$" #,##0.00'
      dailySheet.getCell(`C${row}`).value = day.appointmentCount
      dailySheet.getCell(`C${row}`).alignment = { horizontal: 'center' }

      // Zebrar linhas
      if (index % 2 === 0) {
        const cols = ['A', 'B', 'C']
        cols.forEach((col: string) => {
          dailySheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } }
        })
      }

      // Bordas
      const cols = ['A', 'B', 'C']
      cols.forEach((col: string) => {
        dailySheet.getCell(`${col}${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // Fazer download do Excel
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    const fileName = `relatorio-financeiro-${data.period.label.toLowerCase().replace(/\s+/g, '-')}-${formatBrazilDate(new Date()).replace(/\//g, '-')}.xlsx`
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log('✅ Excel gerado com sucesso:', fileName)

  } catch (error) {
    console.error('❌ Erro ao gerar relatório Excel:', error)
    
    // Lançar erro mais específico baseado no tipo
    if (error instanceof Error) {
      if (error.message.includes('Token')) {
        throw new Error('Sessão expirada. Faça login novamente para gerar o relatório.')
      } else if (error.message.includes('buscar dados')) {
        throw new Error('Erro ao obter dados do servidor. Verifique sua conexão e tente novamente.')
      } else if (error.message.includes('cliente')) {
        throw new Error('Erro interno. Recarregue a página e tente novamente.')
      }
    }
    
    throw new Error('Erro inesperado ao gerar Excel. Tente novamente em alguns instantes.')
  }
}
