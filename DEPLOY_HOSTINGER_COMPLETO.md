# 🚀 GUIA DE DEPLOY - HOSTINGER
## Deploy do SaaS Barbearia para rifadosvianna.com.br

### 📁 **ESTRUTURA DE ARQUIVOS NA HOSTINGER**

```
/domains/rifadosvianna.com.br/
├── 📁 pasta_principal/              ← Fora da public_html (SEGURO)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── prisma/
│   ├── styles/
│   ├── .env                         ← IMPORTANTE: Fora da web!
│   ├── .env.example
│   ├── package.json
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── components.json
│   └── postcss.config.mjs
│
└── 📁 public_html/                  ← Apenas build e arquivos públicos
    ├── _next/                       ← Conteúdo da pasta .next após build
    ├── public/                      ← Imagens, favicon, etc.
    └── [outros arquivos estáticos]
```

### 🔧 **OPÇÃO 1: Deploy Manual (Mais Simples)**

#### 1. **Upload via File Manager da Hostinger:**
- Acesse o hPanel → File Manager
- Vá para `/domains/rifadosvianna.com.br/`
- Crie uma pasta `saas_app` fora da `public_html`
- Upload TODOS os arquivos do projeto para `saas_app/`

#### 2. **Configurar .env:**
```env
DATABASE_URL="mysql://u102726947_agenda:Mz6$FIx63|>@srv1001.hstgr.io:3306/u102726947_agenda"
NEXTAUTH_URL="https://rifadosvianna.com.br"
APP_URL="https://rifadosvianna.com.br"
```

#### 3. **No Terminal da Hostinger:**
```bash
cd /domains/rifadosvianna.com.br/saas_app
npm install --production
npx prisma generate
npx prisma db push
npm run build
npm start
```

### 🔧 **OPÇÃO 2: Deploy com Subdomínio (Recomendado)**

#### 1. **Criar subdomínio:**
- No hPanel: Subdomínios → Criar: `agenda.rifadosvianna.com.br`

#### 2. **Upload para pasta do subdomínio:**
```
/domains/rifadosvianna.com.br/
├── 📁 agenda/                       ← Pasta do subdomínio
│   ├── public_html/                 ← Build aqui
│   └── app_files/                   ← Código fonte aqui
│       ├── app/
│       ├── components/
│       ├── .env
│       └── ...
```

#### 3. **Configurar .env:**
```env
NEXTAUTH_URL="https://agenda.rifadosvianna.com.br"
APP_URL="https://agenda.rifadosvianna.com.br"
```

### ⚡ **COMANDOS NO TERMINAL HOSTINGER:**

```bash
# Navegar para a pasta do projeto
cd /domains/rifadosvianna.com.br/saas_app

# Instalar dependências (apenas produção)
npm install --production

# Gerar Prisma Client
npx prisma generate

# Criar banco de dados (AUTOMÁTICO!)
npx prisma db push

# Build para produção
npm run build

# Iniciar servidor
npm start
```

### 🔍 **VERIFICAR SE FUNCIONOU:**

1. **Banco de dados criado:**
   - Acesse phpMyAdmin da Hostinger
   - Verifique se as tabelas foram criadas em `u102726947_agenda`

2. **Site funcionando:**
   - Acesse: `https://rifadosvianna.com.br` ou `https://agenda.rifadosvianna.com.br`
   - Teste login/register

### 🚨 **SEGURANÇA - IMPORTANTE:**

✅ **NUNCA coloque na public_html:**
- `.env` (senhas do banco)
- `package.json`
- Código fonte (`app/`, `components/`, etc.)

✅ **SÓ na public_html:**
- Arquivos do build (`.next/`)
- Imagens públicas (`public/`)
- Arquivos estáticos

### 📞 **Se der erro:**

1. **Verificar logs:**
   ```bash
   npm start 2>&1 | tee logs.txt
   ```

2. **Testar conexão com banco:**
   ```bash
   npx prisma db pull
   ```

3. **Verificar variáveis de ambiente:**
   ```bash
   echo $DATABASE_URL
   ```

### 🎉 **PRONTO!**
Seu SaaS estará rodando em: `https://rifadosvianna.com.br`
