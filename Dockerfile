FROM node:21-alpine AS base

# Çalışma dizinini ayarla
WORKDIR /app

# İhtiyaç duyulan araçları yükle
RUN apk add --no-cache libc6-compat

# Bağımlılıkları yüklemek için paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# Bağımlılıkları yükle
RUN npm ci

# Kaynak kodlarını kopyala
COPY . .

# Next.js uygulamasını inşa et
RUN npm run build

# Çalışma konteyneri için sadece gerekli dosyaları kopyala
FROM node:21-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root kullanıcı ekle (güvenlik için)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Build aşamasından gereken dosyaları kopyala
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uygulamayı çalıştır
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"] 