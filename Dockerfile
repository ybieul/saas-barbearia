# --- Estágio 1: Builder ---
# Usa uma imagem completa do Node.js para instalar dependências e construir o projeto
FROM node:20 AS builder

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala o pnpm globalmente
RUN npm install -g pnpm

# Copia os arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instala todas as dependências, incluindo as de desenvolvimento (para build)
RUN pnpm install --frozen-lockfile

# Copia o resto do código do projeto
COPY . .

# Gera o cliente Prisma
RUN npx prisma generate

# Build do Next.js para produção
RUN pnpm run build

# --- Estágio 2: Production ---
# Usa uma imagem Node.js mais leve e otimizada para produção
FROM node:20-slim

WORKDIR /app

# Instala apenas as dependências essenciais do sistema (para Prisma e outras libs nativas)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instala o pnpm globalmente
RUN npm install -g pnpm

# Copia os arquivos de dependências necessários do estágio 'builder'
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Instala APENAS as dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copia o código já buildado e arquivos necessários do estágio 'builder'
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/middleware.ts ./

# Cria um usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Define as permissões corretas
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expõe a porta padrão do Next.js
EXPOSE 3000

# Define variáveis de ambiente para produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar a aplicação Next.js
CMD ["pnpm", "start"]
