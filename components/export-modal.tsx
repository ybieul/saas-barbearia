"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { FileText, Loader2, Calendar, Download } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPDF: (period?: string, startDate?: string, endDate?: string) => Promise<void>
  isGenerating: boolean
}

export function ExportModal({ isOpen, onClose, onExportPDF, isGenerating }: ExportModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [useDateRange, setUseDateRange] = useState(false)

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'quarter', label: 'Este Trimestre' },
    { value: 'year', label: 'Este Ano' },
    { value: 'last30days', label: 'Últimos 30 Dias' },
  ]

  const handleExport = async () => {
    try {
      if (useDateRange && dateRange?.from && dateRange?.to) {
        const startDate = format(dateRange.from, 'yyyy-MM-dd')
        const endDate = format(dateRange.to, 'yyyy-MM-dd')
        await onExportPDF('custom', startDate, endDate)
      } else {
        await onExportPDF(selectedPeriod)
      }
      onClose()
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#18181b] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="w-5 h-5 text-[#10b981]" />
            Exportar Relatório Financeiro
          </DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Escolha o período desejado para gerar seu relatório profissional em PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Seleção de Período */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#a1a1aa]">Período do Relatório:</label>
            <div className="space-y-3">
              <Select 
                value={useDateRange ? 'custom' : selectedPeriod} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setUseDateRange(true)
                  } else {
                    setUseDateRange(false)
                    setSelectedPeriod(value)
                  }
                }}
              >
                <SelectTrigger className="bg-[#27272a] border-[#3f3f46] text-white">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent className="bg-[#27272a] border-[#3f3f46]">
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-[#3f3f46]">
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-white hover:bg-[#3f3f46]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Período Customizado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {useDateRange && (
                <div className="flex justify-center">
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                    placeholder="Selecione o período desejado"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Informações do Período Selecionado */}
          <div className="bg-[#27272a] rounded-lg p-4 border border-[#3f3f46]">
            <h4 className="text-sm font-medium text-[#10b981] mb-2">📊 Período Selecionado:</h4>
            <p className="text-sm text-[#a1a1aa]">
              {useDateRange && dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                : periodOptions.find(opt => opt.value === selectedPeriod)?.label || 'Nenhum período selecionado'
              }
            </p>
          </div>

          {/* Botão de Exportação */}
          <Button
            onClick={handleExport}
            disabled={isGenerating || (useDateRange && (!dateRange?.from || !dateRange?.to))}
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 h-12"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <div className="text-center">
              <div className="font-medium">
                {isGenerating ? 'Gerando Relatório...' : 'Exportar Relatório PDF'}
              </div>
              <div className="text-xs opacity-75">
                {isGenerating ? 'Aguarde alguns instantes' : 'Relatório visual profissional'}
              </div>
            </div>
          </Button>

          {/* Descrição do Formato */}
          <div className="bg-[#27272a] rounded-lg p-4 border border-[#3f3f46] text-xs text-[#a1a1aa]">
            <p className="font-medium text-red-400 mb-2">📄 Formato PDF Profissional:</p>
            <ul className="space-y-1 ml-2">
              <li>• Design executivo com identidade visual</li>
              <li>• Gráficos e indicadores visuais</li>
              <li>• Pronto para impressão e apresentação</li>
              <li>• Resumo executivo com KPIs principais</li>
              <li>• Análise detalhada de faturamento</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
