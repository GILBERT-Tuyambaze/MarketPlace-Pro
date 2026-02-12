Admin server for setting Firebase custom claims

Usage

1. Ensure `config/firebase-admin-key.json` exists and contains your service account JSON.
2. Install dependencies (if not already):

```bash
pnpm add express cors body-parser firebase-admin
```

3. Start server:

```bash
ADMIN_ENDPOINT_SECRET=your-secret node server/index.js
```

Security

- The endpoint requires either:
  - A valid Firebase ID token with `admin` custom claim set (caller must already be an admin), OR
  - A server secret present in the `x-admin-secret` header that matches `ADMIN_ENDPOINT_SECRET` environment variable.

- For production, prefer using server-to-server secrets stored in a secure secret manager and restrict access by network/IP.

Endpoint

POST /set-claims
Body: { "uid": "USER_UID", "claims": { "admin": true } }
Headers:
- Authorization: Bearer <ID_TOKEN>  (optional, when caller is an admin user)
- x-admin-secret: <secret>  (optional, when using the server secret)

Response: { success: true } on success
