# --- Estágio 1: Builder ---
FROM node:20-alpine AS builder

# Instala dependências do sistema necessárias
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala todas as dependências
RUN npm ci

# Copia todo o código fonte
COPY . .

# Gera o cliente Prisma
RUN npx prisma generate

# Build da aplicação Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Estágio 2: Production ---
FROM node:20-alpine AS runner

WORKDIR /app

# Instala dependências do sistema para runtime
RUN apk add --no-cache openssl

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia package.json para instalar deps de produção
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copia arquivos buildados do estágio anterior
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copia schema do Prisma e cliente gerado
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de start
CMD ["node", "server.js"]
