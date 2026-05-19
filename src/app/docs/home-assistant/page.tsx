import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Home Assistant integration — Jellybox Docs' }

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

export default function HomeAssistantPage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">
          Home Assistant integration
        </h1>
        <p className="text-jf-text-secondary leading-relaxed">
          When the optional MQTT module is enabled, every paired Jellybox shows
          up in Home Assistant via MQTT Discovery as a device with three
          sensors and an event entity — no manual YAML, no HA add-on. The
          server speaks MQTT directly when it can reach your broker, or via a
          small HTTPS bridge when it can&apos;t (e.g. when deployed to Vercel).
        </p>
      </div>

      {/* What you get */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-3">What you get in Home Assistant</h2>
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          Every device you pair becomes one HA device with four entities:
        </p>
        <ul className="space-y-2 text-sm text-jf-text-secondary leading-relaxed">
          <li className="flex gap-2"><Code>{'sensor.<device>_last_scanned_tag'}</Code> — friendly name of the most recent tag scanned, with the raw RFID UID as an attribute.</li>
          <li className="flex gap-2"><Code>{'sensor.<device>_last_seen'}</Code> — timestamp the device last checked in (refreshes every ~30 s).</li>
          <li className="flex gap-2"><Code>{'sensor.<device>_last_tag_scanned_at'}</Code> — timestamp of the most recent successful scan.</li>
          <li className="flex gap-2"><Code>{'event.<device>_tag_scanned'}</Code> — fires on every successful scan with <Code>tag_label</Code>, <Code>tag_id</Code>, and <Code>timestamp</Code> in the event data. Use this to trigger automations.</li>
        </ul>
        <p className="text-sm text-jf-text-secondary leading-relaxed mt-3">
          Existing devices auto-register in HA the next time they check in
          after you turn MQTT on — there&apos;s no manual sync step.
        </p>
      </section>

      {/* Which path to take */}
      <section className="mb-10 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <h2 className="text-sm font-semibold text-jf-text-primary mb-3">Which path to take</h2>
        <div className="space-y-2 text-sm text-jf-text-secondary leading-relaxed">
          <p>
            <strong className="text-jf-text-primary">Self-hosted server</strong>{' '}
            (Docker Compose) → run Mosquitto in the same compose file and point
            the server at it directly with <Code>mqtt://mosquitto:1883</Code>.
            Skip to <a href="#self-hosted" className="text-jf-primary hover:underline">Self-hosted setup</a>.
          </p>
          <p>
            <strong className="text-jf-text-primary">Vercel-hosted server</strong>{' '}
            → Vercel can&apos;t reach your home network, so run the{' '}
            <Code>mqtt-bridge</Code> util on your LAN — it connects{' '}
            <em>outbound</em> to the server and republishes messages to
            Mosquitto. No port forward, no public hostname, nothing exposed
            to the internet.{' '}
            Skip to <a href="#vercel" className="text-jf-primary hover:underline">Vercel setup with the bridge</a>.
          </p>
        </div>
      </section>

      {/* Self-hosted */}
      <section id="self-hosted" className="mb-10 scroll-mt-24">
        <h2 className="text-xl font-bold text-jf-text-primary mb-1">Self-hosted setup</h2>
        <p className="text-sm text-jf-text-secondary mb-6">
          You&apos;re running the server via the bundled{' '}
          <Code>docker-compose.yml</Code>. Mosquitto runs as a sidecar on the
          same Docker network, and Jellybox publishes to it directly.
        </p>

        <Step n={1} title="Create the Mosquitto config + password file">
          <p>
            Mosquitto 2 requires a configuration file and (by default) a
            password file. Create them under <Code>./mosquitto/config/</Code>{' '}
            next to your <Code>docker-compose.yml</Code>:
          </p>
          <CodeBlock>{`mkdir -p mosquitto/config
cat > mosquitto/config/mosquitto.conf <<'EOF'
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd
persistence true
persistence_location /mosquitto/data/
EOF
touch mosquitto/config/passwd`}</CodeBlock>
          <p>
            Add a Jellybox user. The first invocation creates the file; the
            container does the hashing:
          </p>
          <CodeBlock>{`docker run --rm -it \\
  -v "$(pwd)/mosquitto/config:/mosquitto/config" \\
  eclipse-mosquitto:2 \\
  mosquitto_passwd -b /mosquitto/config/passwd jellybox <YOUR_PASSWORD>`}</CodeBlock>
          <p>
            Repeat for a second user that Home Assistant will use
            (e.g. <Code>homeassistant</Code>) so HA and Jellybox don&apos;t
            share credentials.
          </p>
        </Step>

        <Step n={2} title="Uncomment the mosquitto service">
          <p>
            Open <Code>docker-compose.yml</Code>, find the commented-out{' '}
            <Code>mosquitto:</Code> block, and uncomment it (plus the two
            mosquitto volumes at the bottom of the file). The block already
            mounts <Code>./mosquitto/config</Code> read-only and persists data
            to a named volume.
          </p>
          <Callout>
            The block also publishes port <Code>1883</Code> to the host so Home
            Assistant — running elsewhere on your LAN — can connect. If HA
            runs in this same compose, you can drop the <Code>ports:</Code>{' '}
            block and have it talk to <Code>mosquitto:1883</Code> on the
            internal network.
          </Callout>
        </Step>

        <Step n={3} title="Configure Jellybox to publish">
          <p>Add to your <Code>.env</Code>:</p>
          <CodeBlock>{`MQTT_URL=mqtt://mosquitto:1883
MQTT_USERNAME=jellybox
MQTT_PASSWORD=<the password you set in step 1>`}</CodeBlock>
          <p>Restart the stack:</p>
          <CodeBlock>{`docker compose up -d`}</CodeBlock>
        </Step>

        <Step n={4} title="Point Home Assistant at the broker">
          <p>
            In Home Assistant, add the{' '}
            <strong className="text-jf-text-primary">MQTT</strong> integration
            (<em>Settings → Devices &amp; Services → Add Integration → MQTT</em>).
            Use the host&apos;s IP, port <Code>1883</Code>, and the{' '}
            <Code>homeassistant</Code> credentials you created. As soon as a
            paired device next checks in (within 30 s), it&apos;ll appear under{' '}
            <em>Settings → Devices &amp; Services → MQTT → Devices</em> with
            the four entities listed above.
          </p>
        </Step>
      </section>

      {/* Vercel */}
      <section id="vercel" className="mb-10 scroll-mt-24">
        <h2 className="text-xl font-bold text-jf-text-primary mb-1">Vercel setup with the bridge</h2>
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          The Vercel-hosted server lives on the public internet; your
          Mosquitto broker lives on your LAN. The{' '}
          <Code>mqtt-bridge</Code> util (in <Code>utils/mqtt-bridge/</Code>)
          runs on your LAN and connects <em>outbound</em> to the server&apos;s{' '}
          <Code>/api/mqtt/stream</Code> endpoint over an authenticated SSE
          stream, then republishes received messages to Mosquitto over a
          single long-lived MQTT connection.
        </p>
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-6">
          Because the connection is outbound, nothing on your home network
          needs to be exposed to the internet — no Cloudflare Tunnel, no port
          forward, no public hostname. The bridge just needs ordinary
          outbound HTTPS access, which any consumer router allows by default.
        </p>

        <Step n={1} title="Run Mosquitto on your LAN">
          <p>
            If you already run Mosquitto for Home Assistant, skip this.
            Otherwise spin one up on the same machine you&apos;ll run the
            bridge on. Create a user for the bridge:
          </p>
          <CodeBlock>{`docker run --rm -it \\
  -v /path/to/mosquitto/config:/mosquitto/config \\
  eclipse-mosquitto:2 \\
  mosquitto_passwd -b /mosquitto/config/passwd jellybox <YOUR_PASSWORD>`}</CodeBlock>
        </Step>

        <Step n={2} title="Generate a bridge token + configure Vercel">
          <p>
            Generate a long random shared secret:
          </p>
          <CodeBlock>{`openssl rand -hex 32`}</CodeBlock>
          <p>
            In <strong className="text-jf-text-primary">Vercel → Project Settings → Environment Variables</strong>{' '}
            add:
          </p>
          <CodeBlock>{`MQTT_BRIDGE_TOKEN=<the value you just generated>`}</CodeBlock>
          <p>
            Leave <Code>MQTT_URL</Code> <em>unset</em> on Vercel — when{' '}
            <Code>MQTT_BRIDGE_TOKEN</Code> is set on its own, the server
            switches into pull-bridge mode and exposes the SSE stream at{' '}
            <Code>/api/mqtt/stream</Code>. Redeploy (Vercel does this
            automatically when env vars change).
          </p>
        </Step>

        <Step n={3} title="Run the bridge on your LAN">
          <p>
            Source and Dockerfile live in <Code>utils/mqtt-bridge/</Code>.
            The simplest layout puts the bridge and Mosquitto in the same
            compose file:
          </p>
          <CodeBlock>{`# docker-compose.yml (on your home server)
services:
  mosquitto:
    image: eclipse-mosquitto:2
    restart: unless-stopped
    ports:
      - "1883:1883"          # so Home Assistant can connect
    volumes:
      - ./mosquitto/config:/mosquitto/config:ro
      - mosquitto-data:/mosquitto/data

  mqtt-bridge:
    build: ./utils/mqtt-bridge
    restart: unless-stopped
    environment:
      JELLYBOX_URL: https://jellybox.example.com
      BRIDGE_TOKEN: \${BRIDGE_TOKEN}        # same value as MQTT_BRIDGE_TOKEN on Vercel
      MQTT_URL: mqtt://mosquitto:1883
      MQTT_USERNAME: jellybox
      MQTT_PASSWORD: \${MQTT_PASSWORD}

volumes:
  mosquitto-data:`}</CodeBlock>
          <p>
            Or run from a Node checkout, no Docker required:
          </p>
          <CodeBlock>{`cd utils/mqtt-bridge
npm install
JELLYBOX_URL=https://jellybox.example.com \\
BRIDGE_TOKEN=<same value as MQTT_BRIDGE_TOKEN> \\
MQTT_URL=mqtt://localhost:1883 \\
MQTT_USERNAME=jellybox \\
MQTT_PASSWORD=<broker password> \\
npm start`}</CodeBlock>
          <p>
            On startup the bridge logs{' '}
            <Code>[bridge] stream connected</Code> and{' '}
            <Code>[bridge] mqtt connected to …</Code>. It reconnects every
            ~5 minutes because of Vercel&apos;s 300 s function execution cap
            — those reconnects are expected and logged as soft-closes.
          </p>
          <Callout>
            <strong className="text-jf-text-primary">Caveat —</strong> Vercel
            Fluid Compute may occasionally spawn a second instance under
            load. When that happens, a publish from the second instance
            won&apos;t reach a bridge connected to the first. For a typical
            Jellybox install (a few publishes per minute) this is rare and
            self-healing on the next event; if you push higher volumes,
            consider running the server outside Vercel.
          </Callout>
        </Step>

        <Step n={4} title="Point Home Assistant at the broker">
          <p>
            Same as the self-hosted path — add the MQTT integration in HA,
            point it at the Mosquitto host on your LAN, and the Jellybox
            devices will appear within ~30 s of their next check-in.
          </p>
        </Step>
      </section>

      {/* Building automations */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-3">Automating on a tag scan</h2>
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          The event entity is the most useful trigger — it carries the tag
          label and ID, so one automation can branch on whichever tag was
          scanned. Example: dim the lights when a specific tag plays.
        </p>
        <CodeBlock>{`# configuration.yaml or via the Automations UI
automation:
  - alias: "Jellybox — Movie night lights"
    trigger:
      platform: event
      event_type: tag_scanned
      event_data:
        device_id: !secret jellybox_lounge_device_id
    condition:
      - "{{ trigger.event.data.tag_label == 'Inception' }}"
    action:
      - service: light.turn_on
        target: { entity_id: light.lounge }
        data: { brightness_pct: 15 }`}</CodeBlock>
        <p className="text-sm text-jf-text-secondary leading-relaxed mt-3">
          For a simpler &ldquo;something scanned&rdquo; trigger, you can also
          listen on the <Code>last_scanned_tag</Code> sensor changing state.
        </p>
      </section>

      {/* Reference */}
      <section className="mb-4">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-3">Environment-variable reference</h2>
        <div className="space-y-2 text-sm text-jf-text-secondary">
          <div>
            <Code>MQTT_URL</Code> — direct broker URL (<Code>mqtt://</Code>,{' '}
            <Code>mqtts://</Code>, <Code>ws://</Code>, <Code>wss://</Code>).
            Set this when the server can reach Mosquitto directly. Leave it
            unset to use pull-bridge mode instead.
          </div>
          <div>
            <Code>MQTT_USERNAME</Code>, <Code>MQTT_PASSWORD</Code> — credentials
            for the direct-MQTT transport. Ignored in pull-bridge mode (the
            bridge holds the broker credentials).
          </div>
          <div>
            <Code>MQTT_BRIDGE_TOKEN</Code> — shared secret used by the bridge
            to authenticate against <Code>/api/mqtt/stream</Code>. Setting it
            with <Code>MQTT_URL</Code> unset enables pull-bridge mode. Must
            match <Code>BRIDGE_TOKEN</Code> in the bridge&apos;s environment.
          </div>
          <div>
            <Code>MQTT_DISCOVERY_PREFIX</Code> — HA discovery prefix (default{' '}
            <Code>homeassistant</Code>; only override if you changed it in
            HA&apos;s MQTT integration).
          </div>
          <div>
            <Code>MQTT_BASE_TOPIC</Code> — root topic for Jellybox state and
            event traffic (default <Code>jellybox</Code>).
          </div>
        </div>
      </section>
    </div>
  )
}
