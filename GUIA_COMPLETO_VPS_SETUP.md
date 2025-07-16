# 🚀 GUIA COMPLETO - Setup VPS Ubuntu + SaaS Barbearia

## 📂 **PASSO 1: Preparar Repositório GitHub**

### **1.1 Criar repositório no GitHub:**
1. Acesse: https://github.com
2. Clique em **"New repository"**
3. Nome: `saas-barbearia`
4. Deixe **público** ou **privado**
5. **NÃO** marque "Initialize with README"
6. Clique **"Create repository"**

### **1.2 Preparar projeto local:**
```bash
# No seu computador (pasta e:\SaasV0)
cd e:\SaasV0

# Inicializar Git (se não foi feito)
git init

# Adicionar arquivos
git add .

# Fazer primeiro commit
git commit -m "Primeiro commit - SaaS Barbearia"

# Conectar com GitHub (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/saas-barbearia.git

# Enviar para GitHub
git branch -M main
git push -u origin main
```

### **1.3 Configurar .gitignore:**
```bash
# Criar .gitignore se não existir
echo "node_modules/
.next/
.env.local
.env
*.log
.DS_Store
dist/
build/" > .gitignore

# Atualizar repositório
git add .gitignore
git commit -m "Adicionar .gitignore"
git push
```

---

## 🔧 **PASSO 2-5: Configuração Inicial VPS** 
(Execute os passos 2-5 do setup básico: atualizar Ubuntu, instalar Node.js, MySQL, Nginx)

---

## 📁 **PASSO 6: Deploy via GitHub**

## 📁 **PASSO 6: Deploy via GitHub**

### **6.1 Clonar repositório no VPS:**
```bash
# Conectar ao VPS
ssh root@SEU_IP_VPS

# Ir para pasta web
cd /var/www

# Clonar seu repositório
git clone https://github.com/SEU_USUARIO/saas-barbearia.git

# Renomear pasta (opcional)
mv saas-barbearia saas-barbearia-app

# Dar permissões
chown -R $USER:$USER /var/www/saas-barbearia-app
cd /var/www/saas-barbearia-app
```

### **6.2 Configurar .env no VPS:**
```bash
# Copiar template de produção
cp .env.production .env

# Editar com dados reais
nano .env

# Configure:
DATABASE_URL="mysql://saas_user:SuaSenhaForte123!@localhost:3306/barbershop_saas"
NEXTAUTH_URL="https://rifadosvianna.com.br"
APP_URL="https://rifadosvianna.com.br"
NEXTAUTH_SECRET="sua-chave-super-secreta-gerada"

# Gerar chave secreta
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Salvar: Ctrl+O, Enter, Ctrl+X
```

### **6.3 Deploy automático:**
```bash
# Executar script de deploy
chmod +x deploy.sh
./deploy.sh

# OU manualmente:
npm install --production
npx prisma generate
npx prisma db push
npm run build
```

---

## 🔄 **ATUALIZAÇÃO VIA GITHUB (Futuras atualizações)**

### **Workflow de atualização:**

**1. No seu computador (desenvolvimento):**
```bash
# Fazer mudanças no código
# Testar localmente
npm run dev

# Commit das alterações
git add .
git commit -m "Descrição da alteração"
git push origin main
```

**2. No VPS (produção):**
```bash
# Conectar ao VPS
ssh root@SEU_IP_VPS

# Ir para pasta do projeto
cd /var/www/saas-barbearia-app

# Puxar atualizações
git pull origin main

# Instalar novas dependências (se houver)
npm install --production

# Atualizar banco (se houver mudanças no schema)
npx prisma generate
npx prisma db push

# Rebuildar aplicação
npm run build

# Reiniciar aplicação
pm2 restart saas-barbearia

# Verificar se está funcionando
pm2 status
pm2 logs saas-barbearia --lines 20
```

---

## 🚀 **SCRIPT DE ATUALIZAÇÃO AUTOMÁTICA**

### **Criar script de update:**
```bash
# No VPS, criar script de atualização
nano /var/www/saas-barbearia-app/update.sh

# Cole o conteúdo:
#!/bin/bash
echo "🔄 Atualizando SaaS Barbearia..."
cd /var/www/saas-barbearia-app
git pull origin main
npm install --production
npx prisma generate
npx prisma db push
npm run build
pm2 restart saas-barbearia
echo "✅ Atualização concluída!"
pm2 status

# Dar permissão de execução
chmod +x update.sh

# Para atualizar no futuro, só executar:
./update.sh
```

---

## 🔑 **CONFIGURAR DEPLOY KEYS (Para repositório privado)**

### **Se seu repositório for privado:**
```bash
# No VPS, gerar chave SSH
ssh-keygen -t rsa -b 4096 -C "vps@rifadosvianna.com.br"

# Copiar chave pública
cat ~/.ssh/id_rsa.pub

# No GitHub:
# 1. Ir em: Settings > Deploy keys
# 2. Add deploy key
# 3. Colar a chave pública
# 4. Marcar "Allow write access" se quiser push

# Testar conexão
ssh -T git@github.com

# Clonar usando SSH
git clone git@github.com:SEU_USUARIO/saas-barbearia.git
```

---

## 🌐 **CONFIGURAR WEBHOOK (Deploy automático)**

### **Deploy automático a cada push:**

**1. No VPS, criar endpoint:**
```bash
# Instalar dependências para webhook
npm install -g webhook

# Criar script de webhook
nano /home/webhook-deploy.sh

# Cole o conteúdo:
#!/bin/bash
cd /var/www/saas-barbearia-app
git pull origin main
npm install --production
npm run build
pm2 restart saas-barbearia

# Dar permissão
chmod +x /home/webhook-deploy.sh

# Iniciar webhook
webhook -hooks webhook.json -verbose
```

**2. No GitHub:**
```
Settings > Webhooks > Add webhook
URL: http://SEU_IP_VPS:9000/hooks/deploy
Content type: application/json
Events: Just the push event
```

### **6.4 Instalar dependências e configurar banco:**
```bash
# Instalar dependências
npm install --production

# Gerar Prisma Client
npx prisma generate

# Criar tabelas no banco (AUTOMÁTICO!)
npx prisma db push

# Fazer build da aplicação
npm run build
```

---

## 🚀 **PASSO 7: Iniciar Aplicação com PM2**

### **7.1 Configurar PM2:**
```bash
# Criar arquivo de configuração PM2
nano ecosystem.config.js

# Cole o conteúdo:
module.exports = {
  apps: [{
    name: 'saas-barbearia',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/saas-barbearia',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}

# Salvar: Ctrl+O, Enter, Ctrl+X
```

### **7.2 Iniciar aplicação:**
```bash
# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs saas-barbearia
```

---

## 🔒 **PASSO 8: Configurar SSL (HTTPS)**

### **8.1 Instalar Certbot:**
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL GRATUITO
sudo certbot --nginx -d rifadosvianna.com.br -d www.rifadosvianna.com.br

# Seguir instruções na tela:
# 1. Digite seu email
# 2. Aceite os termos (Y)
# 3. Escolha se quer compartilhar email (Y/N)
# 4. Escolha redirecionamento HTTPS (2 - recomendado)
```

### **8.2 Configurar renovação automática:**
```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar cron para renovação automática
sudo crontab -e

# Adicionar linha (escolha editor nano se perguntar):
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🌐 **PASSO 9: Configurar DNS na Hostinger**

### **9.1 No painel da Hostinger:**
1. Acesse **"Zona DNS"** do seu domínio
2. Configure os registros:

```
Tipo: A
Nome: @
Conteúdo: SEU_IP_VPS

Tipo: A  
Nome: www
Conteúdo: SEU_IP_VPS

Tipo: CNAME
Nome: agenda
Conteúdo: rifadosvianna.com.br
```

### **9.2 Aguardar propagação:**
- **Tempo**: 1-24 horas
- **Teste**: `nslookup rifadosvianna.com.br`

---

## ✅ **PASSO 10: Verificações Finais**

### **10.1 Verificar serviços:**
```bash
# Status do Nginx
sudo systemctl status nginx

# Status do MySQL
sudo systemctl status mysql

# Status da aplicação
pm2 status

# Ver logs da aplicação
pm2 logs saas-barbearia --lines 50

# Uso de recursos
htop
```

### **10.2 Testar aplicação:**
```bash
# Testar conexão local
curl http://localhost:3000

# Testar banco de dados
npx prisma db pull
```

### **10.3 Acessar via navegador:**
- **HTTP**: `http://rifadosvianna.com.br`
- **HTTPS**: `https://rifadosvianna.com.br`

---

## 🔧 **PASSO 11: Comandos Úteis para Manutenção**

### **11.1 Atualizar aplicação:**
```bash
# Ir para pasta
cd /var/www/saas-barbearia

# Puxar atualizações (se usando Git)
git pull origin main

# Instalar novas dependências
npm install --production

# Rebuildar se necessário
npm run build

# Reiniciar aplicação
pm2 restart saas-barbearia
```

### **11.2 Monitoramento:**
```bash
# Ver logs em tempo real
pm2 logs saas-barbearia

# Monitorar recursos
pm2 monit

# Reiniciar se travar
pm2 restart saas-barbearia

# Ver status de todos os serviços
pm2 status
```

### **11.3 Backup do banco:**
```bash
# Backup do banco de dados
mysqldump -u saas_user -p barbershop_saas > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u saas_user -p barbershop_saas < backup_20250116.sql
```

---

## 🚨 **TROUBLESHOOTING**

### **Se der erro de conexão:**
```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar logs de erro
pm2 logs saas-barbearia --err

# Reiniciar tudo
pm2 restart saas-barbearia
sudo systemctl restart nginx
```

### **Se não conseguir acessar:**
```bash
# Verificar firewall
sudo ufw status

# Verificar DNS
nslookup rifadosvianna.com.br

# Testar porta 3000 diretamente
curl http://SEU_IP_VPS:3000
```

---

## 🎉 **PRONTO!**

Seu SaaS estará rodando em:
- **🌐 Site**: `https://rifadosvianna.com.br`
- **📱 Mobile**: Totalmente responsivo
- **🔒 SSL**: Certificado válido
- **⚡ Performance**: Otimizada para produção

### **Recursos ativos:**
✅ Next.js rodando em produção  
✅ MySQL com todas as tabelas  
✅ SSL/HTTPS configurado  
✅ PM2 monitorando aplicação  
✅ Nginx como proxy reverso  
✅ Firewall configurado  
✅ Renovação SSL automática  

**Seu SaaS de Barbearia está ONLINE! 🚀**
