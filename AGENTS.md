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
                             │
                    ┌────────────────┐
                    │ Jellyfin Server│  (user-hosted, external)
                    │ REST API       │
                    └────────────────┘
                             ▲
                    ┌────────────────┐
                    │ Jellybox Device│  (physical hardware)
                    │ POST /api/play │
                    └────────────────┘
```

---

## Tech Stack Reference

| Concern          | Choice                         | Key Files                          |
|------------------|--------------------------------|------------------------------------|
| Framework        | Next.js 16 (App Router)        | `next.config.ts`                   |
| Language         | TypeScript                     | `tsconfig.json`                    |
| Styling          | Tailwind CSS                   | `tailwind.config.ts`, `globals.css`|
| Auth             | NextAuth v5                    | `src/auth.ts`, `src/middleware.ts` |
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
│   │   ├── (auth)/            # Route group — no dashboard layout
│   │   │   ├── actions.ts     # Auth server actions (signup, verify, reset password)
│   │   │   ├── layout.tsx     # Auth shell (logo + footer)
│   │   │   ├── signin/        # /auth/signin
│   │   │   ├── signup/        # /auth/signup
│   │   │   ├── verify-email/  # /auth/verify-email
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/       # Route group — requires auth session
│   │   │   ├── layout.tsx     # Dashboard shell (sidebar nav)
│   │   │   ├── dashboard/     # /dashboard (overview + activity)
│   │   │   ├── devices/       # /dashboard/devices + /pair + /[id]
│   │   │   │   └── actions.ts # createDevice, updateDevice, rotateKey, deleteDevice
│   │   │   ├── tags/          # /dashboard/tags + /new + /[id]
│   │   │   │   └── actions.ts # createTag, updateTag, deleteTag
│   │   │   ├── jellyfin/      # /dashboard/jellyfin + /clients
│   │   │   │   └── actions.ts # unlinkServer, saveClient, deleteClient
│   │   │   └── account/       # /dashboard/account
│   │   │       └── actions.ts # updateProfile, changePassword, deleteAccount, clearLog
│   │   ├── api/
│   │   │   ├── play/route.ts          # POST /api/play — device playback trigger
│   │   │   ├── jellyfin/
│   │   │   │   ├── connect/route.ts   # POST — link/validate Jellyfin server
│   │   │   │   ├── library/route.ts   # GET  — proxy library browse
│   │   │   │   └── clients/route.ts   # GET  — list active Jellyfin sessions
│   │   │   └── health/route.ts        # GET  — health check
│   │   ├── layout.tsx         # Root layout (fonts, metadata, SessionProvider)
│   │   ├── page.tsx           # Landing page (public)
│   │   └── globals.css        # Tailwind base + custom scrollbar
│   ├── auth.ts                # NextAuth v5: Credentials + Google providers, JWT callbacks
│   ├── middleware.ts           # Protects /dashboard/** and private /api/** routes
│   ├── components/
│   │   ├── ui/                # Primitives — Button, Input, Card, Badge, Modal…
│   │   ├── auth/              # SignInForm, SignUpForm, VerifyEmailView…
│   │   ├── dashboard/         # DashboardNav, OverviewStats, RecentActivityFeed
│   │   ├── devices/           # DeviceCard, PairDeviceFlow, ApiKeyDisplay, DeviceDetail
│   │   ├── tags/              # TagGrid, TagCard, TagForm, ContentPicker
│   │   ├── jellyfin/          # JellyfinConnectForm, JellyfinStatusCard, JellyfinClientList
│   │   └── account/           # AccountSettings
│   └── lib/
│       ├── db.ts              # Prisma singleton (globalThis pattern for dev hot-reload)
│       ├── crypto.ts          # encrypt/decrypt (AES-256-GCM), hashSecret, generateDeviceApiKey
│       ├── jellyfin.ts        # Jellyfin API client + JellyfinApiError
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
└── src/__tests__/
    ├── lib/                   # crypto.test.ts, utils.test.ts
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
- Middleware in `src/middleware.ts` blocks unauthenticated access to `/dashboard/**`.
- The `/api/play` endpoint uses its own device API key authentication (not NextAuth).

---

## Data Model

See `prisma/schema.prisma` for the authoritative schema. Key relationships:

```
User
 ├── JellyfinServer (0..1)
 │    └── JellyfinClient[] (0..n)
 ├── Device[] (0..n)
 │    └── defaultClient → JellyfinClient?
 ├── RfidTag[] (0..n)
 └── ActivityLog[] (0..n)
      ├── device? → Device
      └── rfidTag? → RfidTag
```

**Important:** `ActivityLog` snapshots `deviceName` and `jellyfinItemTitle` at write time. This
means logs remain readable after devices or tags are deleted.

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
| `JELLYFIN_ENCRYPTION_KEY` | 64-char hex key for encrypting Jellyfin tokens| Vercel dashboard / .env|
| `RESEND_API_KEY`          | Resend API key for transactional email        | Vercel dashboard / .env|
| `EMAIL_FROM`              | Verified sender address for Resend            | Vercel dashboard / .env|
| `NEXT_PUBLIC_APP_URL`     | Public URL (used in email links)              | Vercel dashboard / .env|

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
5. Update `src/middleware.ts` if the route needs protection (or exemption).

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

---

## Deployment (CI/CD, Vercel, required secrets)

- **Deploy target:** Vercel (zero-config with Next.js)
- **Database migrations:** Run `npx prisma migrate deploy` before each production deploy.
  This can be automated with a Vercel build command or a pre-deploy script.
- **Required dashboard env vars:** All variables in `.env.example` must be set.
- **Google OAuth redirect URI:** Add `https://your-domain.com/api/auth/callback/google`
  to the authorised redirect URIs in Google Cloud Console.
- **Resend domain verification:** Verify your sending domain in the Resend dashboard.

---

> **Important for agents:** AGENTS.md and README.md are living documents.
> After every meaningful change — new features, schema changes, new environment variables,
> updated conventions — you MUST update both files to reflect the current state of the project.
> Never leave them out of date. Any developer or agent reading these files should have an
> accurate picture of the project as it stands today.
