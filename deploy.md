gcloud auth login

gcloud config set project londonbridge-458912

(ilk defa yapılıyorsa)
gcloud auth configure-docker


docker build --platform linux/amd64 -t gcr.io/londonbridge-458912/london .

docker push gcr.io/londonbridge-458912/london

gcloud run deploy london --image gcr.io/londonbridge-458912/london --platform managed --region europe-west1 --allow-unauthenticated