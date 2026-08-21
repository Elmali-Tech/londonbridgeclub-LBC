# LBC API Cutover Gap Report

Last verified: 2026-08-21 (Europe/Istanbul)

The web application runtime no longer uses a secondary database connection or
fallback. Auth, member, CRM, dashboard, social, subscription and admin data are
routed through the LBC API client.

## Live endpoint verification

| Endpoint | Current result | Current rows | Required action |
| --- | --- | ---: | --- |
| `GET /members` | Working | 45 | Keep |
| `GET /members/{id}` | Working | 1 | Keep |
| `GET /projects` | Working | 17 | Complete fields and migrate missing records |
| `GET /projects/{id}` | `ENDPOINT_NOT_FOUND` | 0 | Implement |
| `GET /kpi/dashboard` | Working | aggregate | Keep |
| `GET /needs` | `ENDPOINT_NOT_FOUND` | 0 | Implement if needs remain separate from projects |
| `GET /businesses` | `ENDPOINT_NOT_FOUND` | 0 | Implement |
| `GET /subscriptions` | `ENDPOINT_NOT_FOUND` | 0 | Implement |
| `GET /payments` | `ENDPOINT_NOT_FOUND` | 0 | Implement |
| `POST /auth/login` | `ENDPOINT_NOT_FOUND` | 0 | Critical: implement before release |
| `POST /auth/request-password-reset` | `ENDPOINT_NOT_FOUND` | 0 | Implement |
| `POST /auth/reset-password` | `ENDPOINT_NOT_FOUND` | 0 | Implement |

CRM migration gap: the retired CRM source contained 116 opportunity records on
2026-08-12; `GET /projects` currently returns 17. The LBC API therefore needs a
99-record reconciliation/import or an explicit explanation of which records
must be discarded.

## Required project contract

`GET /projects` and `GET /projects/{id}` must return these canonical fields:

```json
{
  "id": "string",
  "project_no": "string|null",
  "name": "string",
  "description": "string|null",
  "type": "lead|opportunity|project",
  "category": "string|null",
  "sector": "string|null",
  "status": "Active|Won|Lost",
  "stage": "Lead|Qualified|Proposal|Negotiation|Won|Lost",
  "customer": {
    "id": "string|null",
    "name": "string|null",
    "company_name": "string|null",
    "contact_person": "string|null"
  },
  "partner": {
    "id": "string|null",
    "name": "string|null"
  },
  "referrer": {
    "member_id": "string|null",
    "name": "string|null"
  },
  "owner": {
    "member_id": "string|null",
    "name": "string|null"
  },
  "revenue": {
    "amount": 0,
    "currency": "TRY|GBP|USD|EUR",
    "label": "string|null",
    "period": "one_time|monthly|quarterly|six_months|annual"
  },
  "commission_rate": 0,
  "commission_amount": {
    "amount": 0,
    "currency": "TRY|GBP|USD|EUR"
  },
  "expected_closing_date": "ISO-8601|null",
  "visibility": "private|members|public",
  "published": false,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Required mutations:

- `POST /projects`
- `PATCH /projects/{id}`
- `DELETE /projects/{id}`
- `GET /projects/{id}/interests/{memberId}`
- `POST /projects/{id}/interests/{memberId}`
- `GET /project-interests`

All mutations must accept `idempotency_key` and return the complete updated
resource under `{ "data": ... }`.

## Required member and auth contract

The current member list is missing fields used by the web experience. Add:

- `representative_name`, `about`, `interests`, `location`
- `linkedin_url`, `website_url`, `date_of_birth`
- `profile_image_key` or `profile_image_url`
- `banner_image_key` or `banner_image_url`
- canonical `role` and permissions (`is_admin`, `can_create_opportunities`)
- `knows`/connections data or dedicated connection endpoints

Required auth endpoints:

- `POST /auth/login`: email/password -> member payload
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `PATCH /auth/change-password`

The application cannot authenticate a user until `/auth/login` exists and
`LBC_AUTH_LOGIN_PATH=/auth/login` plus `LBC_AUTH_SESSION_SECRET` are configured.

## Required business, billing and membership endpoints

- `GET|POST /businesses`
- `GET|PATCH|DELETE /businesses/{id}`
- Business types: `customer`, `partner`, `company`
- `GET|POST /plans`, `GET|PATCH|DELETE /plans/{id}`
- `GET|POST /plan-features`
- `GET|POST|PATCH /subscriptions`
- `GET|POST /payments`
- Stripe processor IDs and subscription status must be persisted by LBC API.

## Required community endpoints

The current API returns `ENDPOINT_NOT_FOUND` for these resources:

- `/posts`, `/post-media`, `/post-likes`, `/comments`, `/comment-likes`
- `/connections`
- `/chats`, `/chat-participants`, `/messages`, `/message-read-status`
- `/conversations`, `/conversation-participants`, `/conversation-read-status`
- `/member-tags`
- `/benefits`, `/events`
- `/entry-fee-settings`, `/register-tokens`

Each resource needs list/detail/create/update/delete methods as appropriate.
Realtime chat can initially use polling; later add websocket or SSE support.

## Generic query envelope

Legacy screens are routed through the LBC data adapter. Until those screens are
rewritten for resource-specific DTOs, endpoints should accept this optional
query block in the existing n8n request body:

```json
{
  "ep": "posts",
  "query": {
    "columns": "*",
    "filters": [{ "operator": "eq", "column": "author_id", "value": "member-id" }],
    "order": { "column": "created_at", "ascending": false },
    "limit": 20,
    "range": { "from": 0, "to": 19 },
    "count": "exact",
    "head": false
  }
}
```

Errors must continue to use the existing body-error convention:

```json
{
  "error": {
    "status": 404,
    "code": "ENDPOINT_NOT_FOUND",
    "message": "...",
    "details": null
  }
}
```
