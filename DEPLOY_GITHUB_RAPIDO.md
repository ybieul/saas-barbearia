# 🚀 Deploy via GitHub - Guia Rápido

## 📂 **1. Preparar GitHub**

### **1.1 Criar repositório:**
```bash
# 1. Acesse: https://github.com/new
# 2. Nome: saas-barbearia
# 3. Público ou Privado
# 4. Create repository
```

### **1.2 Enviar código:**
```bash
# No seu computador (pasta e:\SaasV0)
git init
git add .
git commit -m "SaaS Barbearia - versão inicial"
git remote add origin https://github.com/SEU_USUARIO/saas-barbearia.git
git branch -M main
git push -u origin main
```

---

## 🖥️ **2. Deploy no VPS**

### **2.1 Clonar no VPS:**
```bash
# SSH no VPS
ssh root@SEU_IP_VPS

# Clonar repositório
cd /var/www
git clone https://github.com/SEU_USUARIO/saas-barbearia.git
cd saas-barbearia
```

### **2.2 Configurar e iniciar:**
```bash
# Configurar .env
cp .env.production .env
nano .env  # Configure com dados reais

# Deploy
chmod +x deploy.sh
./deploy.sh
```

---

## 🔄 **3. Atualizações futuras**

### **3.1 Desenvolvimento:**
```bash
# Fazer alterações no código
git add .
git commit -m "Nova funcionalidade"
git push origin main
```

### **3.2 Atualizar produção:**
```bash
# No VPS
ssh root@SEU_IP_VPS
cd /var/www/saas-barbearia
./update.sh
```

---

## ⚡ **Comandos importantes:**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs saas-barbearia

# Reiniciar se necessário
pm2 restart saas-barbearia

# Atualizar do GitHub
git pull origin main && ./update.sh
```

**Pronto! Seu workflow de deploy está configurado! 🚀**
