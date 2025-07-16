# AgendaPro - Sistema SaaS para Barbearias e Salões

## 🎯 Sobre o Projeto

O AgendaPro é um sistema completo de gestão para barbearias e salões de beleza, desenvolvido com Next.js 15, TypeScript, Prisma e SQLite. O sistema oferece todas as funcionalidades necessárias para gerenciar um negócio de forma eficiente e moderna.

## 🚀 Funcionalidades Implementadas

### ✅ Autenticação Completa
- Sistema de registro e login
- Autenticação JWT
- Proteção de rotas
- Gerenciamento de sessão

### ✅ Dashboard Principal
- Visão geral do negócio
- Estatísticas em tempo real
- Gráficos de performance
- Indicadores principais (faturamento, agendamentos, etc.)

### ✅ Gestão de Clientes
- Cadastro completo de clientes
- Histórico de atendimentos
- Busca e filtros
- Gestão de clientes ativos/inativos
- Informações de contato e preferências

### ✅ Sistema de Agendamentos
- Agenda visual por dia
- Criação e edição de agendamentos
- Status de agendamentos (agendado, confirmado, concluído, cancelado)
- Verificação de conflitos de horário
- Gestão de profissionais

### ✅ Catálogo de Serviços
- Cadastro de serviços
- Preços e durações
- Categorização
- Controle de serviços ativos

### ✅ Relatórios Financeiros
- Faturamento por período
- Serviços mais rentáveis
- Transações recentes
- Estatísticas de conversão
- Ticket médio

### ✅ Integração WhatsApp (Base)
- Estrutura para envio de mensagens
- Templates de confirmação e lembrete
- Logs de mensagens
- Sistema de reativação de clientes

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Banco de Dados**: SQLite com Prisma ORM
- **Autenticação**: JWT, bcryptjs
- **Formulários**: React Hook Form, Zod
- **Estilização**: Tailwind CSS, Tailwind Animate

## 📦 Estrutura do Projeto

```
e:\SaasV0\
├── app/                          # App Router (Next.js 15)
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticação
│   │   ├── clients/              # Gestão de clientes
│   │   ├── appointments/         # Agendamentos
│   │   ├── services/            # Serviços
│   │   ├── dashboard/           # Dados do dashboard
│   │   └── demo/                # Geração de dados demo
│   ├── dashboard/               # Área administrativa
│   │   ├── agenda/              # Gestão de agendamentos
│   │   ├── clientes/           # Gestão de clientes
│   │   ├── financeiro/         # Relatórios financeiros
│   │   └── configuracoes/      # Configurações
│   ├── login/                  # Página de login
│   ├── register/              # Página de registro
│   └── page.tsx              # Landing page
├── components/               # Componentes reutilizáveis
│   └── ui/                  # Componentes de UI
├── hooks/                   # Custom hooks
├── lib/                     # Utilitários e configurações
├── prisma/                  # Schema e migrações
└── styles/                  # Estilos globais
```

## 🚀 Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Banco de Dados
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Executar em Modo Desenvolvimento
```bash
npm run dev
```

### 4. Gerar Dados Demo (Opcional)
Acesse `http://localhost:3000` e clique em "🎯 Gerar Dados Demo"

**Credenciais Demo:**
- Email: `demo@barbeariademo.com`
- Senha: `123456`

## 📊 APIs Disponíveis

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Criar cliente
- `PUT /api/clients` - Atualizar cliente
- `DELETE /api/clients` - Deletar cliente

### Agendamentos
- `GET /api/appointments` - Listar agendamentos
- `POST /api/appointments` - Criar agendamento
- `PUT /api/appointments` - Atualizar agendamento
- `DELETE /api/appointments` - Deletar agendamento

### Serviços
- `GET /api/services` - Listar serviços
- `POST /api/services` - Criar serviço
- `PUT /api/services` - Atualizar serviço
- `DELETE /api/services` - Deletar serviço

### Dashboard
- `GET /api/dashboard` - Dados do dashboard

### Demo
- `POST /api/demo` - Gerar dados de demonstração

## 🔐 Autenticação

O sistema utiliza JWT (JSON Web Tokens) para autenticação. Todas as APIs protegidas requerem o header:
```
Authorization: Bearer <token>
```

## 💾 Banco de Dados

### Modelos Principais
- **User**: Dados do usuário/negócio
- **Client**: Clientes da barbearia
- **Service**: Serviços oferecidos
- **Appointment**: Agendamentos
- **Professional**: Profissionais (barbeiros/cabeleireiros)
- **WhatsAppLog**: Logs de mensagens WhatsApp

## 🎨 Design System

O projeto utiliza um design system consistente com:
- Cores: Tema escuro com acentos em verde esmeralda
- Tipografia: Sistema de fontes responsivo
- Componentes: Baseados em Radix UI
- Icons: Lucide React
- Animações: Tailwind Animate

## 📱 Responsividade

- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1023px)
- ✅ Mobile (320px - 767px)

## 🔮 Próximas Funcionalidades

### Em Desenvolvimento
- [ ] Integração completa com WhatsApp Business API
- [ ] Relatórios avançados com gráficos
- [ ] Sistema de notificações push
- [ ] Gestão de produtos e estoque
- [ ] Sistema de fidelidade
- [ ] Integração com pagamentos (PIX, cartão)
- [ ] Backup automático de dados
- [ ] Multi-tenancy (várias barbearias)

### Planejadas
- [ ] App mobile (React Native)
- [ ] Integração com redes sociais
- [ ] Sistema de avaliações
- [ ] Gestão de funcionários
- [ ] Controle de ponto
- [ ] Integração com contabilidade

## 🛡️ Segurança

- Senhas criptografadas com bcrypt
- Tokens JWT com expiração
- Validação de dados de entrada
- Proteção CORS
- Sanitização de inputs

## 📈 Performance

- Otimização de imagens
- Code splitting automático
- Lazy loading de componentes
- Caching de dados
- Compressão de assets

## 🧪 Testes

Para executar em ambiente de desenvolvimento com dados de teste:

1. Execute o servidor: `npm run dev`
2. Acesse: `http://localhost:3000`
3. Clique em "🎯 Gerar Dados Demo"
4. Faça login com: `demo@barbeariademo.com` / `123456`

## 📞 Suporte

Este é um sistema completo e funcional para gestão de barbearias e salões. Todas as funcionalidades principais estão implementadas e testadas.

### Status do Sistema: ✅ FUNCIONAL

- ✅ Backend completo e funcional
- ✅ Frontend responsivo e moderno
- ✅ Banco de dados estruturado
- ✅ APIs documentadas e testadas
- ✅ Sistema de autenticação seguro
- ✅ Gestão completa de clientes
- ✅ Sistema de agendamentos robusto
- ✅ Relatórios financeiros detalhados

---

**Desenvolvido com ❤️ para modernizar a gestão de barbearias e salões**
