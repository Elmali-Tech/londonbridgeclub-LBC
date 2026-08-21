# Google Cloud Deployment

The Cloud Build definitions build and deploy the standalone Next.js image.

Required substitutions and runtime secrets:

- LBC API: `_LBC_API_TOKEN`, `_LBC_API_WEBHOOK_URL`
- LBC auth: `_LBC_AUTH_SESSION_SECRET`, `_LBC_AUTH_LOGIN_PATH`,
  `_LBC_AUTH_REGISTER_PATH`, password reset paths, `_LBC_ADMIN_EMAILS`
- Stripe keys and price IDs
- AWS region, access keys and S3 bucket
- Mail and application base URL settings

Build:

```bash
gcloud builds submit --config cloudbuild.yaml
```

Before production deployment:

```bash
npm run build
npm run check:lbc-api
```

Do not release member login until the auth endpoints in
`LBC_API_GAP_REPORT.md` are live.
