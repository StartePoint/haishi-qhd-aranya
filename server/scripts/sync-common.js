const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'cloudfunctions')
const commonSrc = path.join(root, 'common')
const targets = fs.readdirSync(root).filter((n) => {
  const p = path.join(root, n)
  return n !== 'common' && fs.statSync(p).isDirectory()
})

for (const t of targets) {
  const dest = path.join(root, t, 'common')
  fs.cpSync(commonSrc, dest, { recursive: true })
  console.log('synced common ->', t)
}
