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

# Next.js build için gerekli environment variable'lar
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG STRIPE_SECRET_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_AWS_REGION
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG NEXT_PUBLIC_AWS_S3_BUCKET_NAME

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_AWS_REGION=$NEXT_PUBLIC_AWS_REGION
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
ENV NEXT_PUBLIC_AWS_S3_BUCKET_NAME=$NEXT_PUBLIC_AWS_S3_BUCKET_NAME

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