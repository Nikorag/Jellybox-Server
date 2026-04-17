import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Deploy the Server — Jellybox Docs' }

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

function EnvVar({ name, description, example, required = true }: {
  name: string
  description: string
  example?: string
  required?: boolean
}) {
  return (
    <div className="p-3 rounded-lg border border-jf-border bg-jf-elevated">
      <div className="flex items-start justify-between gap-2 mb-1">
        <code className="text-xs font-mono font-semibold text-jf-primary">{name}</code>
        {!required && (
          <span className="text-[10px] font-medium text-jf-text-muted bg-jf-surface border border-jf-border px-1.5 py-0.5 rounded-full flex-shrink-0">
            optional
          </span>
        )}
      </div>
      <p className="text-xs text-jf-text-secondary">{description}</p>
      {example && (
        <p className="text-xs text-jf-text-muted mt-1 font-mono">{example}</p>
      )}
    </div>
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

export default function ServerPage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Deploy the server</h1>
        <p className="text-jf-text-secondary leading-relaxed">
          The Jellybox server is a Next.js application. This guide deploys it to{' '}
          <strong className="text-jf-text-primary">Vercel</strong> with a{' '}
          <strong className="text-jf-text-primary">Neon</strong> PostgreSQL database — both have
          generous free tiers that are more than enough for a home setup.
        </p>
      </div>

      {/* Prerequisites */}
      <div className="mb-8 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <h2 className="text-sm font-semibold text-jf-text-primary mb-3">Before you start</h2>
        <ul className="space-y-1.5 text-sm text-jf-text-secondary">
          {[
            'A GitHub account',
            'A Vercel account (free)',
            'A Neon account (free) — neon.tech',
            'A Resend account (free) — resend.com — for email verification',
            'Optionally: a Google Cloud project for Google sign-in',
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
        <Step n={1} title="Fork the repository">
          <p>
            Go to{' '}
            <a href="https://github.com/Nikorag/Jellybox-Server" target="_blank" rel="noopener noreferrer"
              className="text-jf-primary hover:underline">
              github.com/Nikorag/Jellybox-Server
            </a>{' '}
            and click <strong className="text-jf-text-primary">Fork</strong>. You need your own fork so
            Vercel can deploy from it and so you can push any local customisations.
          </p>
        </Step>

        <Step n={2} title="Create a Neon database">
          <p>
            Sign in at <strong className="text-jf-text-primary">neon.tech</strong> and create a new project.
            Choose a region close to where you&apos;ll deploy on Vercel (e.g. <em>EU West</em> or <em>US East</em>).
          </p>
          <p>
            From the project dashboard, copy the <strong className="text-jf-text-primary">Connection string</strong>. It
            looks like:
          </p>
          <CodeBlock>{`postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`}</CodeBlock>
          <p>Save this — it becomes your <Code>DATABASE_URL</Code>.</p>
        </Step>

        <Step n={3} title="Generate your secrets">
          <p>
            You need two secrets. Run these commands locally (requires openssl, which is pre-installed on
            macOS and most Linux systems):
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-jf-text-muted mb-1">AUTH_SECRET — for signing session tokens:</p>
              <CodeBlock>{`openssl rand -base64 32`}</CodeBlock>
            </div>
            <div>
              <p className="text-xs text-jf-text-muted mb-1">JELLYFIN_ENCRYPTION_KEY — for encrypting your Jellyfin credentials:</p>
              <CodeBlock>{`openssl rand -hex 32`}</CodeBlock>
            </div>
          </div>
          <p>Copy both outputs and keep them somewhere safe.</p>
        </Step>

        <Step n={4} title="Get a Resend API key">
          <p>
            Jellybox sends a verification email when users create an account. Sign in at{' '}
            <strong className="text-jf-text-primary">resend.com</strong>, go to{' '}
            <strong className="text-jf-text-primary">API Keys</strong>, and create a key with{' '}
            <em>Sending access</em>. Copy the key — it starts with <Code>re_</Code>.
          </p>
          <Callout>
            On Resend&apos;s free plan you can send from <Code>onboarding@resend.dev</Code> without
            verifying a domain. That&apos;s enough to get started.
          </Callout>
        </Step>

        <Step n={5} title="Set up Google OAuth (optional)">
          <p>
            This enables &ldquo;Continue with Google&rdquo; on the sign-in and sign-up pages. Skip this
            step if you only want email/password accounts.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm">
            <li>Go to <strong className="text-jf-text-primary">console.cloud.google.com</strong> and create a project.</li>
            <li>Navigate to <strong className="text-jf-text-primary">APIs &amp; Services → Credentials</strong>.</li>
            <li>Click <strong className="text-jf-text-primary">Create Credentials → OAuth client ID</strong>.</li>
            <li>Choose <strong className="text-jf-text-primary">Web application</strong>.</li>
            <li>
              Add your Vercel domain to <strong className="text-jf-text-primary">Authorised JavaScript origins</strong>:<br />
              <Code>https://your-app.vercel.app</Code>
            </li>
            <li>
              Add this to <strong className="text-jf-text-primary">Authorised redirect URIs</strong>:<br />
              <Code>https://your-app.vercel.app/api/auth/callback/google</Code>
            </li>
            <li>Copy the <strong className="text-jf-text-primary">Client ID</strong> and <strong className="text-jf-text-primary">Client Secret</strong>.</li>
          </ol>
          <Callout>
            You&apos;ll need to come back and add the final Vercel URL after deploying in step 6.
          </Callout>
        </Step>

        <Step n={6} title="Deploy to Vercel">
          <p>
            Go to <strong className="text-jf-text-primary">vercel.com/new</strong> and import your
            forked repository. Vercel will detect it as a Next.js project automatically.
          </p>
          <p>
            Before clicking <strong className="text-jf-text-primary">Deploy</strong>, add all your
            environment variables (see step 7). Vercel will inject them at build time.
          </p>
        </Step>

        <Step n={7} title="Add environment variables">
          <p>In Vercel&apos;s project settings under <strong className="text-jf-text-primary">Environment Variables</strong>, add:</p>
          <div className="space-y-2 mt-2">
            <EnvVar
              name="DATABASE_URL"
              description="Your Neon connection string."
              example="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
            />
            <EnvVar
              name="AUTH_SECRET"
              description="32-byte base64 string for signing session JWTs. Generated in step 3."
            />
            <EnvVar
              name="JELLYFIN_ENCRYPTION_KEY"
              description="64-character hex key for AES-256-GCM encryption of Jellyfin credentials. Generated in step 3."
            />
            <EnvVar
              name="RESEND_API_KEY"
              description="Resend API key for sending verification and reset emails."
              example="re_xxxxxxxxxxxxxxxxxx"
            />
            <EnvVar
              name="NEXTAUTH_URL"
              description="Your full public URL. Vercel sets this automatically — you usually don't need to add it manually."
              example="https://your-app.vercel.app"
              required={false}
            />
            <EnvVar
              name="AUTH_GOOGLE_ID"
              description="Google OAuth client ID. Only required if you set up Google sign-in in step 5."
              required={false}
            />
            <EnvVar
              name="AUTH_GOOGLE_SECRET"
              description="Google OAuth client secret. Only required if you set up Google sign-in in step 5."
              required={false}
            />
          </div>
        </Step>

        <Step n={8} title="Run the database migration">
          <p>
            After the first deploy, the database tables need to be created. Clone your fork locally and run:
          </p>
          <CodeBlock>{`cd apps/server
cp .env.example .env.local
# Fill in DATABASE_URL in .env.local, then:
npm install
npm run db:migrate`}</CodeBlock>
          <p>
            This creates all the necessary tables (users, devices, tags, etc.) in your Neon database. You
            only need to do this once; future schema changes will apply automatically on deploy via
            the migration files in <Code>prisma/migrations/</Code>.
          </p>
          <Callout>
            You can also run <Code>npm run db:migrate</Code> from a Vercel build hook or a GitHub Action
            if you want fully automated deployments.
          </Callout>
        </Step>

        <Step n={9} title="Done — create your account">
          <p>
            Visit your Vercel URL, click <strong className="text-jf-text-primary">Create account</strong>,
            and sign up. Once you&apos;re in, go to the{' '}
            <strong className="text-jf-text-primary">Jellyfin</strong> section and connect your server.
          </p>
          <p>
            Next: <Link href="/docs/hardware" className="text-jf-primary hover:underline">build your first device →</Link>
          </p>
        </Step>
      </div>
    </div>
  )
}
