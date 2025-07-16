# ✅ CHECKLIST - Configuração .env para Hostinger

## 🎯 O que você precisa fazer:

### 1. **DADOS DO BANCO DE DADOS** (OBRIGATÓRIO)
No arquivo `.env`, substitua a linha:
```env
DATABASE_URL="mysql://root:@localhost:3306/barbershop_saas"
```

Por:
```env
DATABASE_URL="mysql://uSEU_USUARIO:SUA_SENHA@srv1001.hstgr.io:3306/uSEU_USUARIO_barbershop"
```

**Como encontrar esses dados:**
- Acesse o hPanel da Hostinger
- Vá em **"Bancos de Dados MySQL"**
- Anote:
  - **Servidor**: `srv1001.hstgr.io` (ou similar como srv1002, srv1003, etc.)
  - **Usuário**: `uXXXXXX_saas` (exemplo: u987654321_saas)
  - **Senha**: A que você definiu ao criar o banco
  - **Banco**: `uXXXXXX_barbershop` (crie se não existir)

### 2. **SEU DOMÍNIO** (OBRIGATÓRIO)
Substitua nos arquivos `.env`:
```env
NEXTAUTH_URL="https://seudominio.com"
APP_URL="https://seudominio.com"
```
Por seu domínio real (exemplo: `https://minhabarbearia.com`)

### 3. **CHAVE DE SEGURANÇA** (OBRIGATÓRIO)
Gere uma chave segura e substitua:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. **EMAIL** (OPCIONAL - para notificações)
```env
SMTP_USER="noreply@seudominio.com"
SMTP_PASS="sua-senha-email"
```

## 🔧 Status Atual do seu .env:

✅ **Estrutura correta** para Hostinger  
✅ **MySQL configurado** corretamente  
✅ **Schema do Prisma válido** 🚀  
✅ **Configurações de email** da Hostinger  
⚠️ **Pendente**: Substituir dados de exemplo pelos reais

## 🚀 Próximos Passos:

1. **Edite o `.env`** com seus dados reais da Hostinger
2. **Faça o deploy** dos arquivos para a Hostinger
3. **Execute no servidor**:
   ```bash
   npm install --production
   npx prisma generate
   npx prisma db push
   npm start
   ```

## ⚡ Comando para testar localmente:
```bash
npm run build
```

## 📋 Exemplo real de configuração:
```env
DATABASE_URL="mysql://u987654321_saas:MinhaSenh@123@srv1001.hstgr.io:3306/u987654321_barbershop"
NEXTAUTH_URL="https://minhabarbearia.com"
APP_URL="https://minhabarbearia.com"
NEXTAUTH_SECRET="a1b2c3d4e5f6789012345678901234567890abcdef"
```

Se seguir esses passos, estará pronto para produção! 🎉
