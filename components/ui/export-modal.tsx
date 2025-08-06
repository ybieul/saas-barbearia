"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet, Download } from "lucide-react"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPDF: () => void
  onExportExcel: () => void
  isGenerating?: boolean
}

export function ExportModal({ 
  isOpen, 
  onClose, 
  onExportPDF, 
  onExportExcel, 
  isGenerating = false 
}: ExportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#18181b] border-[#27272a]">
        <DialogHeader>
          <DialogTitle className="text-[#ededed] flex items-center gap-2">
            <Download className="w-5 h-5 text-[#10b981]" />
            Exportar Relatório Financeiro
          </DialogTitle>
          <DialogDescription className="text-[#71717a]">
            Escolha o formato desejado para exportar o relatório completo
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={onExportPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 h-12 bg-red-600 hover:bg-red-700 text-white"
          >
            <FileText className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Exportar como PDF</span>
              <span className="text-xs opacity-90">Relatório visual com gráficos</span>
            </div>
          </Button>
          
          <Button
            onClick={onExportExcel}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 h-12 bg-green-600 hover:bg-green-700 text-white"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Exportar como Excel</span>
              <span className="text-xs opacity-90">Planilha editável com dados</span>
            </div>
          </Button>
        </div>
        
        {isGenerating && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-[#10b981]">
              <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Gerando relatório...</span>
            </div>
          </div>
        )}
        
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isGenerating}
            className="text-[#71717a] hover:text-[#ededed]"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
