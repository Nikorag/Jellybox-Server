// Listens for UDP log packets broadcast by Jellybox firmware (UDPLogger).
//
// Firmware sends to 255.255.255.255:5514 by default (see UDP_LOG_HOST /
// UDP_LOG_PORT in Jellybox-Firmware/jellybox-firmware/Config.h). Each packet
// is one line: "<millis> <message>\n".
//
// Usage:
//   npm run logs:device              # listen on 0.0.0.0:5514
//   npm run logs:device -- --port 6000
//   npm run logs:device -- --bind 192.168.1.20
//   npm run logs:device -- --filter 192.168.1.42   # only show this device
//
// Each line is printed as:
//   12:04:31.812  192.168.1.42  [   42183ms]  message text

const dgram = require('dgram')

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const port = Number(arg('port', 5514))
const bind = arg('bind', '0.0.0.0')
const filter = arg('filter', null)
const noColor = args.includes('--no-color') || !process.stdout.isTTY

const COLORS = ['36', '33', '32', '35', '34', '31', '96', '93', '92', '95']
const deviceColors = new Map()
function colorFor(ip) {
  if (noColor) return ''
  let c = deviceColors.get(ip)
  if (!c) {
    c = COLORS[deviceColors.size % COLORS.length]
    deviceColors.set(ip, c)
  }
  return `\x1b[${c}m`
}
const RESET = noColor ? '' : '\x1b[0m'
const DIM = noColor ? '' : '\x1b[2m'

function wallClock() {
  const d = new Date()
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })

sock.on('error', (err) => {
  console.error(`[device-logs] socket error: ${err.message}`)
  sock.close()
  process.exit(1)
})

sock.on('message', (msg, rinfo) => {
  if (filter && rinfo.address !== filter) return
  const text = msg.toString('utf8').replace(/\r?\n$/, '')
  // Firmware prepends "<millis> ", peel it off so we can right-align it.
  const m = text.match(/^(\d+)\s(.*)$/s)
  const millis = m ? m[1] : ''
  const body = m ? m[2] : text
  const c = colorFor(rinfo.address)
  const ms = millis ? `[${millis.padStart(8)}ms]` : ''
  console.log(`${DIM}${wallClock()}${RESET}  ${c}${rinfo.address.padEnd(15)}${RESET}  ${DIM}${ms}${RESET}  ${body}`)
})

sock.on('listening', () => {
  const addr = sock.address()
  console.log(`[device-logs] listening on ${addr.address}:${addr.port}${filter ? ` (filter: ${filter})` : ''}`)
  console.log(`[device-logs] tip: ensure your machine is on the same LAN as the Jellybox device`)
})

sock.bind(port, bind)

const shutdown = () => {
  sock.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
