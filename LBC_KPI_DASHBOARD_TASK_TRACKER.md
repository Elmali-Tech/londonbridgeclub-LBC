# LBC KPI Dashboard Tracker

Updated: 2026-08-12

| Task | Status | Notes |
| --- | --- | --- |
| LBC-only member and project reads | Done | `/members`, `/projects` |
| LBC-only Business Pulse and landing metrics | Done | No fallback |
| LBC-only admin KPI aggregation | Done | Uses project adapter |
| Referral Engine cutover | Code done / data blocked | Project referrer fields missing |
| CRM write adapter | Code done / API unverified | POST/PATCH/DELETE contract required |
| Project detail | Blocked | `/projects/{id}` returns `ENDPOINT_NOT_FOUND` |
| Auth cutover | Blocked | `/auth/login` missing |
| Business/partner/customer cutover | Blocked | `/businesses` missing |
| Billing cutover | Blocked | `/subscriptions`, `/payments` missing |
| Community features | Blocked | Posts, connections, chat and related endpoints missing |

See [LBC_API_GAP_REPORT.md](./LBC_API_GAP_REPORT.md).
