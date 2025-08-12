# 🔄 REINSTALAÇÃO COMPLETA VPS - SaaS Barbearia
*Guia para migração de Ubuntu com backups do .env e SQL*

## 📋 **O QUE VOCÊ PRECISA TER EM MÃOS**
- ✅ Backup do arquivo `.env` 
- ✅ Backup do banco SQL (`backup.sql` ou similar)
- ✅ Acesso SSH à nova VPS Ubuntu
- ✅ Domínio já configurado (DNS apontando para IP)

---

## ⚡ **INSTALAÇÃO RÁPIDA - UBUNTU LIMPO**

### **🔧 PASSO 1: Preparar Sistema Base**
```bash
# Conectar à VPS
ssh root@SEU_IP_VPS

# Atualizar sistema
apt update && apt upgrade -y

# Instalar ferramentas essenciais
apt install -y curl wget git nano htop ufw unzip

# Configurar timezone Brasil
timedatectl set-timezone America/Sao_Paulo
```

### **🟢 PASSO 2: Instalar Node.js 20 LTS**
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x

# Instalar PM2 globalmente
npm install -g pm2 pnpm
```

### **🗄️ PASSO 3: Instalar MySQL 8.0**
```bash
# Instalar MySQL
apt install -y mysql-server

# Configurar segurança
mysql_secure_installation
# Configure senha root forte
# Responda Y para todas as opções de segurança

# Testar MySQL
systemctl status mysql
```

### **🌐 PASSO 4: Instalar Nginx**
```bash
# Instalar Nginx
apt install -y nginx

# Ativar serviços
systemctl enable nginx mysql
systemctl start nginx mysql

# Verificar status
systemctl status nginx
systemctl status mysql
```

### **🔒 PASSO 5: Configurar Firewall**
```bash
# Configurar UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000
ufw --force enable

# Verificar
ufw status
```

---

## 📁 **PASSO 6: CONFIGURAR PROJETO**

### **6.1 Clonar Repositório**
```bash
# Ir para pasta web
cd /var/www

# Clonar projeto
git clone https://github.com/ybieul/saas-barbearia.git
cd saas-barbearia

# Dar permissões corretas
chown -R www-data:www-data /var/www/saas-barbearia
chmod -R 755 /var/www/saas-barbearia
```

### **6.2 Restaurar Arquivo .env**
```bash
# Criar .env a partir do seu backup
nano .env

# ✨ COLE O CONTEÚDO DO SEU BACKUP .ENV AQUI
# Certifique-se de que tem todas as variáveis necessárias:
# - DATABASE_URL
# - NEXTAUTH_SECRET  
# - NEXTAUTH_URL
# - WHATSAPP_* (se usando)
# - SMTP_* (se usando email)

# Salvar: Ctrl+O, Enter, Ctrl+X
```

**⚠️ IMPORTANTE**: Verifique se sua `DATABASE_URL` no .env está correta para o novo servidor:
```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/nome_banco"
```

### **6.3 Instalar Dependências**
```bash
# Instalar dependências (use pnpm se tiver no projeto)
npm install --legacy-peer-deps
# OU se usar pnpm:
# pnpm install

# Gerar Prisma Client
npx prisma generate
```

---

## 🗄️ **PASSO 7: RESTAURAR BANCO DE DADOS**

### **7.1 Criar Banco e Usuário**
```bash
# Entrar no MySQL
mysql -u root -p

# Dentro do MySQL, execute:
CREATE DATABASE barbershop_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Crie o usuário (use dados do seu .env)
CREATE USER 'saas_user'@'localhost' IDENTIFIED BY 'SuaSenhaDoBackup';
GRANT ALL PRIVILEGES ON barbershop_saas.* TO 'saas_user'@'localhost';
FLUSH PRIVILEGES;

# Testar conexão
\q
mysql -u saas_user -p barbershop_saas
```

### **7.2 Restaurar Backup SQL**
```bash
# Subir seu backup SQL para o servidor (via scp, sftp ou upload)
# Exemplo com scp do seu computador local:
# scp backup.sql root@SEU_IP:/tmp/

# Restaurar backup no banco
mysql -u saas_user -p barbershop_saas < /tmp/backup.sql

# Verificar se dados foram importados
mysql -u saas_user -p barbershop_saas -e "SHOW TABLES;"
```

### **7.3 Executar Migrações (se necessário)**
```bash
cd /var/www/saas-barbearia

# Sincronizar schema Prisma
npx prisma db push

# OU se tiver migrações pendentes:
# npx prisma migrate deploy
```

---

## 🚀 **PASSO 8: BUILD E DEPLOY**

### **8.1 Build da Aplicação**
```bash
cd /var/www/saas-barbearia

# Fazer build
npm run build

# Verificar se build foi bem-sucedido
ls -la .next/
```

### **8.2 Configurar PM2**
```bash
# Verificar se existe ecosystem.config.js
ls -la ecosystem.config.js

# Se não existir, criar:
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'saas-barbearia',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/saas-barbearia',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}
EOF

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar para iniciar com sistema
pm2 startup
# Execute o comando que aparecer

# Verificar status
pm2 status
pm2 logs saas-barbearia
```

---

## 🌐 **PASSO 9: CONFIGURAR NGINX**

### **9.1 Criar Virtual Host**
```bash
# Criar configuração do site
cat > /etc/nginx/sites-available/saas-barbearia << 'EOF'
server {
    listen 80;
    server_name rifadosvianna.com.br www.rifadosvianna.com.br;

    # Logs
    access_log /var/log/nginx/saas_access.log;
    error_log /var/log/nginx/saas_error.log;

    # Proxy para Next.js
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
        proxy_read_timeout 86400;
    }

    # Arquivos estáticos
    location /_next/static/ {
        alias /var/www/saas-barbearia/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
ln -s /etc/nginx/sites-available/saas-barbearia /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl reload nginx
```

### **9.2 Testar HTTP**
```bash
# Testar local
curl -I http://localhost:3000

# Testar via Nginx
curl -I http://localhost

# Ver logs se houver problemas
pm2 logs saas-barbearia --lines 20
tail -f /var/log/nginx/saas_error.log
```

---

## 🔒 **PASSO 10: CONFIGURAR SSL (HTTPS)**

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d rifadosvianna.com.br -d www.rifadosvianna.com.br

# Configurar renovação automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Testar renovação
certbot renew --dry-run
```

---

## ✅ **PASSO 11: VERIFICAÇÕES FINAIS**

### **11.1 Status dos Serviços**
```bash
# Verificar todos os serviços
systemctl status nginx mysql
pm2 status

# Verificar portas
netstat -tlnp | grep -E ':80|:443|:3000|:3306'
```

### **11.2 Teste Completo**
```bash
# Teste local
curl -I http://localhost:3000

# Teste público HTTP
curl -I http://rifadosvianna.com.br

# Teste público HTTPS  
curl -I https://rifadosvianna.com.br

# Verificar banco
mysql -u saas_user -p barbershop_saas -e "SELECT COUNT(*) as total_users FROM users;"
```

### **11.3 Teste no Navegador**
Acesse: **https://rifadosvianna.com.br**

- ✅ Página carrega
- ✅ Login funciona  
- ✅ Dados aparecem corretamente
- ✅ SSL ativo (cadeado verde)

---

## 🔄 **COMANDOS DE MANUTENÇÃO**

```bash
# Atualizar código
cd /var/www/saas-barbearia
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart saas-barbearia

# Backup do banco
mysqldump -u saas_user -p barbershop_saas > backup_$(date +%Y%m%d_%H%M).sql

# Ver logs
pm2 logs saas-barbearia
tail -f /var/log/nginx/saas_error.log

# Monitorar sistema
htop
pm2 monit
```

---

## 🚨 **RESOLUÇÃO DE PROBLEMAS**

### **Aplicação não inicia**
```bash
pm2 logs saas-barbearia --err
cd /var/www/saas-barbearia && npm run build
```

### **Erro de banco**
```bash
# Testar conexão
mysql -u saas_user -p barbershop_saas

# Verificar .env
grep DATABASE_URL .env
```

### **Nginx não funciona**
```bash
nginx -t
systemctl restart nginx
tail -f /var/log/nginx/saas_error.log
```

### **SSL não funciona**
```bash
certbot certificates
systemctl reload nginx
```

---

## ⏱️ **TEMPO ESTIMADO: 45-60 MINUTOS**

### **Checklist Final:**
- [ ] Ubuntu atualizado
- [ ] Node.js 20 instalado
- [ ] MySQL funcionando
- [ ] Nginx configurado
- [ ] Projeto clonado
- [ ] .env restaurado
- [ ] Banco restaurado
- [ ] Build realizado
- [ ] PM2 rodando
- [ ] SSL configurado
- [ ] Site acessível via HTTPS

---

## 🎉 **PRONTO!**
Seu SaaS está novamente online em: **https://rifadosvianna.com.br**

**💡 Dica**: Faça um backup completo do VPS configurado para futuras migrações!
