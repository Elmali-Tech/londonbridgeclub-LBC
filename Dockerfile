FROM node:24.14.0-alpine AS base

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

# Next.js build için gerekli environment variable'lar
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_AWS_REGION
ARG NEXT_PUBLIC_AWS_S3_BUCKET_NAME
ARG NEXT_PUBLIC_AWS_S3_URL
ARG NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_AWS_REGION=$NEXT_PUBLIC_AWS_REGION
ENV NEXT_PUBLIC_AWS_S3_BUCKET_NAME=$NEXT_PUBLIC_AWS_S3_BUCKET_NAME
ENV NEXT_PUBLIC_AWS_S3_URL=$NEXT_PUBLIC_AWS_S3_URL
ENV NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=$NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET

# Next.js uygulamasını inşa et
RUN npm run build

# Çalışma konteyneri için sadece gerekli dosyaları kopyala
FROM node:24.14.0-alpine AS runner
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
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "server.js"]
