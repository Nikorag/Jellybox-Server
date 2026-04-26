import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Extensions — Jellybox Docs' }

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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="text-xl font-bold text-jf-text-primary mb-4">{title}</h2>
      <div className="space-y-4 text-sm text-jf-text-secondary leading-relaxed">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-jf-text-primary mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

const tocLinks = [
  { id: 'what', label: 'What is an extension?' },
  { id: 'using', label: 'Using extensions' },
  { id: 'building', label: 'Building an extension' },
  { id: 'manifest', label: 'Manifest' },
  { id: 'auth', label: 'Authentication' },
  { id: 'oauth', label: 'OAuth flow' },
  { id: 'tokens', label: 'Refresh tokens' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'reference', label: 'Reference implementation' },
]

export default function ExtensionsDocsPage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Extensions</h1>
        <p className="text-jf-text-secondary leading-relaxed">
          Plug Jellybox into any media source beyond Jellyfin. Extensions are small HTTP services
          that implement a fixed contract — Jellybox calls them whenever a tag points at content
          from that source. Anyone can build one in any language; the reference implementation is
          a single Node script.
        </p>
        <p className="text-xs text-jf-text-muted mt-3">
          No third-party extensions ship with Jellybox today. The framework is the surface — what
          you do with it is up to you.
        </p>
      </div>

      {/* Table of contents */}
      <div className="mb-10 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-jf-text-muted mb-2">
          On this page
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {tocLinks.map((link) => (
            <li key={link.id}>
              <a href={`#${link.id}`} className="text-jf-text-secondary hover:text-jf-primary transition-colors">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Section id="what" title="What is an extension?">
        <p>
          An extension is an out-of-process HTTP service that handles a single media source —
          anything you can reach over an API. It implements a small set of routes that Jellybox
          calls server-to-server: search the library, list playback clients, play an item.
        </p>
        <p>
          Extensions are <strong className="text-jf-text-primary">system-wide</strong>. An admin
          registers an extension once; every user on that Jellybox can then connect their own
          account to it. The extension owns provider credentials (API tokens, OAuth refresh
          tokens, etc.) end-to-end — Jellybox stores only an opaque <Code>accountId</Code> the
          extension hands back. That separation keeps third-party tokens out of Jellybox&apos;s
          threat model.
        </p>
        <p>
          From the device&apos;s point of view, nothing changes. <Code>POST /api/play</Code>
          works identically whether the tag is backed by Jellyfin or by an extension — Jellybox
          routes the request to the right backend.
        </p>
      </Section>

      <Section id="using" title="Using extensions">
        <SubSection title="As an admin: register an extension">
          <p>
            Set the <Code>ADMINS</Code> environment variable to a comma-separated list of
            admin email addresses. Without it, no one can register extensions — fail-closed by
            default.
          </p>
          <CodeBlock>{`# .env (or your hosting provider's dashboard)
ADMINS=you@example.com,partner@example.com`}</CodeBlock>
          <p>
            Then sign in, open <strong className="text-jf-text-primary">Settings → Extensions</strong>,
            paste the extension&apos;s base URL, and click Register. Jellybox fetches{' '}
            <Code>/manifest</Code>, generates a one-time bearer secret, and persists the row.
            Copy the secret into the extension&apos;s own configuration so it can verify
            Jellybox is allowed to call it.
          </p>
          <Callout>
            The secret is shown <strong>once</strong>. If you lose it, remove and re-register the
            extension to mint a new one.
          </Callout>
        </SubSection>

        <SubSection title="As any user: connect your account">
          <p>Open Settings → Extensions and you&apos;ll see every registered extension. For each:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-jf-text-primary">Connect</strong> — for credentials-based
              extensions, fill in the form fields the extension declared in its manifest. For
              OAuth, you&apos;ll be redirected to the provider, and back to Jellybox once you
              authorise.
            </li>
            <li>
              <strong className="text-jf-text-primary">Load clients</strong> — fetches the list
              of playback targets the extension knows about. Pick one as your default.
            </li>
            <li>
              <strong className="text-jf-text-primary">Disconnect</strong> — remove your
              connection without unregistering the extension for everyone else.
            </li>
          </ul>
          <p>
            Once connected, the source dropdown on the tag form picks up the extension. Search,
            select, save — your tag now plays through that provider when scanned.
          </p>
        </SubSection>
      </Section>

      <Section id="building" title="Building an extension">
        <p>
          An extension is any HTTP server that implements the routes below. Pick whatever
          language and runtime you like — Node, Python, Go, Rust, a Lambda function, a Docker
          sidecar — Jellybox doesn&apos;t care.
        </p>
        <p>
          Every protected route expects <Code>Authorization: Bearer &lt;secret&gt;</Code>, where{' '}
          <Code>&lt;secret&gt;</Code> is the value Jellybox showed at registration time.{' '}
          <Code>/manifest</Code> is the only public route — Jellybox needs to fetch it before a
          secret has been generated.
        </p>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-jf-border text-jf-text-secondary">
                <th className="text-left font-semibold py-2 px-3">Method</th>
                <th className="text-left font-semibold py-2 px-3">Path</th>
                <th className="text-left font-semibold py-2 px-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="font-mono text-jf-text-primary">
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">GET</td>
                <td className="py-2 px-3">/manifest</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">Describe the extension. Public.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">POST</td>
                <td className="py-2 px-3">/authenticate/start</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">OAuth only. Return the provider URL.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">POST</td>
                <td className="py-2 px-3">/authenticate/exchange</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">OAuth only. Swap code for accountId.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">POST</td>
                <td className="py-2 px-3">/authenticate/complete</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">Credentials only. Validate fields, return accountId.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">POST</td>
                <td className="py-2 px-3">/search</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">Find items in the user&apos;s library.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">GET</td>
                <td className="py-2 px-3">/clients</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">List the user&apos;s playback targets.</td>
              </tr>
              <tr className="border-b border-jf-border/60">
                <td className="py-2 px-3">GET</td>
                <td className="py-2 px-3">/image</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">Stream artwork bytes (proxied through Jellybox).</td>
              </tr>
              <tr>
                <td className="py-2 px-3">POST</td>
                <td className="py-2 px-3">/play</td>
                <td className="py-2 px-3 font-sans text-jf-text-secondary">Trigger playback of an item on a client.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The exact request/response types live in{' '}
          <Code>src/lib/extensions/types.ts</Code> in the Jellybox repo — copy them into your
          extension to keep yours in sync.
        </p>
      </Section>

      <Section id="manifest" title="Manifest">
        <p>
          <Code>GET /manifest</Code> tells Jellybox what your extension is and how to talk to it.
        </p>
        <CodeBlock>{`{
  "name": "Reference Extension",
  "version": "0.1.0",
  "iconUrl": "https://my-ext.example.com/icon.png",
  "authFlow": "credentials",       // or "oauth"
  "authFields": [                  // shown in the connect form (credentials only)
    { "key": "demoToken", "label": "Demo token", "secret": true, "required": true }
  ],
  "capabilities": {
    "search":       true,
    "listClients":  true,
    "images":       false
  },
  "itemTypes": ["film"]            // free-form strings you'll return on items
}`}</CodeBlock>
        <p>
          When admins click <strong className="text-jf-text-primary">Refresh manifest</strong> on
          a registered extension, Jellybox re-fetches this and updates the cached copy. Bump
          your version when capabilities or auth fields change.
        </p>
      </Section>

      <Section id="auth" title="Authentication">
        <p>
          Each extension declares one of two flows. Jellybox uses different routes for each.
        </p>

        <SubSection title="Credentials (token, username/password, etc.)">
          <p>
            Set <Code>authFlow: &quot;credentials&quot;</Code> and list the form fields you need
            in <Code>authFields</Code>. Jellybox renders the form, then POSTs the values to{' '}
            <Code>/authenticate/complete</Code>:
          </p>
          <CodeBlock>{`POST /authenticate/complete
Authorization: Bearer <jellybox secret>
{ "fields": { "demoToken": "abc123…" } }

→ 200 { "accountId": "opaque-id", "displayName": "Demo User" }`}</CodeBlock>
          <p>
            Validate the fields with the provider, generate or look up a stable <Code>accountId</Code>{' '}
            for that user, and return it along with a human-readable display name. Jellybox
            stores only the <Code>accountId</Code> — the credentials never leave your extension.
          </p>
        </SubSection>

        <SubSection title="OAuth">
          <p>
            Set <Code>authFlow: &quot;oauth&quot;</Code>. Jellybox handles the browser redirect
            so your extension never has to be publicly reachable — see the OAuth section below.
          </p>
        </SubSection>
      </Section>

      <Section id="oauth" title="OAuth flow">
        <p>
          Jellybox hosts the OAuth callback URL. The OAuth provider only ever talks to
          Jellybox; the extension is reached server-to-server. That means a self-hosted
          extension can stay on your private/Docker network without exposing any public ports.
        </p>

        <CodeBlock>{`Browser            Jellybox                   Extension                    Provider
   │                  │                          │                            │
 1 │  Connect ──────► │                          │                            │
   │                  │  /authenticate/start ──► │                            │
   │                  │  { state, callbackUrl }  │                            │
   │                  │ ◄─ { redirectUrl }       │                            │
 2 │ ◄── 302 ─────────┤                          │                            │
   │   (redirectUrl)  │                          │                            │
 3 │ ──────────────────────────────────────────────────────────────────────── │
   │                                                                          │
 4 │ ◄── 302 ── (callbackUrl?state=…&code=…) ──────────────────────────────── │
   │                  │                          │                            │
 5 │  /oauth/complete │                          │                            │
   │                  │  /authenticate/exchange►│                            │
   │                  │  { code, callbackUrl }   │                            │
   │                  │ ◄─ { accountId, name }   │ (extension talks to        │
   │                  │                          │  provider here, server-    │
   │                  │                          │  to-server, with its       │
   │                  │                          │  own client_secret)        │`}</CodeBlock>

        <ol className="list-decimal pl-5 space-y-1.5">
          <li>User clicks Connect — Jellybox mints an encrypted <Code>state</Code> token.</li>
          <li>Jellybox calls <Code>/authenticate/start</Code> with the state and the Jellybox callback URL.</li>
          <li>Extension returns a provider URL with <Code>state</Code> and <Code>redirect_uri</Code> baked in. Browser is redirected to it.</li>
          <li>User authorises at the provider.</li>
          <li>Provider redirects back to Jellybox&apos;s callback page with <Code>state</Code> and <Code>code</Code>.</li>
          <li>Jellybox decodes state and calls <Code>/authenticate/exchange</Code> server-to-server.</li>
          <li>Extension swaps the code for tokens with the provider, persists them, returns <Code>{'{ accountId, displayName }'}</Code>.</li>
        </ol>

        <Callout>
          The Jellybox callback URL is fixed:{' '}
          <Code>{'<your-jellybox>/dashboard/settings/extensions/oauth-callback'}</Code>. Register
          this exact URL with your OAuth provider — no per-extension subpath.
        </Callout>
      </Section>

      <Section id="tokens" title="Refresh tokens">
        <p>
          Jellybox never sees access or refresh tokens — only the opaque <Code>accountId</Code>.
          That means refresh handling is entirely your extension&apos;s responsibility.
        </p>
        <p>A typical pattern:</p>
        <CodeBlock>{`async function getAccessToken(accountId) {
  const t = await store.get(accountId)
  if (Date.now() < t.expires_at - 30_000) return t.access_token

  const refreshed = await fetch('https://provider.example.com/oauth/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token,
      client_id:     process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  }).then(r => r.json())

  await store.update(accountId, refreshed)
  return refreshed.access_token
}`}</CodeBlock>
        <p>
          When refresh itself fails (revoked, password change, etc.), return{' '}
          <Code>AUTH_ERROR</Code> from <Code>/play</Code> — or any 401 from another route — and
          Jellybox will surface a playback failure that the user can resolve by reconnecting.
        </p>
      </Section>

      <Section id="hosting" title="Hosting">
        <p>An extension is just an HTTP server. Two common shapes:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-jf-text-primary">Lambda / serverless function</strong> —
            simplest if your provider speaks public HTTP. Each route becomes one function;
            Jellybox calls them directly.
          </li>
          <li>
            <strong className="text-jf-text-primary">Docker sidecar</strong> — run alongside
            Jellybox on the same Docker network. The extension only needs to be reachable from
            Jellybox; it doesn&apos;t have to expose any public ports. The OAuth callback
            lives on Jellybox, so even OAuth providers don&apos;t need to reach your extension.
          </li>
        </ul>
        <p>
          The shared bearer secret authenticates Jellybox-the-server to your extension — not
          individual users. Treat it like any service-to-service credential: rotate by
          re-registering if leaked.
        </p>
      </Section>

      <Section id="reference" title="Reference implementation">
        <p>
          The Jellybox repository ships a working reference extension at{' '}
          <Code>examples/extension-reference/server.mjs</Code> — a single Node script with no
          dependencies. It implements every contract route with canned data and supports both
          auth flows via an <Code>AUTH_FLOW=oauth</Code> env toggle (with a fake provider screen
          for local testing).
        </p>
        <p>Run it:</p>
        <CodeBlock>{`cd examples/extension-reference
node server.mjs                    # credentials mode (default)
AUTH_FLOW=oauth node server.mjs    # OAuth mode`}</CodeBlock>
        <p>
          Use it as a starter: copy <Code>server.mjs</Code> into a new project, replace the
          canned data with real provider calls, and you have an extension.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <a
            href="https://github.com/Nikorag/Jellybox-Server/tree/main/examples/extension-reference"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-jf-border bg-jf-elevated hover:border-jf-primary/40 text-sm text-jf-text-primary transition-colors"
          >
            <svg className="w-4 h-4 text-jf-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
          <a
            href="https://github.com/Nikorag/Jellybox-Server/blob/main/src/lib/extensions/types.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-jf-border bg-jf-elevated hover:border-jf-primary/40 text-sm text-jf-text-primary transition-colors"
          >
            <svg className="w-4 h-4 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Contract type definitions
          </a>
        </div>
      </Section>
    </div>
  )
}
