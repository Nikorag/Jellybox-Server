# AGENTS.md — Jellybox Server

## Purpose

This file is the authoritative reference for any developer or AI agent working on this codebase.
Read it before making changes. Update it after every meaningful change.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Next.js 16)                      │
│                                                                 │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  Auth Pages  │   │   Dashboard    │   │   API Routes     │  │
│  │  /auth/*     │   │  /(dashboard)/ │   │  /api/*          │  │
│  └──────────────┘   └────────────────┘   └──────────────────┘  │
│         │                   │                     │             │
│         └───────────────────┴─────────────────────┘             │
│                             │                                   │
│                    ┌────────────────┐                           │
│                    │  Prisma / DB   │                           │
│                    │  (Neon PG)     │                           │
│                    └────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                  │                          │
         ┌────────────────┐         ┌──────────────────┐
         │ Jellyfin Server│         │  Extension(s)    │  (Lambda or sidecar)
         │ REST API       │         │  HTTP contract   │
         └────────────────┘         │  (any media      │
                  ▲                 │   source)        │
                  │                 └──────────────────┘
         ┌────────────────┐
         │ Jellybox Device│  (physical hardware)
         │ POST /api/play │
         └────────────────┘
```

A tag can be backed by either Jellyfin (the built-in integration) or an
**extension** — a third-party HTTP service that implements a fixed contract.
The device firmware doesn't change between sources; `/api/play` routes the
request to the right backend based on the tag's source.

---

## Tech Stack Reference

| Concern          | Choice                         | Key Files                          |
|------------------|--------------------------------|------------------------------------|
| Framework        | Next.js 16 (App Router)        | `next.config.ts`                   |
| Language         | TypeScript                     | `tsconfig.json`                    |
| Styling          | Tailwind CSS                   | `tailwind.config.ts`, `globals.css`|
| Auth             | NextAuth v5 — email/password, Google, generic OIDC | `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` |
| ORM              | Prisma                         | `prisma/schema.prisma`, `src/lib/db.ts` |
| Database         | Neon PostgreSQL                | `DATABASE_URL` env var             |
| Email            | Resend                         | `src/lib/email.ts`                 |
| Encryption       | AES-256-GCM                    | `src/lib/crypto.ts`                |
| Validation       | Zod                            | All API routes + server actions    |
| Unit Tests       | Jest + RTL                     | `jest.config.ts`, `src/__tests__/` |
| E2E Tests        | Playwright                     | `playwright.config.ts`, `e2e/`     |
| Components       | Storybook 8                    | `.storybook/`, `*.stories.tsx`     |
| Deployment       | Vercel                         | N/A (zero-config)                  |

---

## Directory Structure

```
jellybox-server/
├── prisma/
│   ├── schema.prisma          # Authoritative data model — edit this, then migrate
│   └── seed.ts                # Dev seed: creates test@example.com / password123
├── src/
│   ├── app/
│   │   ├── auth/              # Auth flows — sign-in, sign-up, verify, reset
│   │   │   ├── actions.ts     # Auth server actions (signup, verify, reset password)
│   │   │   ├── layout.tsx     # Auth shell (logo + footer)
│   │   │   ├── signin/        # /auth/signin
│   │   │   ├── signup/        # /auth/signup
│   │   │   ├── verify-email/  # /auth/verify-email
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── dashboard/         # Authenticated dashboard — protected by proxy.ts
│   │   │   ├── layout.tsx     # Dashboard shell (sidebar nav)
│   │   │   ├── dashboard/     # /dashboard (overview + activity)
│   │   │   ├── devices/       # /dashboard/devices + /pair + /[id]
│   │   │   │   └── actions.ts # createDevice, updateDevice, rotateKey, deleteDevice
│   │   │   ├── tags/          # /dashboard/tags + /new + /[id]
│   │   │   │   └── actions.ts # createTag, updateTag, deleteTag
│   │   │   ├── jellyfin/      # /dashboard/jellyfin + /clients
│   │   │   │   └── actions.ts # unlinkServer, saveClient, deleteClient
│   │   │   ├── settings/
│   │   │   │   ├── webhooks/  # /dashboard/settings/webhooks
│   │   │   │   └── extensions/ # /dashboard/settings/extensions + /oauth-callback
│   │   │   └── account/       # /dashboard/account
│   │   │       └── actions.ts # updateProfile, changePassword, deleteAccount, clearLog
│   │   ├── api/
│   │   │   ├── play/route.ts          # POST /api/play — device playback trigger
│   │   │   ├── jellyfin/
│   │   │   │   ├── connect/route.ts   # POST — link/validate Jellyfin server
│   │   │   │   ├── library/route.ts   # GET  — proxy library browse
│   │   │   │   └── clients/route.ts   # GET  — list active Jellyfin sessions
│   │   │   ├── extensions/            # See "Extensions framework" below
│   │   │   │   ├── route.ts           # GET list / POST register (admin)
│   │   │   │   ├── [id]/              # delete (admin), connect, clients,
│   │   │   │   │   …                  # account, search, image, refresh-manifest, oauth/start
│   │   │   │   └── oauth/complete/    # POST — finish OAuth, mint ExtensionAccount
│   │   │   └── health/route.ts        # GET  — health check
│   │   ├── layout.tsx         # Root layout (fonts, metadata, SessionProvider)
│   │   ├── page.tsx           # Landing page (public)
│   │   └── globals.css        # Tailwind base + custom scrollbar
│   ├── auth.ts                # NextAuth v5 (Node.js): Credentials + Google + OIDC, JWT callbacks
│   ├── auth.config.ts         # Edge-safe NextAuth config (no Node.js modules) — used by proxy.ts
│   ├── proxy.ts               # Next.js 16 middleware — protects /dashboard/** and private /api/**
│   ├── components/
│   │   ├── ui/                # Primitives — Button, Input, Card, Badge, Modal…
│   │   ├── auth/              # SignInForm, SignUpForm, VerifyEmailView…
│   │   ├── dashboard/         # DashboardNav, OverviewStats, RecentActivityFeed
│   │   ├── devices/           # DeviceCard, PairDeviceFlow, ApiKeyDisplay, DeviceDetail
│   │   ├── tags/              # TagGrid, TagCard, TagForm, ContentPicker, ExtensionContentPicker
│   │   ├── jellyfin/          # JellyfinConnectForm, JellyfinStatusCard, JellyfinClientList
│   │   ├── extensions/        # ExtensionsSettings, AddExtensionForm, ExtensionCard
│   │   └── account/           # AccountSettings
│   └── lib/
│       ├── db.ts              # Prisma singleton (globalThis pattern for dev hot-reload)
│       ├── crypto.ts          # encrypt/decrypt (AES-256-GCM), hashSecret, generateDeviceApiKey
│       ├── jellyfin.ts        # Jellyfin API client + JellyfinApiError
│       ├── extensions/        # Extension framework — see "Extensions framework" section
│       │   ├── types.ts       # HTTP contract types (manifest, MediaItem, PlayResult, …)
│       │   ├── client.ts      # fetchManifest, authenticateComplete, authenticateStart,
│       │   │                  # authenticateExchange, search, getItem, getImage, getClients, play
│       │   └── server.ts      # requireSession, loadExtension, loadOwnAccount,
│       │                      # encodeOAuthState/decodeOAuthState, publicOrigin
│       ├── auth-flags.ts      # Env-driven auth flags + isExtensionsAdmin(email)
│       ├── rate-limit.ts      # DB-backed sliding window rate limiter
│       ├── email.ts           # Resend: sendVerificationEmail, sendPasswordResetEmail
│       ├── utils.ts           # cn(), formatDate(), formatRelativeTime(), getInitials()
│       └── constants.ts       # PLAY_ERROR codes, rate limit config, page sizes
├── e2e/
│   ├── pages/                 # Page Object Models (AuthPage, DashboardPage, DevicesPage)
│   ├── global-setup.ts        # Seeds e2e user + saves auth state to e2e/.auth/user.json
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   ├── devices.spec.ts
│   ├── tags.spec.ts
│   └── play-api.spec.ts
├── examples/
│   ├── extension-reference/    # Runnable reference implementation of the extension contract
│   └── extension-homeassistant/ # Home Assistant scripts extension (long-lived token, persisted)
└── src/__tests__/
    ├── lib/                   # crypto.test.ts, utils.test.ts, extensions/client.test.ts
    ├── api/                   # health.test.ts, play.test.ts, jellyfin-connect.test.ts
    └── actions/               # devices.test.ts, tags.test.ts
```

---

## Key Conventions

### Naming Conventions

| Thing               | Convention           | Example                             |
|---------------------|----------------------|-------------------------------------|
| React components    | PascalCase           | `DeviceCard.tsx`                    |
| Server actions      | camelCase + Action   | `createDeviceAction`                |
| Route handlers      | `route.ts` in dir   | `src/app/api/play/route.ts`         |
| Tests               | `*.test.ts`          | `crypto.test.ts`                    |
| Stories             | `*.stories.tsx`      | `Button.stories.tsx`                |
| Types/interfaces    | PascalCase           | `ButtonProps`                       |
| Constants           | SCREAMING_SNAKE_CASE | `PLAY_ERROR`, `RATE_LIMIT_MAX_REQUESTS` |

### Component Rules

- Every component is a TypeScript functional component.
- All props must be explicitly typed with an exported interface.
- Use `forwardRef` for form elements (Input, Select).
- No inline styles — Tailwind only.
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
- Every component in `src/components/` must have a co-located `.stories.tsx`.
- UI primitives live in `src/components/ui/` and are exported from `src/components/ui/index.ts`.

### API / Server Action Patterns

**Route Handlers:**
```typescript
// Always validate with Zod first
const parsed = schema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: '...' }, { status: 400 })

// Always check auth
const session = await auth()
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

// Return consistent shape
return NextResponse.json({ data: result })         // success
return NextResponse.json({ error: message }, { status: 4xx/5xx }) // error
```

**Server Actions:**
```typescript
// Always check auth first
const session = await auth()
if (!session?.user?.id) return { error: 'Unauthorised' }

// Return consistent shape
return { success: true }   // success
return { error: 'message' } // error
```

- Call `revalidatePath()` after mutations that affect the UI.
- Never throw raw errors to the client — always catch and return `{ error: '...' }`.

### Database Access Patterns

- Always scope queries to the authenticated user: `where: { ..., userId: session.user.id }`.
- Use `updateMany` / `deleteMany` with `userId` scope (never `update` / `delete` by ID alone).
- Never return the `apiKeyHash`, `passwordHash`, or `apiToken` fields to the client.
- The `apiToken` field in `JellyfinServer` is always stored encrypted — decrypt with `decrypt()` from `src/lib/crypto.ts` before use.

### Auth Patterns

- Session is a JWT (`session: { strategy: 'jwt' }`).
- Access `session.user.id` — it's populated in the `jwt` callback and always present for authenticated users.
- Middleware in `src/proxy.ts` (Next.js 16's renamed middleware file) blocks unauthenticated access to `/dashboard/**`.
- The `/api/play` endpoint uses its own device API key authentication (not NextAuth).

---

## Data Model

See `prisma/schema.prisma` for the authoritative schema. Key relationships:

```
User
 ├── JellyfinServer (0..1)
 │    └── JellyfinClient[] (0..n)
 ├── ExtensionAccount[] (0..n)         # this user's connections to extensions
 │    └── extension → Extension
 ├── addedExtensions: Extension[]      # audit only — extensions this admin added
 ├── Device[] (0..n)
 │    └── defaultClient → JellyfinClient?
 ├── RfidTag[] (0..n)
 │    └── extension? → Extension       # alternative to jellyfin* fields
 └── ActivityLog[] (0..n)
      ├── device? → Device
      └── rfidTag? → RfidTag

Extension (system-wide)
 ├── addedBy? → User                   # admin who registered it
 └── accounts: ExtensionAccount[]      # one row per user who's connected
```

**Extensions are system-wide**, not user-scoped. Admins (see `ADMINS` env)
register an extension once; every user can then connect their own
`ExtensionAccount` to it. A `RfidTag` is either Jellyfin-backed
(`jellyfinItemId` set) or extension-backed (`extensionId` + `externalItemId`
set) — never both. The play route branches on which fields are populated.

**Important:** `ActivityLog` snapshots `deviceName` and `jellyfinItemTitle` at write time. This
means logs remain readable after devices or tags are deleted. For
extension-backed tags the external item title is also stored in
`jellyfinItemTitle` for v1 — renaming that column is a future cleanup.

---

## Extensions framework

Extensions are out-of-process HTTP services that let Jellybox play media from
sources other than Jellyfin. They can be hosted as Lambda functions or as
self-hosted sidecars on the same Docker network as Jellybox — they never need
to be publicly reachable. No third-party extensions ship with the project
today; the framework is the surface.

### Registration model

- **System-wide.** An admin (email listed in the `ADMINS` env var, comma
  separated, case-insensitive) registers an extension by URL. Jellybox fetches
  `/manifest`, generates a one-time bearer secret, and persists the row.
- **Per-user accounts.** Once registered, every user can connect their own
  account to that extension. The user's credentials live entirely inside the
  extension; Jellybox stores only the opaque `accountId` the extension hands
  back.
- **Empty `ADMINS` = closed.** If `ADMINS` is unset, no one can register
  extensions.

### HTTP contract (extension implements)

Defined in `src/lib/extensions/types.ts`. Every route except `/manifest` is
authenticated with `Authorization: Bearer <secret>`.

| Method | Path                       | When called                              |
|--------|----------------------------|------------------------------------------|
| GET    | `/manifest`                | Registration + manifest refresh          |
| POST   | `/authenticate/start`      | OAuth only — return provider URL         |
| POST   | `/authenticate/exchange`   | OAuth only — swap code for accountId     |
| POST   | `/authenticate/complete`   | Credentials only — fields → accountId    |
| POST   | `/search`                  | Tag picker UI                            |
| GET    | `/item`                    | (reserved)                               |
| GET    | `/image`                   | Tag artwork (proxied through Jellybox)   |
| GET    | `/clients`                 | Default-client picker in settings        |
| POST   | `/play`                    | `/api/play` round-trip                   |

`authFlow: 'credentials' | 'oauth'` in the manifest tells Jellybox which auth
endpoints to use. Refresh tokens are entirely the extension's responsibility —
Jellybox never sees them.

### OAuth flow (Jellybox-hosted callback)

1. User clicks Connect → `POST /api/extensions/[id]/oauth/start`.
2. Jellybox mints encrypted state and calls extension `/authenticate/start
   { state, callbackUrl: <Jellybox callback URL> }`.
3. Browser is full-page redirected to the provider URL the extension returned.
4. Provider redirects back to `${origin}/dashboard/settings/extensions/oauth-callback?state=…&code=…`.
5. Callback page POSTs `{ state, code }` to `/api/extensions/oauth/complete`.
6. Server decodes state, calls extension `/authenticate/exchange { code, callbackUrl }` server-to-server.
7. Extension returns `{ accountId, displayName }`; Jellybox upserts `ExtensionAccount`.

State is encrypted with the existing `JELLYFIN_ENCRYPTION_KEY` and self-expiring (10 min) — no DB table needed.

### Reference extension

`examples/extension-reference/server.mjs` is a tiny stand-alone Node script
that implements the full contract with canned data. Run with
`AUTH_FLOW=oauth node server.mjs` to exercise the OAuth path (with a fake
provider screen). Use it as the test harness for changes to the contract.

### Environment

- `ADMINS` — comma-separated list of admin emails. Empty/unset = closed.
- `NEXT_DEV_ORIGINS` — comma-separated list of LAN hosts when running
  `next dev -H 0.0.0.0` (otherwise Next.js blocks HMR/chunk fetches).

---

## Firmware OTA

OTA is **user-triggered from the dashboard**, never automatic. Devices are gated by a
`firmwareUpdatePending` flag on the `Device` row.

**Flow.**

1. Server fetches a release manifest from GitHub on startup and every 5 min thereafter.
   `FIRMWARE_REPO` (default `Nikorag/Jellybox-Firmware`) and `FIRMWARE_VERSION` (default
   `latest`) control what URL is fetched. The last good manifest is kept in memory; a failed
   fetch falls back to it. Cold start with no successful fetch = no updates can be issued.
2. Each device polls `GET /api/device/me` every 30 s and includes its running version as
   `?version=<tag>`. The server records that on the row.
3. The dashboard's Firmware card compares the running version to the manifest version. The
   user clicks **Update firmware** → server action sets `firmwareUpdatePending=true`.
4. On the next `/api/device/me` poll, the server includes a `latestFirmware: { version, url }`
   block in the response (only when `firmwareUpdatePending` is true). The device then downloads
   the binary directly from GitHub, flashes it, and reboots.
5. After reboot the device reports the new version. The route compares it to the manifest; if
   they match, `firmwareUpdatePending` is cleared automatically.

**Where this lives.**

| Concern              | File                                                  |
|----------------------|-------------------------------------------------------|
| Manifest fetch/cache | `src/lib/firmware-manifest.ts` (or equivalent)        |
| Per-poll response    | `src/app/api/device/me/route.ts`                      |
| Pending-flag mutation| `src/app/dashboard/devices/actions.ts`                |
| Dashboard UI         | `src/components/devices/DeviceDetail.tsx`             |

If you fork the firmware, your release CI must publish a `manifest.json` asset alongside the
`.bin` with at least `version` (string) and `url` (string) fields.

---

## Environment Variables

| Variable                  | Purpose                                       | Where set              |
|---------------------------|-----------------------------------------------|------------------------|
| `DATABASE_URL`            | Neon pooled connection (runtime queries)      | Vercel dashboard / .env|
| `DIRECT_URL`              | Neon direct connection (Prisma migrations)    | Vercel dashboard / .env|
| `AUTH_SECRET`             | NextAuth JWT signing secret                   | Vercel dashboard / .env|
| `AUTH_URL`                | App base URL for NextAuth callbacks           | Vercel dashboard / .env|
| `AUTH_GOOGLE_ID`          | Google OAuth client ID                        | Vercel dashboard / .env|
| `AUTH_GOOGLE_SECRET`      | Google OAuth client secret                    | Vercel dashboard / .env|
| `JELLYFIN_ENCRYPTION_KEY` | 64-char hex key — encrypts Jellyfin tokens AND OAuth state | Vercel dashboard / .env|
| `RESEND_API_KEY`          | Resend API key for transactional email        | Vercel dashboard / .env|
| `EMAIL_FROM`              | Verified sender address for Resend            | Vercel dashboard / .env|
| `NEXT_PUBLIC_APP_URL`     | Public URL (used in email links)              | Vercel dashboard / .env|
| `ADMINS`                  | Comma-separated admin emails for extension management. Empty/unset = closed | Vercel dashboard / .env|
| `NEXT_DEV_ORIGINS`        | (Dev only) Comma-separated LAN hosts allowed when running `next dev -H 0.0.0.0` | `.env.local`        |
| `AUTH_OIDC_ISSUER`        | (Optional) OIDC issuer URL — enables generic SSO when set with `_ID` and `_SECRET` | Vercel dashboard / .env|
| `AUTH_OIDC_ID`            | (Optional) OIDC client ID                     | Vercel dashboard / .env|
| `AUTH_OIDC_SECRET`        | (Optional) OIDC client secret                 | Vercel dashboard / .env|
| `AUTH_OIDC_NAME`          | (Optional) Button label for the OIDC provider | Vercel dashboard / .env|
| `AUTH_DISABLE_GOOGLE`     | (Optional) Set `true` to disable Google sign-in entirely | Vercel dashboard / .env|
| `AUTH_DISABLE_SIGNUP`     | (Optional) Set `true` to disable account creation | Vercel dashboard / .env|
| `DISABLE_PUBLIC_PAGES`    | (Optional) Set `true` to hide landing/docs from anonymous users | Vercel dashboard / .env|
| `FIRMWARE_REPO`           | (Optional) GitHub `owner/name` of the firmware repo polled for OTA. Defaults to `Nikorag/Jellybox-Firmware` | Vercel dashboard / .env|
| `FIRMWARE_VERSION`        | (Optional) Pin all devices to a specific firmware tag. Unset/`latest` = newest GitHub release | Vercel dashboard / .env|

⚠ **Never change `JELLYFIN_ENCRYPTION_KEY` in production** — doing so will invalidate every
stored Jellyfin API token and require all users to re-link their servers.

---

## Running the Project

```bash
npm install           # Install dependencies
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Apply migrations (dev)
npm run dev           # Start dev server on :3000
npm run build         # Production build
npm test              # Jest unit tests
npm run test:e2e      # Playwright e2e tests
npm run storybook     # Storybook on :6006
```

---

## Testing Strategy

| Layer        | Tool       | Location              | What's tested                           |
|--------------|------------|-----------------------|-----------------------------------------|
| Unit         | Jest + RTL | `src/__tests__/`      | API route handlers, server actions, lib utilities |
| E2E          | Playwright | `e2e/`                | Auth flows, device pairing, tag CRUD, playback API |
| Visual       | Storybook  | `*.stories.tsx`       | Component rendering across all states  |

All Prisma and NextAuth calls are mocked in Jest tests using `jest.mock()`.
E2E tests use a real database — `e2e/global-setup.ts` seeds the test user.

---

## Common Tasks

### Adding a new page

1. Create `src/app/(dashboard)/your-route/page.tsx`.
2. Add the route to the `navItems` array in `src/components/dashboard/DashboardNav.tsx` if it needs nav.
3. Add a `loading.tsx` and `error.tsx` if the route fetches data.

### Adding a new component + story

1. Create `src/components/[feature]/YourComponent.tsx`.
2. Create `src/components/[feature]/YourComponent.stories.tsx` with `Default` + key state variants.
3. Export from the feature directory (or `src/components/ui/index.ts` for primitives).

### Adding a new API route or server action

1. For API routes: create `src/app/api/your-route/route.ts`.
2. For server actions: add to the relevant `actions.ts` file in `src/app/(dashboard)/[feature]/`.
3. Validate input with Zod.
4. Write Jest tests in `src/__tests__/api/` or `src/__tests__/actions/`.
5. Update `src/proxy.ts` if the route needs protection (or exemption).

### Adding a new DB entity / model

1. Add the model to `prisma/schema.prisma`.
2. Run `npm run db:migrate` (development) or `npm run db:migrate:prod` (production).
3. Run `npm run db:generate` to update the Prisma client.
4. Add the relation to the `User` model if user-scoped.
5. Ensure cascade delete is set if the entity is owned by a user (`onDelete: Cascade`).

### Adding a new auth provider

1. Install the provider package if needed.
2. Add the provider to the `providers` array in `src/auth.ts`.
3. Add required env vars to `.env.example` and `AGENTS.md`.
4. Update the sign-in page / form if the provider needs a custom button.

### Building a new media extension

Extensions live outside this repo — they're standalone HTTP services.
`examples/extension-reference/server.mjs` is the canonical starter.

1. Implement the routes listed under "Extensions framework" above. Types are
   in `src/lib/extensions/types.ts`.
2. Choose `authFlow: 'credentials'` (form fields, posted to
   `/authenticate/complete`) or `'oauth'` (extension hosts `/authenticate/start`
   + `/authenticate/exchange`; Jellybox hosts the browser callback).
3. Persist the access/refresh tokens you receive keyed by the `accountId` you
   return. Refresh transparently on each call; return `AUTH_ERROR` when refresh
   itself fails so the user knows to reconnect.
4. Verify `Authorization: Bearer <secret>` on every protected route — the
   secret is shown to the admin once at registration time.
5. Test against a running Jellybox by adding the URL at
   `/dashboard/settings/extensions` (must be signed in as an admin).

---

## Known Gotchas & Constraints

1. **`.npmrc` sets `legacy-peer-deps=true`:** `@storybook/nextjs` hasn't updated its peer dep declaration to include Next.js 16 yet. The flag suppresses the npm conflict — Storybook works fine at runtime. Remove it once Storybook publishes a version that declares Next.js 16 support.

2. **Neon connection pooling:** Use `DATABASE_URL` (pooled) for runtime queries and `DIRECT_URL` (direct) for Prisma migrations. Vercel serverless functions must use the pooled URL.

3. **Jellyfin session IDs are ephemeral:** The playback API (`/api/play`) resolves the live Jellyfin session at request time by matching `DeviceId`. If the Jellyfin client is not active, it returns `OFFLINE`. Saved `JellyfinClient` records store the persistent `DeviceId`, not the ephemeral `SessionId`.

4. **`JELLYFIN_ENCRYPTION_KEY` is permanent:** Once set in production, it must never change. Rotating it would invalidate all stored Jellyfin tokens.

5. **Device API key shown once:** The raw API key is returned by `createDeviceAction` and `rotateDeviceKeyAction` only. It is never stored in plain text. If a user loses it, they must rotate.

6. **Content metadata is cached on assignment:** `jellyfinItemTitle` and `jellyfinItemImageTag` on `RfidTag` are captured when the tag is assigned — they are not synced automatically if the content changes in Jellyfin.

7. **`ActivityLog` snapshots:** `deviceName` and `jellyfinItemTitle` are snapshotted at log-write time. Relations to `Device` and `RfidTag` are nullable — they become null if the device/tag is deleted, but the log entry remains readable via the snapshots.

8. **Rate limiting is DB-backed:** The rate limiter counts `ActivityLog` entries (including failed ones) per device per minute. This is intentional — it limits overall API call volume per device, not just successful plays.

9. **`useActionState` requires `'use client'` and React 19:** All form components using server actions must be client components.

10. **Extension callback URL respects `Host` / `X-Forwarded-Host`:** OAuth and
    image-proxy URLs are derived from the inbound request headers via
    `publicOrigin()` in `src/lib/extensions/server.ts`. Don't switch back to
    `req.url` — bind addresses like `0.0.0.0` (used by `next dev -H 0.0.0.0`)
    leak into the URL handed to the OAuth provider.

11. **OAuth state is encrypted with `JELLYFIN_ENCRYPTION_KEY`:** Rotating this
    key invalidates not only stored Jellyfin tokens but also any in-flight
    OAuth flows (which expire in 10 minutes anyway).

12. **Extension secret shown once:** Like device API keys, the bearer secret
    Jellybox sends to extensions is shown only at registration. The admin
    pastes it into the extension's own config out-of-band.

---

## Deployment (CI/CD, Vercel, required secrets)

- **Deploy target:** Vercel (zero-config with Next.js)
- **Database migrations:** Run `npx prisma migrate deploy` before each production deploy.
  This can be automated with a Vercel build command or a pre-deploy script.
- **Required dashboard env vars:** All variables in `.env.example` must be set.
- **Google OAuth redirect URI:** Add `https://your-domain.com/api/auth/callback/google`
  to the authorised redirect URIs in Google Cloud Console.
- **Generic OIDC redirect URI:** If `AUTH_OIDC_*` is configured, register
  `https://your-domain.com/api/auth/callback/oidc` with the OIDC provider.
- **Resend domain verification:** Verify your sending domain in the Resend dashboard.

---

> **Important for agents:** AGENTS.md and README.md are living documents.
> After every meaningful change — new features, schema changes, new environment variables,
> updated conventions — you MUST update both files to reflect the current state of the project.
> Never leave them out of date. Any developer or agent reading these files should have an
> accurate picture of the project as it stands today.
