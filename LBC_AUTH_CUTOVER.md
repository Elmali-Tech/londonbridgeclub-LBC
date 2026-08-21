# LBC Auth Cutover

Auth is LBC-only. The web application issues signed `lbc_sess_*` sessions after
the LBC API validates credentials and returns a complete member payload.

Required endpoints:

- `POST /auth/login`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `PATCH /auth/change-password`
- `POST /members` for registration
- `GET /members/{id}` for session validation

Required configuration:

- `LBC_API_TOKEN`
- `LBC_AUTH_SESSION_SECRET`
- `LBC_AUTH_LOGIN_PATH=/auth/login`
- `LBC_AUTH_REGISTER_PATH=/members`
- `LBC_AUTH_REQUEST_PASSWORD_RESET_PATH=/auth/request-password-reset`
- `LBC_AUTH_RESET_PASSWORD_PATH=/auth/reset-password`
- `LBC_AUTH_CHANGE_PASSWORD_PATH=/auth/change-password`

Current blocker on 2026-08-12: `/auth/login` and all password endpoints return
`ENDPOINT_NOT_FOUND`. Registration and member detail reads are wired, but login
cannot work until credential validation is implemented.
