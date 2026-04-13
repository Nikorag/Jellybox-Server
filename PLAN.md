# Jellybox Server — Build Plan v1.0

## Summary

Jellybox Server is a SaaS companion application for a physical RFID device that lets children play
Jellyfin media content by scanning physical tags. Parents register an account, link their Jellyfin
server, pair their physical Jellybox device(s), and assign RFID tags to specific content. The
server exposes a lightweight API that the physical device calls when a tag is scanned — triggering
playback on the user's chosen Jellyfin client. The app is hosted on Vercel with a Neon PostgreSQL
database.

---

## Tech Stack

| Concern          | Choice                                      |
|------------------|---------------------------------------------|
| Framework        | Next.js 16 (App Router)                     |
| Language         | TypeScript                                  |
| Styling          | Tailwind CSS (Jellyfin-inspired dark theme) |
| Auth             | NextAuth v5 (Auth.js)                       |
| Persistence      | Prisma ORM                                  |
| Database         | Neon PostgreSQL                             |
| Email            | Resend (email verification + password reset)|
| Encryption       | Node.js `crypto` (AES-256-GCM)             |
| Validation       | Zod                                         |
| Testing (unit)   | Jest + React Testing Library                |
| Testing (e2e)    | Playwright                                  |
| Components       | Storybook 8                                 |
| Deployment       | Vercel                                      |

> **Note on email:** Email verification and password reset require a transactional email provider.
> Resend is used (`resend` package). Users must supply a `RESEND_API_KEY` and `EMAIL_FROM`
> environment variable.

---

## Data Model

### User
| Field           | Type      | Notes                                      |
|-----------------|-----------|--------------------------------------------|
| id              | String    | cuid, primary key                          |
| email           | String    | unique                                     |
| emailVerified   | DateTime? | null until verified                        |
| name            | String?   |                                            |
| image           | String?   | OAuth avatar URL                           |
| passwordHash    | String?   | null for OAuth-only users                  |
| twoFactorSecret | String?   | TOTP secret (optional, future phase)       |
| createdAt       | DateTime  |                                            |
| updatedAt       | DateTime  |                                            |

### Account (NextAuth OAuth)
Standard NextAuth Account model — links OAuth providers to a User.

### Session (NextAuth)
Standard NextAuth Session model.

### VerificationToken (NextAuth)
Standard NextAuth VerificationToken — reused for email verification and password reset.

### JellyfinServer
| Field          | Type      | Notes                                            |
|----------------|-----------|--------------------------------------------------|
| id             | String    | cuid                                             |
| userId         | String    | FK → User (unique — one server per user)         |
| serverUrl      | String    | Base URL of Jellyfin instance                    |
| apiToken       | String    | AES-256-GCM encrypted Jellyfin API token         |
| serverId       | String?   | Jellyfin server UUID (from /System/Info)         |
| serverName     | String?   | Jellyfin server name (from /System/Info)         |
| status         | Enum      | CONNECTED / UNREACHABLE / AUTH_ERROR             |
| lastCheckedAt  | DateTime? |                                                  |
| createdAt      | DateTime  |                                                  |
| updatedAt      | DateTime  |                                                  |

### JellyfinClient (saved playback clients)
| Field            | Type     | Notes                                          |
|------------------|----------|------------------------------------------------|
| id               | String   | cuid                                           |
| userId           | String   | FK → User                                      |
| jellyfinServerId | String   | FK → JellyfinServer                            |
| jellyfinDeviceId | String   | Jellyfin's persistent DeviceId                 |
| deviceName       | String   | Human-readable name from Jellyfin              |
| lastSeenAt       | DateTime |                                                |
| createdAt        | DateTime |                                                |

### Device (physical Jellybox hardware)
| Field               | Type      | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| id                  | String    | cuid                                        |
| userId              | String    | FK → User                                   |
| name                | String    | User-assigned label                         |
| apiKeyHash          | String    | bcrypt hash of the API key                  |
| apiKeyPrefix        | String    | First 8 chars of API key for display        |
| defaultClientId     | String?   | FK → JellyfinClient                         |
| lastSeenAt          | DateTime? |                                             |
| firmwareVersion     | String?   | Reported by device in API calls             |
| createdAt           | DateTime  |                                             |
| updatedAt           | DateTime  |                                             |

### RfidTag
| Field                  | Type     | Notes                                      |
|------------------------|----------|--------------------------------------------|
| id                     | String   | cuid                                       |
| userId                 | String   | FK → User                                  |
| tagId                  | String   | Raw RFID hardware UID                      |
| label                  | String   | User-assigned friendly name                |
| jellyfinItemId         | String?  | Jellyfin item ID                           |
| jellyfinItemType       | Enum?    | MOVIE / SERIES / EPISODE / ALBUM / PLAYLIST|
| jellyfinItemTitle      | String?  | Cached title (updated on assignment)       |
| jellyfinItemImageTag   | String?  | Jellyfin image tag for artwork URL         |
| createdAt              | DateTime |                                            |
| updatedAt              | DateTime |                                            |

> `jellyfinItemTitle` and `jellyfinItemImageTag` are cached on assignment only — not permanently
> synced. Artwork is rendered via the Jellyfin `/Items/{id}/Images/Primary` endpoint at display
> time using the stored imageTag.

### ActivityLog
| Field             | Type      | Notes                                        |
|-------------------|-----------|----------------------------------------------|
| id                | String    | cuid                                         |
| userId            | String    | FK → User                                    |
| deviceId          | String?   | FK → Device (nullable — device may be deleted)|
| deviceName        | String    | Snapshot of device name at log time          |
| rfidTagId         | String?   | FK → RfidTag (nullable)                      |
| tagId             | String    | Raw RFID UID snapshot                        |
| jellyfinItemTitle | String?   | Snapshot of content title                    |
| success           | Boolean   |                                              |
| errorCode         | String?   | e.g. UNASSIGNED / OFFLINE / AUTH_ERROR       |
| createdAt         | DateTime  |                                              |

---

## Application Routes

### Pages

| Route                             | Description                                              |
|-----------------------------------|----------------------------------------------------------|
| `/`                               | Landing/marketing page                                   |
| `/auth/signin`                    | Sign in (email/password + Google)                        |
| `/auth/signup`                    | Create account                                           |
| `/auth/verify-email`              | Email verification prompt + resend link                  |
| `/auth/forgot-password`           | Request password reset email                             |
| `/auth/reset-password`            | Reset password via token                                 |
| `/dashboard`                      | Overview: server status, devices, tag count, activity    |
| `/dashboard/devices`              | List all paired devices                                  |
| `/dashboard/devices/pair`         | Pair a new device (generate & display API key)           |
| `/dashboard/devices/[id]`         | Device settings (name, default client, key rotation)     |
| `/dashboard/tags`                 | Tag library (card grid, search, filter)                  |
| `/dashboard/tags/new`             | Register a new RFID tag                                  |
| `/dashboard/tags/[id]`            | Edit tag assignment (browse Jellyfin library to assign)  |
| `/dashboard/jellyfin`             | Jellyfin server link/unlink, connection status           |
| `/dashboard/jellyfin/clients`     | Manage saved Jellyfin playback clients                   |
| `/dashboard/account`             | Profile settings, password change, 2FA, delete account  |

### API Routes

| Route                        | Method | Auth           | Description                                          |
|------------------------------|--------|----------------|------------------------------------------------------|
| `/api/play`                  | POST   | Device API key | Trigger playback for an RFID tag                     |
| `/api/jellyfin/connect`      | POST   | Session        | Validate and link a Jellyfin server                  |
| `/api/jellyfin/library`      | GET    | Session        | Proxy browse Jellyfin library (search + filter)      |
| `/api/jellyfin/clients`      | GET    | Session        | Fetch active Jellyfin sessions/devices               |
| `/api/health`                | GET    | None           | Health check                                         |

---

## Component Hierarchy

### Primitives (`src/components/ui/`)
- `Button` — variants: primary, secondary, ghost, destructive; sizes: sm, md, lg
- `Input` — with label, error, helper text; forwardRef
- `Select` — styled select with option groups
- `Card` — container with optional hover state
- `Badge` — status indicators (success, warning, error, neutral)
- `Modal` — accessible dialog with backdrop
- `ConfirmDialog` — reusable destructive-action confirmation modal
- `Spinner` — loading indicator
- `Avatar` — user/device avatar with fallback initials
- `StatusIndicator` — dot + label for connection status
- `EmptyState` — empty list/grid placeholder with icon + CTA
- `ErrorBoundary` — React error boundary wrapper
- `PageHeader` — page title + breadcrumb + optional action button
- `Skeleton` — loading skeleton variants

### Feature Components (`src/components/[feature]/`)

**auth/**
- `SignInForm` — email/password form + Google OAuth button
- `SignUpForm` — registration form
- `ForgotPasswordForm`
- `ResetPasswordForm`

**dashboard/**
- `DashboardNav` — sidebar navigation
- `DashboardShell` — layout shell with sidebar + main content area
- `OverviewStats` — stat cards (server status, device count, tag count)
- `RecentActivityFeed` — last N activity log entries

**jellyfin/**
- `JellyfinConnectForm` — URL + credential/API key form
- `JellyfinStatusCard` — server name, URL, status badge, unlink button
- `JellyfinLibraryBrowser` — search + type filter + infinite scroll results
- `JellyfinClientList` — list of saved clients with default selector
- `JellyfinClientCard` — individual client card

**devices/**
- `DeviceList` — list of paired devices
- `DeviceCard` — name, status, last seen, quick actions
- `DeviceDetail` — full device settings panel
- `PairDeviceFlow` — step-by-step pairing wizard (generate key → display → confirm)
- `ApiKeyDisplay` — one-time key display with copy button and warning

**tags/**
- `TagGrid` — card grid with search + filter controls
- `TagCard` — artwork, label, tag ID, edit/delete actions
- `TagForm` — create/edit tag (tag ID entry + content assignment)
- `ContentPicker` — Jellyfin library browser modal for assigning content

**account/**
- `ProfileForm` — display name + email
- `ChangePasswordForm`
- `DangerZone` — delete account section

---

## Auth Flow

1. **Sign Up (email/password):** User submits form → credentials hashed (bcrypt) → user record created (emailVerified: null) → verification email sent via Resend → user prompted to check email.
2. **Email Verification:** Token in email link → NextAuth VerificationToken table → on click, emailVerified set, user redirected to dashboard.
3. **Sign In:** NextAuth Credentials provider validates against passwordHash → JWT session issued.
4. **Google OAuth:** NextAuth Google provider → Account record linked to User.
5. **Password Reset:** User requests reset → token generated + emailed → token validated on `/auth/reset-password` → passwordHash updated.
6. **Protected Routes:** `src/middleware.ts` uses NextAuth `auth()` helper to protect all `/dashboard` and `/api` routes (except `/api/play` and `/api/health`).
7. **Device Auth:** `/api/play` uses a custom `verifyDeviceApiKey` helper — extracts Bearer token from `Authorization` header, bcrypt-compares against all hashed keys for active devices.

---

## Key Design Decisions

1. **Jellyfin API token encryption:** Stored with AES-256-GCM using `JELLYFIN_ENCRYPTION_KEY` env var. Never logged or returned to the client after storage.
2. **Device API key scheme:** Generated as `jb_${randomBytes(32).toString('hex')}`. Stored as bcrypt hash + first 8-char prefix for display. Shown to user exactly once on creation.
3. **Pairing flow:** Server-generated API key → user copies into device firmware. Device sends key as `Authorization: Bearer <key>` on all requests. First successful `/api/play` call marks device as active.
4. **Playback resolution:** At play time, fetch live Jellyfin sessions → match by `DeviceId` stored in `JellyfinClient` → use the matching session's `Id` for the `/Sessions/{sessionId}/Playing` call. If no active session found, return `OFFLINE` error.
5. **Content metadata caching:** Only `jellyfinItemId`, `jellyfinItemTitle`, and `jellyfinItemImageTag` are stored at tag-assignment time. Artwork served via Jellyfin's own image endpoint (no proxying or permanent storage of images).
6. **Rate limiting:** `/api/play` rate-limited per device API key using an in-DB counter with a sliding window (Neon is fast enough for this at expected volume; no Redis required).
7. **Graceful Jellyfin downtime:** All Jellyfin API calls wrapped with timeouts and try/catch. Dashboard shows last-known status from DB; stale status refreshed on dashboard load.
8. **Activity log snapshots:** Device name and content title are snapshotted into the log row at write time, so logs remain readable even after a device or tag is deleted.
9. **GDPR / account deletion:** Cascade deletes on all user-owned relations via Prisma `onDelete: Cascade`. Jellyfin API token deleted (not just nulled).
10. **No admin panel at MVP:** Operator management deferred to Phase 2.

---

## File Structure

```
jellybox-server/
├── prisma/
│   ├── schema.prisma          # Full data model
│   └── seed.ts                # Dev seed data
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth route group (no dashboard shell)
│   │   │   ├── signin/
│   │   │   ├── signup/
│   │   │   ├── verify-email/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/       # Authenticated route group
│   │   │   ├── layout.tsx     # Dashboard shell with sidebar nav
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── devices/
│   │   │   ├── tags/
│   │   │   ├── jellyfin/
│   │   │   └── account/
│   │   ├── api/
│   │   │   ├── play/route.ts
│   │   │   ├── jellyfin/
│   │   │   └── health/route.ts
│   │   ├── layout.tsx         # Root layout (fonts, metadata, providers)
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css
│   ├── auth.ts                # NextAuth v5 config
│   ├── middleware.ts           # Route protection
│   ├── components/
│   │   ├── ui/                # Primitive components
│   │   └── [feature]/         # Feature-specific compositions
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── crypto.ts          # AES encryption + bcrypt helpers
│   │   ├── jellyfin.ts        # Jellyfin API client
│   │   ├── rate-limit.ts      # DB-backed rate limiter
│   │   ├── email.ts           # Resend email helpers
│   │   └── constants.ts       # App-wide constants + error codes
│   └── __tests__/             # Jest tests (mirrors src/)
├── e2e/                       # Playwright tests
│   ├── pages/                 # Page Object Models
│   └── global-setup.ts
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── drizzle.config.ts          # N/A — Prisma used, file omitted
├── jest.config.ts
├── jest.setup.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── AGENTS.md
├── PLAN.md
└── README.md
```

---

## Phased Implementation Plan

- **Phase 1:** Project scaffold & config (package.json, next.config, tsconfig, Tailwind, ESLint, Prettier, .env.example, .gitignore)
- **Phase 2:** Data model & DB setup (Prisma schema, Neon connection, migration, seed script)
- **Phase 3:** Auth (NextAuth v5 — credentials + Google, email verification, password reset, middleware)
- **Phase 4:** Core UI primitives (Tailwind theme tokens, all `src/components/ui/` components)
- **Phase 5:** Dashboard shell & layout (sidebar nav, DashboardShell, root + dashboard layouts)
- **Phase 6:** Landing page
- **Phase 7:** Jellyfin integration (connect form, library browser, client management, server actions)
- **Phase 8:** Device management (pairing flow, device CRUD, API key rotation)
- **Phase 9:** RFID tag management (tag grid, tag CRUD, content picker)
- **Phase 10:** Playback API (`/api/play`, device auth, rate limiting, activity logging)
- **Phase 11:** Overview dashboard page (stats, activity feed)
- **Phase 12:** Account settings (profile, password, delete account)
- **Phase 13:** Jest unit tests (all route handlers + server actions + lib utilities)
- **Phase 14:** Playwright e2e tests (auth flows, device pairing, tag management, playback)
- **Phase 15:** Storybook stories (all components)
- **Phase 16:** README.md + AGENTS.md
