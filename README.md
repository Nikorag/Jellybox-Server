# Jellybox Server

<p align="center">
  <img src="Jellybox.png" alt="Jellybox" width="120" />
</p>

> SaaS companion app that links your Jellyfin server to physical RFID devices, letting children
> play media by scanning tags — no apps, no passwords, no rabbit holes.

---

## Overview

Jellybox Server is a Next.js 16 application hosted on Vercel. Parents create an account, link
their Jellyfin media server, pair physical Jellybox devices, and assign RFID tags to content.
When a child scans a tag on the physical device, it calls the `/api/play` endpoint which triggers
playback on the chosen Jellyfin client.

---

## Tech Stack

| Concern          | Choice                                          |
|------------------|-------------------------------------------------|
| Framework        | Next.js 16 (App Router)                         |
| Language         | TypeScript                                      |
| Styling          | Tailwind CSS (Jellyfin-inspired dark theme)     |
| Auth             | NextAuth v5 (Auth.js) — email/password + Google |
| ORM              | Prisma                                          |
| Database         | Neon PostgreSQL                                 |
| Email            | Resend                                          |
| Encryption       | AES-256-GCM (Node.js `crypto`)                  |
| Validation       | Zod                                             |
| Testing (unit)   | Jest + React Testing Library                    |
| Testing (e2e)    | Playwright                                      |
| Components       | Storybook 8                                     |
| Deployment       | Vercel                                          |

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Resend](https://resend.com) account (email verification + password reset)
- A [Google Cloud](https://console.cloud.google.com) OAuth app (optional, for Google sign-in)

---

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url> jellybox-server
cd jellybox-server
npm install
```

### 2. Environment Variables

Copy the example file and fill in every value:

```bash
cp .env.example .env.local
```

| Variable                  | Description                                                  | Example                              |
|---------------------------|--------------------------------------------------------------|--------------------------------------|
| `DATABASE_URL`            | Neon pooled connection string                                | `postgresql://user:pass@host/db?ssl...` |
| `DIRECT_URL`              | Neon direct connection string (used by Prisma migrations)    | same format, no pooler port          |
| `AUTH_SECRET`             | NextAuth secret — `openssl rand -base64 32`                 | `abc123...`                          |
| `AUTH_URL`                | Base URL of the application                                  | `http://localhost:3000`              |
| `AUTH_GOOGLE_ID`          | Google OAuth client ID                                       | `...apps.googleusercontent.com`      |
| `AUTH_GOOGLE_SECRET`      | Google OAuth client secret                                   | `GOCSPX-...`                         |
| `JELLYFIN_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `a1b2c3...` |
| `RESEND_API_KEY`          | Resend API key                                               | `re_...`                             |
| `EMAIL_FROM`              | Verified sender address                                      | `Jellybox <noreply@yourdomain.com>`  |
| `NEXT_PUBLIC_APP_URL`     | Public base URL (used in emails)                             | `http://localhost:3000`              |
| `AUTH_OIDC_ISSUER`        | (Optional) OIDC issuer URL — enables generic SSO when set with `_ID` and `_SECRET` | `https://auth.example.com`           |
| `AUTH_OIDC_ID`            | (Optional) OIDC client ID                                    | `jellybox`                           |
| `AUTH_OIDC_SECRET`        | (Optional) OIDC client secret                                | `...`                                |
| `AUTH_OIDC_NAME`          | (Optional) Button label for the OIDC provider                | `Authelia`                           |
| `AUTH_DISABLE_GOOGLE`     | (Optional) Set `true` to disable Google sign-in entirely     | `false`                              |
| `AUTH_DISABLE_SIGNUP`     | (Optional) Set `true` to disable account creation            | `false`                              |
| `DISABLE_PUBLIC_PAGES`    | (Optional) Set `true` to hide the landing and docs pages from anonymous users | `false`                              |

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (development)
npm run db:migrate

# Seed with a test user (optional)
npm run db:seed
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
jellybox-server/
├── prisma/
│   ├── schema.prisma          # Full data model
│   └── seed.ts                # Dev seed script
├── src/
│   ├── app/
│   │   ├── (auth)/            # Sign-in, sign-up, email verification, password reset
│   │   ├── (dashboard)/       # Authenticated dashboard routes
│   │   │   ├── dashboard/     # Overview page
│   │   │   ├── devices/       # Device management
│   │   │   ├── tags/          # RFID tag management
│   │   │   ├── jellyfin/      # Jellyfin integration
│   │   │   └── account/       # Profile & account settings
│   │   ├── api/
│   │   │   ├── play/          # POST /api/play — device playback trigger
│   │   │   ├── jellyfin/      # Jellyfin proxy routes
│   │   │   └── health/        # GET /api/health
│   │   └── page.tsx           # Landing page
│   ├── auth.ts                # NextAuth v5 configuration
│   ├── middleware.ts           # Route protection
│   ├── components/
│   │   ├── ui/                # Primitive components (Button, Input, Card…)
│   │   ├── auth/              # Auth form components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── devices/           # Device management components
│   │   ├── tags/              # Tag management + ContentPicker
│   │   ├── jellyfin/          # Jellyfin connect + client components
│   │   └── account/           # Account settings components
│   └── lib/
│       ├── db.ts              # Prisma singleton
│       ├── crypto.ts          # AES encryption + bcrypt helpers
│       ├── jellyfin.ts        # Jellyfin API client
│       ├── rate-limit.ts      # DB-backed rate limiter
│       ├── email.ts           # Resend email helpers
│       ├── utils.ts           # Utility functions (cn, formatDate…)
│       └── constants.ts       # App-wide constants
├── e2e/                       # Playwright tests
├── .storybook/                # Storybook config
└── src/__tests__/             # Jest unit tests
```

---

## Testing

### Unit Tests (Jest)

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

Tests live in `src/__tests__/` and mirror the source structure. API routes, server actions, and
library utilities are all covered with mocked Prisma + NextAuth.

### End-to-End Tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run all e2e tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

E2E tests use a Page Object Model (`e2e/pages/`). `global-setup.ts` seeds a test user and saves
an authenticated session state to `e2e/.auth/user.json`.

**Note:** E2E tests require a running local server (`npm run dev`) and a seeded database.

---

## Storybook

```bash
npm run storybook        # Start dev server on :6006
npm run build-storybook  # Build static output
```

Every component in `src/components/` has a co-located `.stories.tsx` file covering all key states.

---

## Deployment (Vercel)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add every environment variable from `.env.example` to the Vercel project dashboard.
4. Set `AUTH_URL` to your production URL (e.g. `https://jellybox.yourapp.com`).
5. Run the initial database migration:
   ```bash
   npx prisma migrate deploy
   ```
   or configure a Vercel build command to run this automatically.
6. Deploy.

### Required Vercel environment variables

All variables listed in `.env.example` are required. For production:
- `DATABASE_URL` — use Neon's **pooled** connection string
- `DIRECT_URL` — use Neon's **direct** (non-pooled) connection string
- `AUTH_URL` — your production HTTPS URL
- `JELLYFIN_ENCRYPTION_KEY` — generate once, store securely, never change (changing it
  invalidates all stored Jellyfin tokens)

---

## Contributing

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes with tests.
3. Run `npm test` and `npm run lint` before opening a PR.
4. Open a PR against `main`. CI will run tests automatically.

