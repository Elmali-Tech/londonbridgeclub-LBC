# London Bridge Club Web

Next.js application backed by the LBC API. Application data is accessed through
the n8n LBC API gateway; assets are stored in AWS S3 and payments use Stripe.

## Local setup

```bash
npm install
npm run dev
```

Required environment variables:

```dotenv
LBC_API_TOKEN=
LBC_API_WEBHOOK_URL=
LBC_AUTH_SESSION_SECRET=
LBC_AUTH_LOGIN_PATH=/auth/login
LBC_AUTH_REGISTER_PATH=/members
LBC_AUTH_REQUEST_PASSWORD_RESET_PATH=/auth/request-password-reset
LBC_AUTH_RESET_PASSWORD_PATH=/auth/reset-password
LBC_AUTH_CHANGE_PASSWORD_PATH=/auth/change-password
LBC_ADMIN_EMAILS=

NEXT_PUBLIC_AWS_REGION=
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Verification

```bash
npx tsc --noEmit
npm run build
npm run check:lbc-api
```

See [LBC_API_GAP_REPORT.md](./LBC_API_GAP_REPORT.md) for endpoints and fields
that the backend still needs to implement before a production release.
