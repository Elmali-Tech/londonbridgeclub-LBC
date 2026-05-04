# Stripe Webhook Secret Google Cloud Ortamı Kurulum Rehberi

Bu döküman, Stripe webhook secret'ı Google Cloud Run ortamında nasıl güvenli bir şekilde yapılandırılacağını açıklamaktadır.

## Genel Bakış

Stripe webhook'ları, ödeme işlemleri, abonelikler ve diğer önemli olaylar gerçekleştiğinde Stripe'ın uygulamanızı bilgilendirmesini sağlar. Bu olayların gerçekten Stripe'tan geldiğini doğrulamak için webhook imzalama kullanılır. Bu güvenlik önlemi, webhook isteklerinin gerçekten Stripe'tan geldiğini ve değiştirilmediğini garanti eder.

## Webhook Secret Oluşturma

1. [Stripe Dashboard](https://dashboard.stripe.com)'a giriş yapın
2. Developers > Webhooks bölümüne gidin
3. "Add endpoint" butonuna tıklayın
4. Endpoint URL olarak `https://london-REGION-run.app/api/subscription/webhook` girin
   (URL'i Cloud Run servis URL'inizle değiştirin)
5. Webhook'un etkinleştirilmesi gereken olayları seçin:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
   - `invoice.payment_succeeded`
6. "Add endpoint" butonuna tıklayın
7. Endpoint oluşturulduktan sonra, "Signing secret" bölümünü göreceksiniz
8. "Reveal" tuşuna tıklayarak webhook secret'ını görün ve kopyalayın
   (Formatta `whsec_` ile başlayan bir string olacaktır)

## Secret Manager'da Saklama

Google Cloud ortamında secret'ı güvenli bir şekilde saklamak için Secret Manager kullanılmalıdır:

1. [Google Cloud Console](https://console.cloud.google.com)'a giriş yapın
2. Secret Manager sayfasına gidin
3. "CREATE SECRET" butonuna tıklayın
4. Secret adı olarak `STRIPE_WEBHOOK_SECRET` girin
5. Secret değeri olarak Stripe'tan kopyaladığınız webhook secret'ını girin
6. "CREATE SECRET" butonuna tıklayın

## Cloud Run Servisinde Yapılandırma

### Google Cloud Console Üzerinden

1. Cloud Run sayfasına gidin
2. `london` servisinizi seçin
3. "Edit and deploy new revision" butonuna tıklayın
4. "Container, Networking, Security" bölümünü açın
5. "Variables & Secrets" sekmesine gidin
6. "Reference a secret" seçeneğine tıklayın
7. Environment variable name: `STRIPE_WEBHOOK_SECRET` girin
8. Secret: `STRIPE_WEBHOOK_SECRET` seçin
9. Version: `latest` seçin
10. "Done" ve ardından "Deploy" butonuna tıklayın

### Command Line İle

```bash
gcloud run services update london \
  --region=REGION \
  --update-secrets=STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest
```

Bu komut, Cloud Run servisinize `STRIPE_WEBHOOK_SECRET` adlı bir ortam değişkeni ekler ve değerini Secret Manager'da sakladığınız secret'a bağlar.

## Secret Doğrulama İşlemi

Next.js uygulamanızda webhook'tan gelen istekleri doğrulamak için aşağıdaki kodu kullanabilirsiniz:

```typescript
// src/app/api/subscription/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  const body = await req.text(); // Raw body gerekli
  
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (!signature || !webhookSecret) {
      return new NextResponse('Webhook imzası veya gizli anahtar eksik', { status: 400 });
    }

    // Olayı doğrula
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    // Event işleme kodları...
    
    return new NextResponse('Success', { status: 200 });
  } catch (err) {
    console.error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`);
    return new NextResponse('Webhook hatası', { status: 400 });
  }
}
```

## Webhook Local Test

Geliştirme aşamasında webhook'larınızı test etmek için Stripe CLI kullanabilirsiniz:

1. [Stripe CLI](https://stripe.com/docs/stripe-cli) yükleyin
2. `stripe login` komutunu çalıştırın
3. Webhook'ları yerel sunucunuza yönlendirin:
   ```
   stripe listen --forward-to http://localhost:3000/api/subscription/webhook
   ```
4. CLI size bir webhook signing secret verecektir. Bu secret'ı geliştirme ortamınızda `.env.local` dosyasında kullanabilirsiniz.

## Önemli Notlar

1. **Webhook İmza Doğrulama**: Webhook güvenliği için imza doğrulama kritik öneme sahiptir. İmza doğrulama olmadan, kötü niyetli aktörler Stripe adına webhook istekleri gönderebilir.

2. **Raw Body**: Webhook imzalarını doğrulamak için isteğin ham (raw) body'sine ihtiyaç vardır. Next.js'de `req.text()` ile bunu alabilirsiniz.

3. **Ortam Değişkenlerinin Rotasyonu**: Stripe webhook secret'ınızı düzenli olarak değiştirmeniz önerilir. Secret'ı değiştirdiğinizde, hem Stripe Dashboard'da hem de Cloud Run servisinde güncellemeyi unutmayın.

4. **Geçici Sürüm**: Stripe, yeni webhook secret'ı oluştururken, eski webhook secret'ının da belirli bir süre çalışmaya devam etmesine izin verir. Bu, uygulamanızı kesintisiz bir şekilde güncellemek için bir geçiş süresi sağlar.

5. **Birden Fazla Ortam**: Geliştirme ve üretim ortamları için farklı webhook endpoint'leri ve secret'ları kullanın. 