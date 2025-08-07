import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatBrazilDate, getBrazilNow } from './timezone'
import { FinancialReportData } from './types/financial-report'

// Helper functions para conversão         icon: '%'
      }
    ]ura
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '0'
  return String(value)
}

const safeNumber = (value: any): number => {
  if (value === null || value === undefined || isNaN(Number(value))) return 0
  return Number(value)
}

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
      console.log(`TOKEN ENCONTRADO na chave: ${key}`)
      return token
    }
  }

  // Fallback: tentar obter de cookies
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'auth_token' && value) {
      console.log('TOKEN ENCONTRADO em cookies')
      return value
    }
  }

  return null
}

// Função para buscar dados da API
async function fetchReportData(period: string = 'today', startDate?: string, endDate?: string): Promise<FinancialReportData> {
  // Verificar se está no cliente
  if (typeof window === 'undefined') {
    throw new Error('Esta função só pode ser executada no cliente')
  }

  const token = getAuthToken()
  
  if (!token) {
    console.error('ERRO Debug de autenticação:')
    console.error('- localStorage.auth_token:', localStorage.getItem('auth_token'))
    console.error('- localStorage.token:', localStorage.getItem('token'))
    console.error('- document.cookie:', document.cookie)
    console.error('- window.location:', window.location.href)
    
    // Tentar redirectionar para login se não houver token
    if (window.location.pathname !== '/login') {
      alert('Sessão expirada. Você será redirecionado para o login.')
      window.location.href = '/login'
    }
    
    throw new Error('Token de autenticação não encontrado. Faça login novamente.')
  }

  console.log('REQUISICAO com token:', token.substring(0, 20) + '...')

  // Construir URL da API
  let apiUrl = `/api/reports/financial?period=${period}`
  if (startDate && endDate) {
    apiUrl += `&startDate=${startDate}&endDate=${endDate}`
  }

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('❌ Erro na API:', response.status, errorData)
    
    if (response.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('auth_token')
      localStorage.removeItem('token')
      localStorage.removeItem('authToken')
      alert('Sua sessão expirou. Você será redirecionado para o login.')
      window.location.href = '/login'
      throw new Error('Token expirado ou inválido. Faça login novamente.')
    }
    
    if (response.status === 404) {
      throw new Error('Estabelecimento não encontrado. Verifique sua conta.')
    }
    
    throw new Error(`Erro ao buscar dados do relatório: ${response.status}`)
  }

  const data = await response.json()
  console.log('✅ Dados do relatório obtidos com sucesso')
  return data
}

// Função para gerar PDF com design profissional
export async function generatePDFReport(period: string = 'today', startDate?: string, endDate?: string): Promise<void> {
  try {
    const data = await fetchReportData(period, startDate, endDate)
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let yPos = 20

    // Cores do tema profissional mais rico (como tuplas)
    const primaryColor: [number, number, number] = [16, 185, 129] // Verde elegante
    const secondaryColor: [number, number, number] = [30, 41, 59] // Azul escuro moderno
    const accentColor: [number, number, number] = [99, 102, 241] // Roxo corporativo
    const lightGray: [number, number, number] = [248, 250, 252] // Cinza muito claro
    const darkGray: [number, number, number] = [71, 85, 105] // Cinza escuro

    // Helper function para verificar quebra de página
    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 30) {
        doc.addPage()
        yPos = 20
      }
    }

    // ========== CABEÇALHO PROFISSIONAL COM DESIGN MODERNO ==========
    // Fundo sutil para o cabeçalho
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(20, 10, pageWidth - 40, 60, 'F')
    
    // Logo placeholder (pode ser substituído por logo real)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.circle(50, 35, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('🏢', 45, 40)
    
    // Título principal com design moderno
    doc.setFontSize(32)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('RELATÓRIO FINANCEIRO', 80, 35)
    
    // Subtítulo elegante
    doc.setFontSize(14)
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.text('Análise Profissional de Performance', 80, 45)
    
    // Data de geração em destaque
    doc.setFontSize(10)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text(`Gerado em ${formatBrazilDate(new Date())}`, 80, 55)
    
    yPos = 90

    // ========== INFORMAÇÕES DA EMPRESA COM LAYOUT MELHORADO ==========
    // Card com informações da empresa
    doc.setFillColor(250, 251, 252) // Fundo muito sutil
    doc.roundedRect(40, yPos, pageWidth - 80, 40, 3, 3, 'F')
    
    // Borda esquerda colorida
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(40, yPos, 4, 40, 'F')
    
    yPos += 10
    
    // Nome da empresa em destaque
    doc.setFontSize(16)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`${data.establishment.name}`, 50, yPos)
    yPos += 8

    // Informações organizadas em duas colunas
    doc.setFontSize(9)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    
    let leftColumn = 50
    let rightColumn = pageWidth / 2 + 20
    let currentY = yPos
    
    if (data.establishment.cnpj) {
      doc.text(`CNPJ: ${data.establishment.cnpj}`, leftColumn, currentY)
      currentY += 5
    }
    if (data.establishment.address) {
      doc.text(`Endereco: ${data.establishment.address}`, leftColumn, currentY)
      currentY += 5
    }
    
    // Coluna direita
    currentY = yPos
    if (data.establishment.phone) {
      doc.text(`Telefone: ${data.establishment.phone}`, rightColumn, currentY)
      currentY += 5
    }
    doc.text(`Email: ${data.establishment.email}`, rightColumn, currentY)
    
    yPos += 35

    // ========== RESUMO EXECUTIVO COM DESIGN MODERNO ==========
    checkPageBreak(100)
    
    // Título da seção com ícone e linha decorativa
    doc.setFontSize(20)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('RESUMO EXECUTIVO', 40, yPos)
    
    // Linha decorativa
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(1)
    doc.line(40, yPos + 5, pageWidth - 40, yPos + 5)
    yPos += 20

    // Cards de KPIs com design moderno
    const kpiCards = [
      {
        title: 'Faturamento Total',
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(data.summary.totalRevenue)),
        color: primaryColor,
        icon: '$'
      },
      {
        title: 'Total de Agendamentos',
        value: safeToString(data.summary.totalAppointments),
        color: accentColor,
        icon: '#'
      },
      {
        title: 'Ticket Medio',
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(data.summary.averageTicket)),
        color: [34, 197, 94], // Verde claro
        icon: 'TM'
      },
      {
        title: 'Taxa de Conversao',
        value: `${safeToString(data.summary.conversionRate)}%`,
        color: [249, 115, 22], // Laranja
        icon: '%'
      }
    ]

    // Renderizar cards em grid 2x2
    const cardWidth = (pageWidth - 100) / 2
    const cardHeight = 35
    let cardX = 40
    let cardY = yPos

    kpiCards.forEach((kpi, index) => {
      if (index === 2) {
        cardX = 40
        cardY += cardHeight + 10
      } else if (index === 1 || index === 3) {
        cardX = 40 + cardWidth + 20
      }

      // Fundo do card
      doc.setFillColor(250, 251, 252)
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'F')
      
      // Borda colorida
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2])
      doc.rect(cardX, cardY, 4, cardHeight, 'F')
      
      // Ícone
      doc.setFontSize(14)
      doc.text(kpi.icon, cardX + 10, cardY + 15)
      
      // Título
      doc.setFontSize(10)
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      doc.text(kpi.title, cardX + 25, cardY + 12)
      
      // Valor
      doc.setFontSize(16)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text(kpi.value, cardX + 25, cardY + 25)
    })

    yPos = cardY + cardHeight + 20

    // ========== INFORMAÇÕES DO PERÍODO ==========
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
    doc.rect(40, yPos, pageWidth - 80, 20, 'F')
    
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text(`${data.period.label} | ${formatBrazilDate(new Date(data.period.generatedAt))} | ${data.generatedBy.name}`, 45, yPos + 13)
    
    yPos += 35

    // ========== RECEITA DIÁRIA - ÚLTIMOS 30 DIAS ==========
    checkPageBreak(100)
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RECEITA DIÁRIA - ÚLTIMOS 30 DIAS', 40, yPos)
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
      day.date || 'N/A',
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(day.revenue)),
      safeToString(day.appointmentCount)
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
      service.serviceName || 'N/A',
      safeToString(service.count),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(service.total)),
      `${safeToString(service.percentage)}%`
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
      doc.text('RECEITA POR PROFISSIONAL', 40, yPos)
      yPos += 15

      const professionalData = data.revenueByProfessional.map(professional => [
        professional.professionalName || 'N/A',
        safeToString(professional.count),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(professional.total)),
        `${safeToString(professional.percentage)}%`
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
        payment.method || 'N/A',
        safeToString(payment.count),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNumber(payment.amount)),
        `${safeToString(payment.percentage)}%`
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