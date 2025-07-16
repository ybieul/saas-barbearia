# 🚀 Deploy na Hostinger - Guia Completo

## 📋 Pré-requisitos

### 1. Dados da Hostinger que você precisa:
- **URL do servidor MySQL**: `srv1001.hstgr.io` (ou similar)
- **Nome do usuário do banco**: `u123456789_saas`
- **Senha do banco de dados**: Sua senha
- **Nome do banco**: `u123456789_barbershop`
- **Domínio**: `seudominio.com`

### 2. Como encontrar esses dados:
1. Acesse o **hPanel da Hostinger**
2. Vá em **Bancos de Dados MySQL**
3. Anote o nome do servidor, usuário e banco
4. Crie um novo banco se necessário

---

## ⚙️ Configuração do .env

### 1. Edite o arquivo `.env` com seus dados reais:

```env
# DATABASE - Substitua pelos dados da Hostinger
DATABASE_URL="mysql://uSEU_USUARIO:SUA_SENHA@srv1001.hstgr.io:3306/uSEU_USUARIO_barbershop"

# DOMÍNIO - Substitua pelo seu domínio
NEXTAUTH_URL="https://seudominio.com"
APP_URL="https://seudominio.com"

# SEGURANÇA - Gere uma chave secreta forte
NEXTAUTH_SECRET="sua-chave-super-secreta-aqui-mude-em-producao-hostinger"

# EMAIL - Configure com seu email da Hostinger
SMTP_USER="noreply@seudominio.com"
SMTP_PASS="sua-senha-email"
```

### 2. Gerar chave secreta segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Configuração do Banco de Dados

### 1. No hPanel da Hostinger:
1. Crie um novo banco MySQL
2. Anote o nome completo: `u123456789_barbershop`
3. Crie um usuário com todas as permissões

### 2. Execute as migrations do Prisma:
```bash
npx prisma db push
npx prisma generate
```

---

## 📤 Deploy do Projeto

### 1. Preparar para produção:
```bash
npm run build
npm run start
```

### 2. Upload dos arquivos:
- Faça upload de todos os arquivos via **File Manager** ou **FTP**
- Certifique-se que o `.env` está na raiz do projeto
- **NÃO** suba o `.env.example` ou `.env.local`

### 3. Instalar dependências no servidor:
```bash
npm install --production
npx prisma generate
npx prisma db push
```

---

## ✅ Checklist Final

- [ ] `.env` configurado com dados reais da Hostinger
- [ ] Banco de dados MySQL criado e configurado
- [ ] Domínio apontando para o servidor
- [ ] SSL configurado (HTTPS)
- [ ] Migrations do Prisma executadas
- [ ] Build do projeto funcionando
- [ ] Email SMTP configurado
- [ ] Variáveis de ambiente de produção ativas

---

## 🔧 Comandos Úteis

```bash
# Verificar conexão com banco
npx prisma db pull

# Reset do banco (CUIDADO em produção!)
npx prisma db push --force-reset

# Ver logs de erro
npm run start 2>&1 | tee logs.txt

# Verificar build
npm run build
```

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Confirme se o banco está acessível
3. Teste a conexão MySQL
4. Verifique se todas as variáveis estão configuradas

**Lembre-se**: Nunca exponha suas senhas ou dados sensíveis!
