This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SoilMeter M1 authentication

Authentication uses Better Auth, its official Drizzle adapter, the existing
Neon serverless connection, and the App Router route at
`/api/auth/[...all]`. Browser sign-in uses HTTP-only Better Auth cookies.
Email/password registration does not require email verification; password
reset links use the configured SMTP server. Rate limits are stored in
PostgreSQL so they work across serverless instances.

### Local development (including Codespaces)

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to the Neon connection
   string, `BETTER_AUTH_SECRET` to a unique random value of at least 32
   characters, and SMTP values if password-reset email is needed.
2. Set `BETTER_AUTH_URL` to the current canonical development origin, including
   protocol and port (for example `http://localhost:3000`). Codespaces
   forwarded URLs can change; update this value when the active URL changes.
   In development, `http://localhost:3000` is also trusted for local previews.
3. Keep `AUTH_CLIENT_IP_HEADER` set to the client-IP header that the trusted
   proxy replaces. It defaults to `x-forwarded-for`; never select a header
   that an external client can supply unchanged.
4. Generate and review the additive migration, then apply it to the intended
   database:

   ```sh
   npm ci
   npm run db:generate
   # Review the new SQL in drizzle/ before running it.
   npm run db:migrate
   npm run dev
   ```

   Migration generation and application are separate. Do not apply migrations
   to production until the SQL has been reviewed and the database backed up.
   The auth migration adds Better Auth and rate-limit tables; it does not drop
   or alter the existing `users` table. `npm run db:migrate` applies migrations
   to whichever `DATABASE_URL` is configured, so check the target first.

### Environment variables

Required in every environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string; keep server-side only. |
| `BETTER_AUTH_SECRET` | Unique high-entropy secret, 32+ characters. Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Canonical application origin for this deployment. |
| `AUTH_CLIENT_IP_HEADER` | Trusted header overwritten by the hosting proxy, for rate-limit client identification (defaults to `x-forwarded-for`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | TLS-enabled SMTP delivery for password-reset emails. |

Never put these values in `NEXT_PUBLIC_*` variables or commit `.env`. Use a
different secret and canonical URL for development, preview, and production.
Password-reset requests fail closed if SMTP is not configured.

### Production deployment

- **Vercel:** deploy as a regular Next.js App Router application using the
  Node.js runtime (not Edge or static export). Add the variables above to the
  appropriate Development, Preview, and Production environments. Set
  `BETTER_AUTH_URL` to that environment's canonical origin and choose
  `AUTH_CLIENT_IP_HEADER` to match the proxy-provided, overwritten client-IP
  header.
- **Netlify:** enable the Netlify Next.js runtime/adapter and deploy as a
  server-rendered Next.js application, not a static export. Add the same
  environment variables to the site/deploy context. For Netlify, use
  `x-nf-client-connection-ip` for `AUTH_CLIENT_IP_HEADER` only if the
  deployment confirms that header is set by Netlify and cannot be passed
  through from the client. Set the canonical `BETTER_AUTH_URL` for each
  production or preview deployment.
- Allow the application runtime to connect to Neon. Do not run
  `db:migrate` automatically as part of a production build; review and apply
  migrations as a separate deployment step.

### Roles and protected routes

`/dashboard` validates the Better Auth session on the server. `/admin` and the
admin user APIs require an `admin` or `super_admin` role on the server. New
accounts always receive `user`; the Better Auth input schema excludes `role`,
and the database constrains it to `super_admin`, `admin`, or `user`. Only
super-admin-authorized server code can grant roles. Authorization helpers for
profile access, user management, and assigned device telemetry are in
`lib/auth/authorization.ts`; device access lists must come from trusted
server-side data, not request input.

After applying the migration and verifying an administrator account, promote
the initial super admin through a trusted database console. Replace the email
with the verified account's email and run once:

```sql
UPDATE "user"
SET "role" = 'super_admin'
WHERE "email" = 'admin@example.com'
  AND "emailVerified" = true;
```

`POST /api/telemetry` accepts JSON `{ "device_id": "...", "message": "...",
"moisture": 42 }` with a Better Auth session cookie. New readings are linked
to the signed-in user in Neon. `GET /api/telemetry` returns paginated history
for that same user only. Apply the generated migration adding the nullable
`user_id` ownership column and index before deploying this version; existing
unowned readings remain in the database but are not returned to user sessions.

### Routes

- `/register` — email/password account registration.
- `/login` — login and optional browser-session persistence.
- `/forgot-password` and `/reset-password` — email password-reset flow.
- `/api/auth/[...all]` — Better Auth API handler.
- `/api/telemetry` — Better Auth session-protected device ingestion and user-scoped telemetry history.
- `/dashboard` — authenticated user dashboard.
- `/admin` and `/api/admin/users` — server-role-protected administration.
