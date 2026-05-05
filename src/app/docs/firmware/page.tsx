import type { Metadata } from 'next'
import Link from 'next/link'
import WebFlasher from './WebFlasher'

export const metadata: Metadata = { title: 'Flash the Firmware — Jellybox Docs' }

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

function Callout({ variant = 'info', children }: { variant?: 'info' | 'warn'; children: React.ReactNode }) {
  const styles = {
    info: 'border-jf-primary/30 bg-jf-primary-muted',
    warn: 'border-yellow-500/30 bg-yellow-500/10',
  }
  const icons = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    warn: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  }
  return (
    <div className={`flex gap-3 p-3 rounded-lg border text-sm leading-relaxed ${styles[variant]}`}>
      <svg className="w-4 h-4 text-jf-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[variant]} />
      </svg>
      <div className="text-jf-text-secondary">{children}</div>
    </div>
  )
}

const libraries = [
  { name: 'WiFiManager', author: 'tzapu', version: '2.0.17+', search: 'WiFiManager' },
  { name: 'Adafruit NeoPixel', author: 'Adafruit', version: '1.12+', search: 'Adafruit NeoPixel' },
  { name: 'Adafruit PN532', author: 'Adafruit', version: '1.3+', search: 'Adafruit PN532' },
  { name: 'GxEPD2', author: 'ZinggJM', version: '1.6+', search: 'GxEPD2' },
  { name: 'Adafruit GFX Library', author: 'Adafruit', version: '1.11+', search: 'Adafruit GFX' },
  { name: 'ArduinoJson', author: 'Benoit Blanchon', version: '7+', search: 'ArduinoJson' },
]

const ledStates = [
  { color: 'Blue', pattern: 'Breathing', meaning: 'Ready to scan' },
  { color: 'Cyan', pattern: 'Spinning', meaning: 'Connecting / HTTP request in progress' },
  { color: 'Yellow', pattern: 'Spinning', meaning: 'Contacting server (bootstrap)' },
  { color: 'Purple', pattern: 'Breathing', meaning: 'Scan-capture mode — next scan registers a tag' },
  { color: 'Green', pattern: 'Flash', meaning: 'Success — playback started or tag captured' },
  { color: 'Red', pattern: 'Flash', meaning: 'Error — check serial monitor' },
  { color: 'Amber', pattern: 'Breathing', meaning: 'Unpaired / invalid API key' },
]

export default function FirmwarePage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Flash the firmware</h1>
        <p className="text-jf-text-secondary leading-relaxed">
          The Jellybox firmware is an Arduino sketch for the ESP32. The fastest way to get a stock
          Jellybox running is the in-browser flasher below — no toolchain required. If you&apos;d
          rather build from source, follow the Arduino IDE steps further down.
        </p>
      </div>

      {/* Web flasher */}
      <section className="mb-10 rounded-xl border border-jf-border bg-jf-elevated p-5">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-2">Flash from your browser</h2>
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-4">
          Plug your ESP32 into a USB port, click the button below, and pick the serial port for your
          device. The latest released firmware will be downloaded and flashed in one step. After the
          flash completes, head to <em>step 7 — first-time setup</em> below.
        </p>
        <WebFlasher />
        <p className="text-xs text-jf-text-muted mt-4 leading-relaxed">
          Requires a Chromium-based browser (Chrome, Edge, Opera, Arc) on desktop. Firefox and
          Safari don&apos;t implement Web Serial. If the button stays disabled, check that you&apos;re
          on HTTPS (or localhost) and that no other process — Arduino IDE, screen, esptool — is
          holding the serial port open.
        </p>
      </section>

      <h2 className="text-lg font-semibold text-jf-text-primary mb-2">Build from source</h2>
      <p className="text-sm text-jf-text-secondary leading-relaxed mb-6">
        Use this path if you want to modify the firmware, debug over serial, or pin a development
        build that opts out of OTA updates.
      </p>

      <Step n={1} title="Install Arduino IDE 2">
        <p>
          Download <strong className="text-jf-text-primary">Arduino IDE 2.x</strong> from{' '}
          <a href="https://www.arduino.cc/en/software" target="_blank" rel="noopener noreferrer"
            className="text-jf-primary hover:underline">
            arduino.cc/en/software
          </a>.
          Version 2 is required — the older 1.x IDE does not support all features used by the project.
        </p>
      </Step>

      <Step n={2} title="Add ESP32 board support">
        <p>
          Arduino IDE doesn&apos;t include ESP32 support out of the box. Add it via the Board Manager:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Open <strong className="text-jf-text-primary">Arduino IDE → Preferences</strong> (Mac:{' '}
            <Code>Cmd+,</Code> / Windows: <Code>Ctrl+,</Code>).
          </li>
          <li>
            Find <strong className="text-jf-text-primary">Additional boards manager URLs</strong> and paste:
            <CodeBlock>{`https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`}</CodeBlock>
          </li>
          <li>
            Go to <strong className="text-jf-text-primary">Tools → Board → Boards Manager</strong>.
          </li>
          <li>
            Search for <Code>esp32</Code> and install <strong className="text-jf-text-primary">esp32 by Espressif Systems</strong>.
            Version 2.x or 3.x both work.
          </li>
        </ol>
      </Step>

      <Step n={3} title="Install required libraries">
        <p>
          Open <strong className="text-jf-text-primary">Tools → Manage Libraries</strong> and install
          each of the following. Search by the name in the rightmost column.
        </p>
        <div className="rounded-xl border border-jf-border overflow-hidden mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jf-border bg-jf-elevated">
                <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Library</th>
                <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Author</th>
                <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Min version</th>
              </tr>
            </thead>
            <tbody>
              {libraries.map((lib) => (
                <tr key={lib.name} className="border-b border-jf-border last:border-0 hover:bg-jf-elevated/50">
                  <td className="px-3 py-2 font-medium text-jf-text-primary">{lib.name}</td>
                  <td className="px-3 py-2 text-jf-text-secondary">{lib.author}</td>
                  <td className="px-3 py-2 font-mono text-jf-text-muted">{lib.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout>
          When installing ArduinoJson, make sure you install version <strong>7</strong> and not the
          older v6. The Library Manager may show both — check the version dropdown.
        </Callout>
      </Step>

      <Step n={4} title="Get the firmware source">
        <p>Clone the firmware repository:</p>
        <CodeBlock>{`git clone https://github.com/Nikorag/Jellybox-firmware.git`}</CodeBlock>
        <p>
          Open <Code>jellybox-firmware/jellybox-firmware.ino</Code> in Arduino IDE. The IDE will
          automatically load all the associated header files in the same directory.
        </p>
      </Step>

      <Step n={5} title="Select board and port">
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Connect the ESP32 to your computer with a USB cable.
          </li>
          <li>
            Go to <strong className="text-jf-text-primary">Tools → Board → esp32 → ESP32 Dev Module</strong>.
          </li>
          <li>
            Go to <strong className="text-jf-text-primary">Tools → Port</strong> and select the port
            that appeared when you plugged in the device. On macOS it looks like <Code>/dev/cu.usbserial-xxxxx</Code>;
            on Windows it will be a <Code>COM</Code> port.
          </li>
          <li>
            Leave all other settings at their defaults. Upload speed of <Code>921600</Code> is fine.
          </li>
        </ol>
        <Callout variant="warn">
          Some ESP32 boards require you to hold the <strong>BOOT</strong> button while the IDE starts
          uploading, then release it. If the upload stalls at <em>Connecting…</em>, try this.
        </Callout>
      </Step>

      <Step n={6} title="Upload the firmware">
        <p>
          Click the <strong className="text-jf-text-primary">Upload</strong> button (right-arrow icon) or
          press <Code>Ctrl+U</Code> / <Code>Cmd+U</Code>. The IDE will compile and flash the firmware.
          Compilation takes about 60–90 seconds the first time.
        </p>
        <p>
          When complete you should see{' '}
          <strong className="text-jf-text-primary">Done uploading</strong> in the output panel and the
          device will reboot automatically.
        </p>
      </Step>

      <Step n={7} title="First-time setup">
        <p>
          On first boot (or after a factory reset), the device broadcasts a WiFi access point called{' '}
          <strong className="text-jf-text-primary">Jellybox-Setup</strong> and shows a setup screen on
          the eInk display.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Connect your phone or laptop to the <Code>Jellybox-Setup</Code> WiFi network.</li>
          <li>
            A captive portal should open automatically. If it doesn&apos;t, navigate to{' '}
            <Code>192.168.4.1</Code> in a browser.
          </li>
          <li>Tap <strong className="text-jf-text-primary">Configure WiFi</strong> and enter your home network credentials.</li>
          <li>
            Enter the <strong className="text-jf-text-primary">Server URL</strong> — the full URL of your
            Jellybox server (e.g. <Code>https://your-app.vercel.app</Code>).
          </li>
          <li>
            Enter the <strong className="text-jf-text-primary">API key</strong> from your Jellybox dashboard.
            Go to <em>Devices → Pair Device</em> to generate one.
          </li>
          <li>Tap <strong className="text-jf-text-primary">Save</strong>. The device reboots and connects.</li>
        </ol>
        <p>
          When pairing is successful the eInk display shows the device name and the LED ring breathes
          blue — ready to scan.
        </p>
      </Step>

      <Step n={8} title="Factory reset">
        <p>
          To clear all stored config (WiFi credentials, server URL, API key) and return to setup mode:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm">
          <li>Power off the device.</li>
          <li>Hold the <strong className="text-jf-text-primary">BOOT</strong> button (GPIO0).</li>
          <li>Power on while still holding BOOT.</li>
          <li>Hold for 3 seconds, then release.</li>
        </ol>
        <p>The device will clear its NVS storage and restart into setup mode.</p>
      </Step>

      {/* OTA updates */}
      <section className="mt-4 mb-10">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-3">Over-the-air updates</h2>
        <div className="space-y-3 text-sm text-jf-text-secondary leading-relaxed">
          <p>
            OTA updates are <strong className="text-jf-text-primary">user-triggered</strong> from
            the dashboard, not automatic. Every 30 seconds the device polls{' '}
            <Code>/api/device/me</Code>, sending its currently-running version as a{' '}
            <Code>?version=</Code> query param. The server records that against the device, and
            only returns a <Code>latestFirmware</Code> field if you&apos;ve flagged the device for
            an update. Otherwise the field is omitted and the device keeps running what it&apos;s
            running.
          </p>
          <p>
            To update a device, open its page in the dashboard. The Firmware card shows the
            running version and the latest version from GitHub. Click{' '}
            <strong className="text-jf-text-primary">Update firmware</strong> and on the next poll
            the device will download the binary, write it to its second OTA partition, and reboot
            into the new firmware. No phone, no app, no USB cable.
          </p>
          <p>
            While the new image is being written the eInk display shows{' '}
            <strong className="text-jf-text-primary">Updating firmware…</strong> and the LED ring
            spins cyan. After the reboot, the device verifies the new image boots cleanly before
            committing it — if the new firmware crashes during startup, ESP32&apos;s rollback
            mechanism reverts to the previous version on the next power cycle. A bad release
            can&apos;t brick a device in the field.
          </p>
          <p>
            Once the device reports back the new version, the server compares it to the manifest
            and clears the pending flag automatically — the dashboard then shows the device as up
            to date. Builds tagged <Code>dev</Code> (e.g. local Arduino IDE flashes) opt out of
            OTA, so you can keep an in-development device connected without it jumping back to the
            public release.
          </p>
          <p>
            By default your server tracks the upstream firmware repo and treats whatever release
            is currently tagged <em>latest</em> as the available version. Two env vars override
            that: <Code>FIRMWARE_REPO</Code> points at a different GitHub{' '}
            <Code>owner/name</Code> (use this if you maintain your own firmware fork), and{' '}
            <Code>FIRMWARE_VERSION</Code> pins every device to a specific tag like{' '}
            <Code>v0.0.2</Code> instead of always offering the newest release. See the{' '}
            <Link href="/docs/server" className="text-jf-primary hover:underline">
              Vercel
            </Link>{' '}
            and{' '}
            <Link href="/docs/self-hosting" className="text-jf-primary hover:underline">
              self-hosting
            </Link>{' '}
            guides for where to set them.
          </p>
          <Callout variant="warn">
            Factory reset only clears WiFi and pairing — it does <strong>not</strong> roll firmware
            back. To downgrade a device, set <Code>FIRMWARE_VERSION</Code> on the server to the
            older tag, then trigger an update from the dashboard; the device will treat the older
            version as &ldquo;different&rdquo; and reflash to it.
          </Callout>
        </div>
      </section>

      {/* LED reference */}
      <section className="mt-4 mb-8">
        <h2 className="text-lg font-semibold text-jf-text-primary mb-3">LED state reference</h2>
        <div className="rounded-xl border border-jf-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-jf-border bg-jf-elevated">
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Colour</th>
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Pattern</th>
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ledStates.map((s) => (
                <tr key={s.meaning} className="border-b border-jf-border last:border-0 hover:bg-jf-elevated/40">
                  <td className="px-4 py-2.5 font-medium text-jf-text-primary">{s.color}</td>
                  <td className="px-4 py-2.5 text-jf-text-secondary">{s.pattern}</td>
                  <td className="px-4 py-2.5 text-jf-text-secondary">{s.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="pt-4 border-t border-jf-border">
        <p className="text-sm text-jf-text-secondary">
          Everything working?{' '}
          <Link href="/docs/case" className="text-jf-primary hover:underline">
            Print a case →
          </Link>
        </p>
      </div>
    </div>
  )
}
