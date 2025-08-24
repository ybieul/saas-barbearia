FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache openssl libc6-compat

# Copia package files
COPY package*.json ./
COPY .npmrc ./

# Instala todas as dependências
RUN npm install --legacy-peer-deps

# Copia o código fonte
COPY . .

# Gera cliente Prisma
RUN npx prisma generate

# Build da aplicação
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
