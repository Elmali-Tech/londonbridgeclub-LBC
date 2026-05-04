# London Bridge Projesi Google Cloud Dağıtım Rehberi

Bu belge, London Bridge projesini Google Cloud Platform (GCP) üzerinde dağıtmak için gereken adımları açıklar.

## Ön Koşullar

1. [Google Cloud hesabı](https://console.cloud.google.com/)
2. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (gcloud CLI)
3. [Docker](https://www.docker.com/get-started)
4. Google Cloud projesi ID: `londonbridge-458912`

## Adım 1: Google Cloud Projenizi Hazırlama

1. [Google Cloud Console](https://console.cloud.google.com/)'a giriş yapın
2. Proje ID'si `londonbridge-458912` olan projeyi seçin
3. Gerekli API'leri etkinleştirin:
   - Cloud Run API
   - Container Registry API
   - Cloud Build API

PowerShell'de:
```powershell
gcloud auth login
gcloud config set project londonbridge-458912
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

## Adım 2: Çevre Değişkenlerini Ayarlama

Uygulama için gerekli çevre değişkenlerini Cloud Build'de tanımlayın:

1. Google Cloud Console'da "Cloud Build" > "Triggers" > "Settings" > "Variables" bölümüne gidin
2. Aşağıdaki değişkenleri ekleyin:
   - `_NEXT_PUBLIC_SUPABASE_URL`
   - `_NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `_STRIPE_SECRET_KEY`
   - `_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `_STRIPE_WEBHOOK_SECRET`

Ya da PowerShell'de gcloud komutları ile ekleyin:
```powershell
gcloud builds triggers create github --name="london-deploy" --repo-name="londonbridge" --branch-pattern="main" --build-config="cloudbuild.yaml"

gcloud builds triggers set-substitutions --trigger="london-deploy" --substitutions="_NEXT_PUBLIC_SUPABASE_URL=URL,_NEXT_PUBLIC_SUPABASE_ANON_KEY=KEY,_STRIPE_SECRET_KEY=KEY,_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=KEY,_STRIPE_WEBHOOK_SECRET=SECRET"
```

## Adım 3: Manuel Dağıtım

Projeyi manuel olarak dağıtmak için:

gcloud auth login
gcloud config set project londonbridge-458912


1. Önce Docker imajını yerel olarak oluşturun:
```powershell
docker build -t gcr.io/londonbridge-458912/london .
```

2. Docker imajını Google Container Registry'ye gönderin:
```powershell
docker push gcr.io/londonbridge-458912/london
```

3. Cloud Run'a dağıtın:
```powershell
gcloud run deploy london --image gcr.io/londonbridge-458912/london --platform managed --region europe-west1 --allow-unauthenticated
```

## Adım 4: Otomatik Dağıtım

GitHub repo entegrasyonu ile otomatik dağıtım için:

1. GitHub repositorynizi Google Cloud Build ile bağlayın
2. Bu depoda bulunan cloudbuild.yaml dosyasını kullanarak bir build tetikleyicisi oluşturun

## Adım 5: Domainle Eşleştirme

Cloud Run hizmetinizi özel bir domain ile eşleştirmek için:

1. Google Cloud Console'da "Cloud Run" > "london" > "Domain Mappings" bölümüne gidin
2. "Add Mapping" butonuna tıklayın
3. Domain adınızı girin ve talimatları izleyin

## Webhook Kurulumu

Stripe webhook için Cloud Run URL'nizi Stripe hesabınızda ayarlayın:

1. Stripe Dashboard > Developers > Webhooks bölümüne gidin
2. "Add endpoint" butonuna tıklayın
3. URL olarak `https://[YOUR-CLOUD-RUN-URL]/api/webhooks/stripe` girin

## İzleme ve Günlükler

Uygulamanızı izlemek için:

1. Google Cloud Console'da "Cloud Run" > "london" bölümüne gidin
2. "Logs" sekmesine tıklayın
3. Günlükleri görüntüleyin ve filtreleyin

## Sorun Giderme

Yaygın sorunlar ve çözümleri:

1. **Bağlantı Hataları**: Supabase veya Stripe çevre değişkenlerini kontrol edin
2. **Bellek Yetersizliği**: Cloud Run instance bellek ayarını artırın
3. **Cold Start**: Minimum instance sayısını 1 olarak ayarlayarak cold start'ı önleyin

```powershell
gcloud run services update london --min-instances=1
``` 