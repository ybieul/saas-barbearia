# 📅 Sistema de Agendador de Tarefas - WhatsApp Lembretes

## 🚀 Visão Geral

Este sistema implementa um agendador de tarefas persistente usando `node-cron` para enviar lembretes automáticos do WhatsApp a cada 5 minutos.

## 📁 Estrutura dos Arquivos

### `scripts/whatsapp-reminders-cron.ts`
- **Função Principal**: `sendWhatsappReminders()`
- **Propósito**: Contém toda a lógica de busca de agendamentos e envio de lembretes
- **Exportável**: Pode ser importado por outros módulos
- **Executável**: Pode ser executado diretamente para testes

### `scripts/scheduler.ts`
- **Função Principal**: Agendador usando `node-cron`
- **Propósito**: Executa a lógica de lembretes a cada 5 minutos
- **Executável**: Deve ficar rodando em background no servidor

## 🛠️ Como Usar

### 1. Executar Lembretes Manualmente (Para Teste)
```bash
# Executa uma única verificação de lembretes
npm run reminders:run

# Ou usando tsx diretamente
npx tsx scripts/whatsapp-reminders-cron.ts
```

### 2. Iniciar o Agendador (Produção)
```bash
# Inicia o agendador que roda a cada 5 minutos
npm run scheduler:start

# Para desenvolvimento (reinicia automaticamente)
npm run scheduler:dev
```

### 3. Verificar Se Está Funcionando
O agendador mostra logs como:
```
✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.
Aguardando o próximo intervalo de 5 minutos para executar a tarefa de lembretes...

[25/01/2025 14:05:00] === INICIANDO TAREFA AGENDADA: Verificação de Lembretes ===
Iniciando a lógica de verificação e envio de lembretes...
[2025-01-25T17:05:00.000Z] Iniciando processamento de lembretes...
Processando reminder_24h...
[25/01/2025 14:05:00] === TAREFA AGENDADA CONCLUÍDA COM SUCESSO ===
```

## ⏰ Tipos de Lembretes

O sistema processa 3 tipos de lembretes:
- **reminder_24h**: 24 horas antes do agendamento
- **reminder_12h**: 12 horas antes do agendamento  
- **reminder_2h**: 2 horas antes do agendamento

## 🔄 Como Funciona

### Processo de Verificação (A cada 5 minutos):
1. **Busca agendamentos** dentro da janela de tempo de cada tipo de lembrete
2. **Verifica configurações** se a automação está ativa para o estabelecimento
3. **Checa histórico** para evitar envio duplicado de lembretes
4. **Envia mensagens** via WhatsApp Evolution API
5. **Registra o envio** na tabela `appointment_reminders`

### Janela de Tempo:
- Cada tipo de lembrete tem uma **janela de 10 minutos** (±5 min do horário exato)
- Isso garante que nenhum lembrete seja perdido mesmo com pequenos atrasos

## 📊 Logs e Monitoramento

### Logs do Agendador:
- ✅ Início e fim de cada tarefa agendada
- 🔍 Quantos agendamentos foram encontrados para cada tipo
- 📤 Confirmação de envio de cada lembrete
- ❌ Erros detalhados quando algo falha

### Exemplo de Logs:
```
Processando reminder_24h...
Buscando agendamentos entre 2025-01-26T17:00:00.000Z e 2025-01-26T17:10:00.000Z
Encontrados 2 agendamentos para reminder_24h
✅ Lembrete reminder_24h enviado para João Silva
✅ Lembrete reminder_24h enviado para Maria Santos
[2025-01-25T17:05:30.000Z] Processamento concluído. Total de lembretes enviados: 2
```

## 🚀 Deploy em Produção

### Opção 1: PM2 (Recomendado)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o agendador
pm2 start "npm run scheduler:start" --name "whatsapp-scheduler"

# Ver status
pm2 status

# Ver logs
pm2 logs whatsapp-scheduler

# Reiniciar
pm2 restart whatsapp-scheduler

# Parar
pm2 stop whatsapp-scheduler
```

### Opção 2: Docker
```dockerfile
# Adicionar ao Dockerfile
CMD ["npm", "run", "scheduler:start"]
```

### Opção 3: Systemd (Linux)
```bash
# Criar serviço systemd
sudo nano /etc/systemd/system/whatsapp-scheduler.service

# Conteúdo do arquivo:
[Unit]
Description=WhatsApp Scheduler
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/saas-barbearia
ExecStart=/usr/bin/npm run scheduler:start
Restart=always

[Install]
WantedBy=multi-user.target

# Ativar o serviço
sudo systemctl enable whatsapp-scheduler
sudo systemctl start whatsapp-scheduler
sudo systemctl status whatsapp-scheduler
```

## 🔧 Troubleshooting

### Problema: Lembretes não estão sendo enviados
1. Verificar se o agendador está rodando: `pm2 status`
2. Verificar logs: `pm2 logs whatsapp-scheduler`
3. Verificar configurações de automação no banco de dados
4. Testar envio manual: `npm run reminders:run`

### Problema: Muitos logs
- Os logs são importantes para debugging
- Em produção, configure rotação de logs no PM2 ou systemd

### Problema: Falha na conexão com banco
- Verificar se as variáveis de ambiente estão corretas
- Verificar se o banco está acessível
- O sistema tentará reconectar automaticamente

## 🎯 Próximos Passos

1. **Deploy**: Subir o agendador no servidor de produção
2. **Monitoramento**: Configurar alertas para falhas
3. **Otimização**: Ajustar frequência se necessário (atualmente 5 min)
4. **Backup**: Garantir que os dados de lembretes sejam preservados

---

**Desenvolvido para**: SaaS Barbearia  
**Versão**: 1.0  
**Data**: Janeiro 2025
