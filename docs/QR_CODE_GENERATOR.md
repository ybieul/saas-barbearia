# Gerador de QR Code - TymerBook

## Funcionalidade Implementada

Esta funcionalidade permite que os estabelecimentos gerem QR Codes para facilitar o agendamento dos seus clientes.

### Como Funciona

1. **Acesso**: Na página de Configurações > Estabelecimento
2. **Botão**: "Gerar QR Code para Impressão" (localizado na seção "Link Público do Agendamento")
3. **Modal**: Abre uma prévia do cartaz com QR Code
4. **Download**: Botão "Baixar PDF" gera um arquivo para impressão

### URL Gerada

```
https://tymerbook.com/agendamento/[customLink]
```

Onde `[customLink]` é o link personalizado do estabelecimento configurado no banco de dados.

### Componentes Criados

#### `components/qr-code-modal.tsx`
- Modal responsivo com prévia do cartaz
- Geração do QR Code usando `react-qr-code`
- Export para PDF usando `html2canvas` e `jspdf`
- Design otimizado para impressão

### Bibliotecas Adicionadas

```json
{
  "react-qr-code": "^2.0.15",
  "jspdf": "^2.5.2",
  "html2canvas": "^1.4.1"
}
```

### Layout do Cartaz

O cartaz gerado inclui:
- ✅ Logo do estabelecimento (se configurado)
- ✅ Nome do estabelecimento
- ✅ Título "Agende seu horário aqui!"
- ✅ Instruções para uso
- ✅ QR Code centralizado (200x200px)
- ✅ URL completa por extenso
- ✅ Branding "Powered by TymerBook"

### Características Técnicas

- **Responsivo**: Funciona em desktop e mobile
- **Qualidade**: QR Code em alta resolução (scale: 2)
- **Formato**: PDF A4 com margem adequada
- **Arquivo**: Nome personalizado baseado no estabelecimento
- **Loading**: Estado de "Gerando PDF..." durante processamento

### Como Usar

1. Configure o "Link Personalizado" nas configurações
2. Clique em "Gerar QR Code para Impressão"
3. Visualize a prévia no modal
4. Clique em "Baixar PDF"
5. Imprima e cole no estabelecimento

### Validações

- Botão desabilitado se não houver `customLink` configurado
- Tratamento de erros na geração do PDF
- Feedback visual durante o processamento

### Benefícios

- **Facilita agendamentos**: Clientes escaneiam e agendam rapidamente
- **Marketing**: Material físico no estabelecimento
- **Tecnologia**: QR Code funciona em qualquer smartphone
- **Profissional**: Design limpo e branding consistente
