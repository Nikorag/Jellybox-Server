// Restores shims that @storybook/nextjs requires but Next.js 16 no longer provides.
// Runs automatically after `npm install` via the postinstall lifecycle hook.
const fs = require('fs')
const path = require('path')

const shims = [
  {
    file: path.resolve(__dirname, '../node_modules/next/config.js'),
    content: `// Shim for next/config — removed in Next.js 16.
// @storybook/nextjs requires this module to exist so it can alias it to its own mock.
'use strict'
function getConfig() { return {} }
function setConfig() {}
module.exports = getConfig
module.exports.getConfig = getConfig
module.exports.setConfig = setConfig
module.exports.default = getConfig
`,
  },
]

for (const { file, content } of shims) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content, 'utf8')
    console.log(`[postinstall] Created shim: ${path.relative(process.cwd(), file)}`)
  }
}
