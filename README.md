# London Bridge Club

Bu proje, London Bridge Club için web uygulamasını içerir. Next.js, Tailwind CSS ve Supabase veritabanı kullanılarak geliştirilmiştir.

## Kurulum

1. Proje dosyalarını indirin:
```bash
git clone <repo-url>
cd londonbridge
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Supabase projesi oluşturun:
   - [Supabase](https://supabase.com/) sitesine gidip hesap oluşturun
   - Yeni bir proje oluşturun
   - SQL Editor bölümünden `schema.sql` dosyasındaki komutları çalıştırın
   - Proje ayarlarından API URL ve anonim API anahtarını kopyalayın

4. `.env.local` dosyasını güncelleyin:
```
NEXT_PUBLIC_SUPABASE_URL=sizin-supabase-url-adresiniz
NEXT_PUBLIC_SUPABASE_ANON_KEY=sizin-supabase-anonim-anahtarınız
```

5. Uygulamayı çalıştırın:
```bash
npm run dev
```

## Özellikler

- Responsive tasarım
- Özel kimlik doğrulama sistemi
- Kullanıcı kaydı ve girişi
- Anasayfa
- Üyelik planları

## Teknolojiler

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Supabase

## Proje Yapısı

- `/src/app`: Sayfa bileşenleri (Page Router)
- `/src/components`: Ortak bileşenler
- `/src/lib`: Yardımcı fonksiyonlar ve servisler
- `/src/context`: React context tanımları
- `/src/types`: TypeScript tip tanımları

## Veritabanı Şeması

### users
- id: SERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- full_name: VARCHAR(255) NOT NULL
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### sessions
- id: SERIAL PRIMARY KEY
- user_id: INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- token: VARCHAR(255) UNIQUE NOT NULL
- expires_at: TIMESTAMP WITH TIME ZONE NOT NULL
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
