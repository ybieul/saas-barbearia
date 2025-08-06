"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { FileText, FileSpreadsheet, Loader2, Calendar, Download } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPDF: (period?: string, startDate?: string, endDate?: string) => Promise<void>
  onExportExcel: (period?: string, startDate?: string, endDate?: string) => Promise<void>
  isGenerating: boolean
}

export function ExportModal({ isOpen, onClose, onExportPDF, onExportExcel, isGenerating }: ExportModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [useDateRange, setUseDateRange] = useState(false)
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null)

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'quarter', label: 'Este Trimestre' },
    { value: 'year', label: 'Este Ano' },
    { value: 'last30days', label: 'Últimos 30 Dias' },
  ]

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExportType(type)
    
    try {
      if (useDateRange && dateRange?.from && dateRange?.to) {
        const startDate = format(dateRange.from, 'yyyy-MM-dd')
        const endDate = format(dateRange.to, 'yyyy-MM-dd')
        
        if (type === 'pdf') {
          await onExportPDF('custom', startDate, endDate)
        } else {
          await onExportExcel('custom', startDate, endDate)
        }
      } else {
        if (type === 'pdf') {
          await onExportPDF(selectedPeriod)
        } else {
          await onExportExcel(selectedPeriod)
        }
      }
      
      onClose()
    } catch (error) {
      console.error(`Erro ao gerar ${type.toUpperCase()}:`, error)
    } finally {
      setExportType(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#18181b] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="w-5 h-5 text-[#10b981]" />
            Exportar Relatório Financeiro
          </DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Escolha o período e formato desejado para o seu relatório profissional.
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

          {/* Botões de Exportação */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleExport('pdf')}
              disabled={isGenerating || (useDateRange && (!dateRange?.from || !dateRange?.to))}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 h-12"
            >
              {isGenerating && exportType === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Exportar PDF</div>
                <div className="text-xs opacity-75">Relatório visual</div>
              </div>
            </Button>

            <Button
              onClick={() => handleExport('excel')}
              disabled={isGenerating || (useDateRange && (!dateRange?.from || !dateRange?.to))}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 h-12"
            >
              {isGenerating && exportType === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Exportar Excel</div>
                <div className="text-xs opacity-75">Planilha com dados</div>
              </div>
            </Button>
          </div>

          {/* Descrição dos Formatos */}
          <div className="grid grid-cols-2 gap-4 text-xs text-[#a1a1aa]">
            <div className="space-y-1">
              <p className="font-medium text-red-400">📄 Formato PDF:</p>
              <ul className="space-y-1 ml-2">
                <li>• Design profissional</li>
                <li>• Gráficos visuais</li>
                <li>• Pronto para impressão</li>
                <li>• Apresentação executiva</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-green-400">📊 Formato Excel:</p>
              <ul className="space-y-1 ml-2">
                <li>• Múltiplas abas organizadas</li>
                <li>• Dados editáveis</li>
                <li>• Análise detalhada</li>
                <li>• Manipulação de dados</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
