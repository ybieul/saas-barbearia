# --- Estágio 1: Builder ---
# Usa uma imagem completa do Node.js para instalar dependências e construir o projeto
FROM node:20-alpine AS builder

# Instala dependências do sistema para compilação
RUN apk add --no-cache libc6-compat python3 make g++

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Se não existe pnpm-lock.yaml, usa npm
RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install; \
    else \
    npm ci; \
    fi

# Copia o resto do código do projeto
COPY . .

# Gera o cliente Prisma
RUN npx prisma generate

# Build do Next.js para produção
ENV NEXT_TELEMETRY_DISABLED=1
RUN if [ -f pnpm-lock.yaml ]; then \
    pnpm run build; \
    else \
    npm run build; \
    fi

# --- Estágio 2: Production ---
# Usa uma imagem Node.js mais leve e otimizada para produção
FROM node:20-alpine

WORKDIR /app

# Instala apenas as dependências essenciais do sistema
RUN apk add --no-cache openssl

# Cria um usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os arquivos de dependências necessários do estágio 'builder'
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./

# Instala APENAS as dependências de produção
RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install --prod --frozen-lockfile; \
    else \
    npm ci --only=production && npm cache clean --force; \
    fi

# Copia o código já buildado e arquivos necessários do estágio 'builder'
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Se não existe standalone, copia tudo
RUN if [ ! -f server.js ]; then \
    cp -r /app/node_modules ./node_modules 2>/dev/null || true; \
    fi

# Copia arquivos de configuração se standalone não funcionar
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs* ./
COPY --from=builder --chown=nextjs:nodejs /app/middleware.ts* ./

USER nextjs

# Expõe a porta padrão do Next.js
EXPOSE 3000

# Define variáveis de ambiente para produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar a aplicação (tenta standalone primeiro, depois modo normal)
CMD if [ -f server.js ]; then \
    node server.js; \
    elif [ -f pnpm-lock.yaml ]; then \
    pnpm start; \
    else \
    npm start; \
    fi
