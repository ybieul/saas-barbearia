# 🚀 SETUP COMPLETO VPS - SaaS Barbearia

## 📋 **PRÉ-REQUISITOS**
- VPS Ubuntu limpo
- Acesso SSH como root
- Domínio apontando para o IP do VPS

---

## 🔧 **PASSO 1: Configuração Inicial do Sistema**

```bash
# Conectar ao VPS
ssh root@SEU_IP_VPS

# Atualizar sistema
apt update && apt upgrade -y

# Instalar utilitários essenciais
apt install -y curl wget git nano htop ufw
```

---

## 🟢 **PASSO 2: Instalar Node.js**

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar instalação
node --version
npm --version

# Instalar PM2 globalmente
npm install -g pm2
```

---

## 🗄️ **PASSO 3: Instalar e Configurar MySQL**

```bash
# Instalar MySQL Server
apt install -y mysql-server

# Configurar MySQL (segurança)
mysql_secure_installation
# Responda:
# - Validate password? Y
# - Password strength: 2 (STRONG)
# - Set root password: [SUA_SENHA_ROOT]
# - Remove anonymous users? Y
# - Disallow root login remotely? Y
# - Remove test database? Y
# - Reload privilege tables? Y

# Entrar no MySQL
mysql -u root -p

# Dentro do MySQL, execute:
CREATE DATABASE barbershop_saas;
CREATE USER 'saas_user'@'localhost' IDENTIFIED BY 'SuaSenhaForte123!';
GRANT ALL PRIVILEGES ON barbershop_saas.* TO 'saas_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Testar conexão
mysql -u saas_user -p barbershop_saas
# Se conectar e mostrar mysql>, está funcionando! Digite: EXIT;
```

---

## 🌐 **PASSO 4: Instalar e Configurar Nginx**

```bash
# Instalar Nginx
apt install -y nginx

# Criar configuração do site
nano /etc/nginx/sites-available/saas-barbearia

# Cole o conteúdo abaixo:
server {
    listen 80;
    server_name rifadosvianna.com.br www.rifadosvianna.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Salvar: Ctrl+O, Enter, Ctrl+X

# Ativar site
ln -s /etc/nginx/sites-available/saas-barbearia /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## 🔒 **PASSO 5: Configurar Firewall**

```bash
# Configurar UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000
ufw --force enable

# Verificar status
ufw status
```

---

## 📁 **PASSO 6: Clonar e Configurar Projeto**

```bash
# Ir para pasta web
cd /var/www

# Clonar repositório
git clone https://github.com/ybieul/saas-barbearia.git
cd saas-barbearia

# Dar permissões
chown -R $USER:$USER /var/www/saas-barbearia

# Criar arquivo .env
nano .env

# Cole o conteúdo (SUBSTITUA AS CREDENCIAIS):
# ============================================
# MYSQL DATABASE CONFIG
# ============================================
DATABASE_URL="mysql://agenda:Agenda.14587@localhost:3306/agendasaas"

# ============================================
# AUTHENTICATION
# ============================================
NEXTAUTH_SECRET="413238fd3d62a1960527c95c77573200d3c1e5bef4e563b1c8c364a6a15f1b34"
NEXTAUTH_URL="https://rifadosvianna.com.br"

# ============================================
# WHATSAPP API INTEGRATION
# ============================================
WHATSAPP_API_URL="https://api.whatsapp.com/send"
WHATSAPP_API_TOKEN="seu-token-whatsapp-aqui"
WHATSAPP_PHONE_NUMBER="5511999999999"

# ============================================
# EMAIL CONFIGURATION
# ============================================
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="noreply@rifadosvianna.com.br"
SMTP_PASS="sua-senha-email"

# ============================================
# STORAGE
# ============================================
UPLOAD_DIR="/uploads"
MAX_FILE_SIZE="5242880"

# ============================================
# APP CONFIGURATION
# ============================================
APP_NAME="AgendaPRO"
APP_URL="https://rifadosvianna.com.br"
ENVIRONMENT="production"

# Salvar: Ctrl+O, Enter, Ctrl+X

# Gerar chave secreta para NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copie o resultado e substitua no .env acima
```

---

## 🚀 **PASSO 7: Instalar Dependências e Deploy**

```bash
# Instalar dependências
npm install --legacy-peer-deps

# Gerar Prisma Client
npx prisma generate

# Criar tabelas no banco
npx prisma db push

# Fazer build da aplicação>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
npm run build

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar com o sistema
pm2 startup
# Execute o comando que aparecer na tela

# Verificar se está funcionando
pm2 status
pm2 logs saas-barbearia
```

---

## 🔒 **PASSO 8: Configurar SSL (HTTPS)**

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d rifadosvianna.com.br -d www.rifadosvianna.com.br

# Seguir instruções:
# 1. Digite seu email
# 2. Aceite os termos (Y)
# 3. Compartilhar email? (Y/N - sua escolha)
# 4. Redirecionamento HTTPS? 2 (recomendado)

# Configurar renovação automática
crontab -e
# Adicione a linha:
0 12 * * * /usr/bin/certbot renew --quiet

# Testar renovação
certbot renew --dry-run
```

---

## ✅ **PASSO 9: Verificações Finais**

```bash
# Verificar todos os serviços
systemctl status nginx
systemctl status mysql
pm2 status

# Testar aplicação
curl http://localhost:3000

# Ver logs se houver problemas
pm2 logs saas-barbearia --lines 50
tail -f /var/log/nginx/error.log
```

---

## 🌐 **PASSO 10: Testar no Navegador**

Acesse no navegador:
- **HTTP**: `http://rifadosvianna.com.br`
- **HTTPS**: `https://rifadosvianna.com.br`

---

## 🔄 **COMANDOS ÚTEIS PARA MANUTENÇÃO**

```bash
# Reiniciar aplicação
pm2 restart saas-barbearia

# Ver logs em tempo real
pm2 logs saas-barbearia

# Atualizar código do GitHub
cd /var/www/saas-barbearia
git pull origin main
npm install --production --legacy-peer-deps
npm run build
pm2 restart saas-barbearia

# Backup do banco
mysqldump -u saas_user -p barbershop_saas > backup_$(date +%Y%m%d).sql

# Monitorar recursos
htop
pm2 monit
```

---

## 🚨 **TROUBLESHOOTING**

### Se a aplicação não iniciar:
```bash
pm2 logs saas-barbearia --err
```

### Se não conseguir acessar via domínio:
```bash
# Verificar DNS
nslookup rifadosvianna.com.br

# Testar nginx
nginx -t
systemctl restart nginx
```

### Se der erro de banco:
```bash
# Testar conexão MySQL
mysql -u saas_user -p barbershop_saas

# Verificar .env
cat .env | grep DATABASE_URL
```

---

## 🎉 **PRONTO!**

Seu SaaS estará rodando em: **https://rifadosvianna.com.br**

✅ Next.js em produção  
✅ MySQL configurado  
✅ SSL/HTTPS ativo  
✅ PM2 monitorando  
✅ Nginx como proxy  
✅ Sistema completo funcionando!

**Tempo estimado: 30-45 minutos** ⏱️
