# LBC CRM/KPI Cutover

CRM and KPI reads are LBC-only:

- Member directory: `GET /members`
- CRM/project list: `GET /projects`
- Dashboard aggregate: `GET /kpi/dashboard`
- CRM create/update/delete: `/projects` and `/projects/{id}`
- Referral Engine: project `referrer` fields

No database fallback or dual-read mode remains in the runtime.

Current blockers:

- The API has 17 projects; the retired CRM snapshot had 116 records.
- Project detail and mutation contracts are not yet verified.
- Project responses do not include customer/company, partner, referrer, stage,
  owner, description or expected closing date.
- Business, subscription, payment and community endpoints are missing.

The authoritative implementation contract and live verification results are in
[LBC_API_GAP_REPORT.md](./LBC_API_GAP_REPORT.md).
