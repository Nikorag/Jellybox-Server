import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Self-host with Docker — Jellybox Docs' }

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-jf-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0 pb-8">
        <h3 className="font-semibold text-jf-text-primary text-sm mb-3">{title}</h3>
        <div className="space-y-3 text-sm text-jf-text-secondary leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-jf-elevated border border-jf-border text-jf-text-primary font-mono text-xs">
      {children}
    </code>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="p-4 rounded-lg bg-jf-elevated border border-jf-border text-jf-text-primary font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre">
      {children}
    </pre>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-jf-primary/30 bg-jf-primary-muted text-sm text-jf-text-secondary">
      <svg className="w-4 h-4 text-jf-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>{children}</div>
    </div>
  )
}

export default function SelfHostingPage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Self-host with Docker</h1>
        <p className="text-jf-text-secondary leading-relaxed">
          Run the whole Jellybox stack on your own hardware — a NAS, a Raspberry
          Pi, a home server, anywhere Docker runs. The repo ships a{' '}
          <Code>Dockerfile</Code> and a{' '}
          <Code>docker-compose.yml</Code> that bring up Postgres and the Jellybox
          web app together. You don&apos;t need Vercel, Neon, or any cloud
          account. The{' '}
          <Link href="/docs/server" className="text-jf-primary hover:underline">
            Vercel guide
          </Link>{' '}
          is the easier path; this is the more private one.
        </p>
      </div>

      {/* Prerequisites */}
      <div className="mb-8 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <h2 className="text-sm font-semibold text-jf-text-primary mb-3">Before you start</h2>
        <ul className="space-y-1.5 text-sm text-jf-text-secondary">
          {[
            'Docker Engine 24+ and Docker Compose v2',
            'A machine on the same network as your Jellyfin server',
            'Optionally: a reverse proxy (Caddy, nginx, Traefik, …) if you want HTTPS / a public domain',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-jf-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div>
        <Step n={1} title="Clone the repo">
          <CodeBlock>{`git clone https://github.com/Nikorag/Jellybox-Server.git
cd Jellybox-Server`}</CodeBlock>
        </Step>

        <Step n={2} title="Generate secrets">
          <p>
            Two values must be filled in before the stack will start cleanly. The
            first is the NextAuth signing secret, the second is the AES key
            Jellybox uses to encrypt Jellyfin tokens at rest (and OAuth state for
            the extension framework).
          </p>
          <CodeBlock>{`# AUTH_SECRET (any 32+ char string works; this is the canonical generator)
openssl rand -base64 32

# JELLYFIN_ENCRYPTION_KEY (must be exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`}</CodeBlock>
          <Callout>
            <strong className="text-jf-text-primary">Never change <Code>JELLYFIN_ENCRYPTION_KEY</Code></strong>{' '}
            once your install has stored encrypted data. Rotating it invalidates
            every saved Jellyfin token and every in-flight extension OAuth flow.
            Back the value up.
          </Callout>
        </Step>

        <Step n={3} title="Configure .env">
          <p>
            Copy the Docker-flavoured template and fill in the two secrets you
            generated.
          </p>
          <CodeBlock>{`cp .env.docker.example .env
$EDITOR .env`}</CodeBlock>
          <p>
            The required pair is <Code>AUTH_SECRET</Code> and{' '}
            <Code>JELLYFIN_ENCRYPTION_KEY</Code>. Everything else is optional —
            email sign-up via Resend, Google or generic OIDC sign-in, the{' '}
            <Code>ADMINS</Code> allowlist that gates extension registration, and
            so on. <Code>DATABASE_URL</Code> and <Code>AUTH_URL</Code> are managed
            by Compose, so leave them out of <Code>.env</Code>.
          </p>
        </Step>

        <Step n={4} title="Bring the stack up">
          <CodeBlock>{`docker compose up -d --build`}</CodeBlock>
          <p>
            On first boot the Jellybox container runs <Code>prisma migrate deploy</Code>{' '}
            against the empty Postgres volume, then starts Next.js on port 3000.
            Subsequent restarts re-apply any pending migrations idempotently.
          </p>
          <p>
            Open <Code>http://localhost:3000</Code> (or wherever you exposed the
            container) and create your account. From there it&apos;s the same as
            any Jellybox install: link Jellyfin, pair a device, register tags.
          </p>
        </Step>

        <Step n={5} title="Put it behind a reverse proxy (optional)">
          <p>
            Compose binds Jellybox to <Code>0.0.0.0:3000</Code> on the host. For
            anything beyond a LAN install, terminate TLS upstream and forward to
            the container. Set <Code>AUTH_URL</Code> in <Code>.env</Code> to your
            public hostname, e.g. <Code>https://jellybox.your-home.example</Code>{' '}
            — NextAuth uses this to sign callback URLs.
          </p>
          <p>Caddyfile example:</p>
          <CodeBlock>{`jellybox.your-home.example {
  reverse_proxy localhost:3000
}`}</CodeBlock>
          <p>
            If you&apos;re using Google or OIDC sign-in, add the new callback URL{' '}
            <Code>{'<AUTH_URL>/api/auth/callback/google'}</Code> (or{' '}
            <Code>/oidc</Code>) to the provider&apos;s allowed redirects.
          </p>
        </Step>

        <Step n={6} title="Add an extension sidecar (optional)">
          <p>
            The compose file ships a commented-out{' '}
            <Code>jellybox-ha-extension</Code> service that runs the Home
            Assistant scripts example as a sidecar on the same Docker network.
            Uncomment it, set <Code>HOMEASSISTANT_URL</Code> and{' '}
            <Code>JELLYBOX_HA_BEARER_SECRET</Code> in your <Code>.env</Code>, and
            register the URL <Code>http://jellybox-ha-extension:4557</Code> at{' '}
            <Code>/dashboard/settings/extensions</Code>. The extension never has
            to be reachable from outside the Docker network — only Jellybox does.
          </p>
          <p>
            For the contract details and how to write your own extension, see{' '}
            <Link href="/docs/extensions" className="text-jf-primary hover:underline">
              Use &amp; build extensions
            </Link>.
          </p>
        </Step>

        <Step n={7} title="Firmware OTA (optional)">
          <p>
            By default your install advertises the latest GitHub release of the upstream firmware
            repo (<Code>Nikorag/Jellybox-Firmware</Code>) to every paired device. Devices fetch
            the manifest via <Code>/api/device/me</Code> every 30 seconds and self-update when a
            newer version is available — see the{' '}
            <Link href="/docs/firmware" className="text-jf-primary hover:underline">
              firmware OTA section
            </Link>{' '}
            for the full flow. The behaviour is configurable through two env vars in your{' '}
            <Code>.env</Code>:
          </p>
          <CodeBlock>{`# Track a different firmware repo (e.g. your own fork).
FIRMWARE_REPO=your-github-username/Jellybox-Firmware

# Pin every device to a specific release tag instead of the latest.
# Leave unset (or "latest") to always serve the newest release.
FIRMWARE_VERSION=v0.0.2`}</CodeBlock>
          <p>
            Both are optional. After changing either, restart the Jellybox container so the
            background fetcher picks up the new URL:
          </p>
          <CodeBlock>{`docker compose up -d`}</CodeBlock>
          <Callout>
            If you fork the firmware, your CI must publish a <Code>manifest.json</Code> asset on
            each release with at least <Code>version</Code> (string) and <Code>url</Code> (string)
            fields — <Code>url</Code> is the binary the device downloads. The upstream firmware
            repo&apos;s release workflow is the canonical reference.
          </Callout>
        </Step>

        <Step n={8} title="Backups">
          <p>
            All persistent state lives in the <Code>jellybox-postgres</Code> named
            volume. Snapshot it with:
          </p>
          <CodeBlock>{`docker compose exec postgres pg_dump -U jellybox jellybox > backup-$(date +%F).sql`}</CodeBlock>
          <p>
            Restore by re-importing into a fresh volume. Your <Code>.env</Code>{' '}
            file (specifically <Code>JELLYFIN_ENCRYPTION_KEY</Code>) must match
            the one that produced the backup, otherwise stored Jellyfin tokens
            won&apos;t decrypt.
          </p>
        </Step>
      </div>

      <div className="mt-6 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <h2 className="text-sm font-semibold text-jf-text-primary mb-2">Updating</h2>
        <p className="text-sm text-jf-text-secondary leading-relaxed">
          Pull the latest source and rebuild:
        </p>
        <div className="mt-2">
          <CodeBlock>{`git pull
docker compose up -d --build`}</CodeBlock>
        </div>
        <p className="text-sm text-jf-text-secondary leading-relaxed mt-3">
          Migrations run automatically on container start. Rolling back a
          deployment that ran a migration means restoring from the backup you
          took before — Prisma migrations aren&apos;t reversible in place.
        </p>
      </div>
    </div>
  )
}
