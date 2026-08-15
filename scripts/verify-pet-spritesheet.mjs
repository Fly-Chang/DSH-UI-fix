// verify-pet-spritesheet.mjs
// Validates a pet spritesheet against the 8x9 atlas contract:
//   1536x1872, 192x208 cells, per-row frame counts, transparent trailing cells.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const cwd = path.dirname(fileURLToPath(import.meta.url))
const files = process.argv.slice(2).map((p) => (path.isAbsolute(p) ? p : path.resolve(cwd, '..', p)))
if (files.length === 0) {
  console.error('usage: node verify-pet-spritesheet.mjs <spritesheet.webp> ...')
  process.exit(1)
}
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`missing: ${file}`)
    process.exit(1)
  }
}
const inputs = files.map((file) => ({
  file,
  dataUrl: `data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`,
}))

const browser = await chromium.launch()
const page = await browser.newPage()
const report = await page.evaluate(async (inputs) => {
  const COLS = 8
  const ROWS = 9
  const CW = 192
  const CH = 208
  const load = (dataUrl) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('cannot decode image'))
    img.src = dataUrl
  })
  const results = []
  for (const input of inputs) {
    const img = await load(input.dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const margin = 12
    const probeStep = 8
    const frameCounts = []
    for (let r = 0; r < ROWS; r++) {
      let count = 0
      for (let c = 0; c < COLS; c++) {
        let has = false
        const x0 = c * CW
        const y0 = r * CH
        for (let y = y0 + margin; y < y0 + CH - margin && !has; y += probeStep) {
          for (let x = x0 + margin; x < x0 + CW - margin && !has; x += probeStep) {
            const idx = (y * img.naturalWidth + x) * 4
            if ((data[idx + 3] ?? 0) > 8) has = true
          }
        }
        if (has) count++
      }
      frameCounts.push(count)
    }
    let trailingAlpha = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = frameCounts[r]; c < COLS; c++) {
        for (let y = r * CH; y < (r + 1) * CH; y++) {
          for (let x = c * CW; x < (c + 1) * CW; x++) {
            const idx = (y * img.naturalWidth + x) * 4
            trailingAlpha += data[idx + 3] ?? 0
          }
        }
      }
    }
    results.push({ file: input.file, width: img.naturalWidth, height: img.naturalHeight, frameCounts, trailingAlpha })
  }
  return results
}, inputs)

for (const r of report) {
  const okSize = r.width === 1536 && r.height === 1872
  const okFrames = r.frameCounts.every((n) => n <= 8 && n >= 1)
  console.log(`${r.file}: ${r.width}x${r.height} size=${okSize ? 'ok' : 'BAD'} frames=[${r.frameCounts.join(',')}] trailingAlpha=${r.trailingAlpha} ${okSize && okFrames && r.trailingAlpha === 0 ? 'OK' : 'FAIL'}`)
}
await browser.close()
