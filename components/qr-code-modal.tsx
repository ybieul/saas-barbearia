"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import QRCode from 'react-qr-code'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Download, QrCode } from 'lucide-react'
import { useState } from 'react'

interface QrCodeModalProps {
  isOpen: boolean
  onClose: () => void
  customLink: string
  businessName: string
  businessLogo?: string
}

export function QrCodeModal({ isOpen, onClose, customLink, businessName, businessLogo }: QrCodeModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Construir a URL completa do TymerBook
  const publicUrl = `https://tymerbook.com/agendamento/${customLink}`

  const handleDownloadPdf = async () => {
    setIsGenerating(true)
    
    try {
      const element = document.getElementById('printableArea')
      
      if (element) {
        // Capturar o elemento como imagem com fundo branco garantido
        const canvas = await html2canvas(element, { 
          scale: 2, 
          backgroundColor: '#ffffff' // Garantir fundo branco
        })
        
        const imgData = canvas.toDataURL('image/png')
        
        const pdf = new jsPDF('p', 'mm', 'a4') // 'p' para portrait, 'mm' para milímetros, 'a4' para tamanho
        
        const pdfWidth = pdf.internal.pageSize.getWidth()    // Largura da página A4 em mm
        const pdfHeight = pdf.internal.pageSize.getHeight()  // Altura da página A4 em mm
        
        const imgProps = pdf.getImageProperties(imgData)
        const imgWidth = imgProps.width
        const imgHeight = imgProps.height

        // Calcular a proporção da imagem
        const ratio = imgHeight / imgWidth

        // Definir largura máxima da imagem no PDF com margem (ex: 10mm de cada lado)
        const maxPdfImageWidth = pdfWidth - 20 // 20mm de margem total (10mm esquerda, 10mm direita)
        let finalImgWidth = maxPdfImageWidth
        let finalImgHeight = maxPdfImageWidth * ratio

        // Se a altura calculada for maior que a altura do PDF (com margem), 
        // ajusta pela altura para garantir que não corte
        const maxPdfImageHeight = pdfHeight - 20 // 20mm de margem total (10mm topo, 10mm base)
        if (finalImgHeight > maxPdfImageHeight) {
          finalImgHeight = maxPdfImageHeight
          finalImgWidth = finalImgHeight / ratio
        }

        // Centralizar a imagem no PDF
        const x = (pdfWidth - finalImgWidth) / 2
        const y = (pdfHeight - finalImgHeight) / 2
        
        // Adiciona a imagem ao PDF
        pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight)
        
        // Inicia o download
        pdf.save(`TymerBook-QRCode-${businessName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-2xl mx-auto max-h-[90vh] flex flex-col rounded-xl">
        {/* Header */}
        <DialogHeader className="border-b border-[#27272a] pb-4 flex-shrink-0">
          <DialogTitle className="text-[#ededed] text-xl font-semibold flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
              <QrCode className="w-5 h-5 text-[#10b981]" />
            </div>
            Gerar QR Code para Agendamento
          </DialogTitle>
          <DialogDescription className="text-[#71717a]">
            Crie um cartaz com QR Code para seus clientes agendarem facilmente
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Área de preview do cartaz */}
          <div className="flex justify-center mb-6">
            <div 
              id="printableArea" 
              className="bg-white text-black p-8 rounded-lg shadow-lg"
              style={{ 
                width: '400px',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {/* Logo do estabelecimento (se existir) */}
              {businessLogo && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={businessLogo} 
                    alt={businessName}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              
              {/* Título principal */}
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                {businessName}
              </h2>
              
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-4">
                Agende seu horário aqui!
              </h3>
              
              <p className="text-center text-gray-600 mb-6 text-sm leading-relaxed">
                Aponte a câmera do seu celular para o código abaixo ou acesse o link diretamente.
              </p>
              
              {/* QR Code */}
              <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-lg">
                <QRCode 
                  value={publicUrl} 
                  size={200}
                  viewBox="0 0 256 256"
                  style={{
                    height: "auto",
                    maxWidth: "100%",
                    width: "100%"
                  }}
                />
              </div>
              
              {/* URL por extenso */}
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-center text-xs font-mono break-all text-gray-700">
                  {publicUrl}
                </p>
              </div>
              
              {/* Rodapé com branding */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-center text-xs text-gray-500">
                  Powered by TymerBook
                </p>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-[#10b981] mb-1">Como usar:</h4>
                <ul className="text-sm text-[#71717a] space-y-1">
                  <li>• Baixe o PDF e imprima o cartaz</li>
                  <li>• Cole em local visível no seu estabelecimento</li>
                  <li>• Clientes podem escanear com a câmera do celular</li>
                  <li>• O link leva direto para sua página de agendamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex gap-3 p-6 border-t border-[#27272a] flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 border-[#3f3f46] text-[#71717a] hover:text-[#ededed] hover:bg-[#27272a]"
          >
            Fechar
          </Button>
          <Button 
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
