// build-phrolova-final-sprite.mjs
// Build Phrolova spritesheets from the user's final single-frame material.
// Pipeline: load JPG -> flood-fill remove the checkerboard background ->
// crop to the opaque bounding box -> recolor a light-form variant ->
// compose 8x9 / 192x208 atlases with subtle programmatic motion.
// Output: packages/dsh-pet/assets/phrolova/{light,dark}/spritesheet.webp
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = 'F:/AI_worker/Model_dsh/宠物设计/最终素材/1786807408240-1472.jpg'
const CUTOUT = 'F:/AI_worker/Model_dsh/宠物设计/最终素材/弗洛洛抠图.png'
const OUT_DIR = path.join(ROOT, 'packages', 'dsh-pet', 'assets', 'phrolova')
const COLS = 8
const ROWS = 9
const CW = 192
const CH = 208
const FRAMES = 4
const MARGIN = 12

const browser = await chromium.launch()
const page = await browser.newPage()
const sourceDataUrl = `data:image/jpeg;base64,${fs.readFileSync(SOURCE).toString('base64')}`

const cutout = await page.evaluate(async ({ sourceDataUrl, COLS, ROWS, CW, CH }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
  const img = await load(sourceDataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = id.data
  const w = canvas.width
  const h = canvas.height
  const visited = new Uint8Array(w * h)
  const queue = new Int32Array(w * h * 2)
  let head = 0
  let tail = 0
  const push = (x, y) => {
    if (visited[y * w + x]) return
    visited[y * w + x] = 1
    queue[tail++] = x
    queue[tail++] = y
  }
  const isBackground = (x, y) => {
    const i = (y * w + x) * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const nearWhite = r > 232 && g > 232 && b > 232
    const nearGray = Math.abs(r - g) < 16 && Math.abs(g - b) < 16 && r > 180 && r < 235
    return nearWhite || nearGray
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (head < tail) {
    const x = queue[head++]
    const y = queue[head++]
    if (!isBackground(x, y)) continue
    const i = (y * w + x) * 4
    data[i + 3] = 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('no opaque content found')
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const cut = document.createElement('canvas')
  cut.width = bw
  cut.height = bh
  cut.getContext('2d').putImageData(new ImageData(
    new Uint8ClampedArray(data.buffer, (minY * w + minX) * 4, bw * bh * 4),
    bw,
    bh,
  ), 0, 0)
  return { dataUrl: cut.toDataURL('image/png'), width: bw, height: bh }
}, { sourceDataUrl, COLS, ROWS, CW, CH })

fs.writeFileSync(CUTOUT, Buffer.from(cutout.dataUrl.split(',')[1], 'base64'))
console.log(`cutout: ${cutout.width}x${cutout.height} -> ${CUTOUT}`)

const rendered = await page.evaluate(async ({ cutoutDataUrl, COLS, ROWS, CW, CH, FRAMES, MARGIN }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
  const img = await load(cutoutDataUrl)
  const s = Math.min((CW - MARGIN * 2) / img.naturalWidth, (CH - MARGIN * 2) / img.naturalHeight)
  const dw = Math.round(img.naturalWidth * s)
  const dh = Math.round(img.naturalHeight * s)

  function recolorLight(srcCanvas) {
    const out = document.createElement('canvas')
    out.width = srcCanvas.width
    out.height = srcCanvas.height
    const octx = out.getContext('2d')
    octx.drawImage(srcCanvas, 0, 0)
    const id = octx.getImageData(0, 0, out.width, out.height)
    const d = id.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const a = d[i + 3]
      if (a < 8) continue
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      const redDominant = r > g * 1.25 && r > b * 1.2 && r > 90
      const neutral = Math.abs(r - g) < 26 && Math.abs(g - b) < 26
      if (redDominant) {
        d[i] = Math.max(150, Math.min(238, 220 + (lum - 150) * 0.4))
        d[i + 1] = Math.max(120, Math.min(215, 185 + (lum - 150) * 0.35))
        d[i + 2] = Math.max(150, Math.min(232, 220 + (lum - 150) * 0.3))
      } else if (neutral && lum > 70 && lum < 225) {
        d[i] = Math.max(60, Math.min(170, 78 + lum * 0.25))
        d[i + 1] = Math.max(120, Math.min(205, 168 + lum * 0.06))
        d[i + 2] = Math.max(115, Math.min(205, 165 + lum * 0.08))
      } else if (lum < 65) {
        d[i] = Math.max(16, Math.min(80, r * 0.4 + 18))
        d[i + 1] = Math.max(8, Math.min(52, g * 0.28 + 10))
        d[i + 2] = Math.max(36, Math.min(120, b * 0.6 + 40))
      }
    }
    octx.putImageData(id, 0, 0)
    return out
  }

  function pose(anim, f) {
    const t = FRAMES === 1 ? 0 : f / FRAMES
    switch (anim) {
      case 'idle': return { bob: [0, -2, 0, 2][f], lean: [0, 0.012, 0, -0.012][f], sx: 1, sy: [1, 1.006, 1, 1.006][f] }
      case 'running-right': return { bob: [0, -1, -2, -1][f], lean: 0.045 + t * 0.015, sx: 1, sy: 1 }
      case 'running-left': return { bob: [0, -1, -2, -1][f], lean: -0.045 - t * 0.015, sx: 1, sy: 1 }
      case 'waving': return { bob: [0, -1, 0, -1][f], lean: [-0.035, 0, 0.035, 0][f], sx: 1, sy: 1 }
      case 'jumping': {
        const phase = f / FRAMES
        if (phase < 0.25) return { bob: 4, lean: 0, sx: 0.96, sy: 0.97 }
        if (phase < 0.5) return { bob: -9, lean: 0, sx: 1.02, sy: 1.05 }
        if (phase < 0.75) return { bob: -16, lean: 0, sx: 1.03, sy: 1.06 }
        return { bob: 2, lean: 0, sx: 1.0, sy: 1.02 }
      }
      case 'failed': return { bob: [2, 3, 4, 4][f], lean: 0.05 + t * 0.03, sx: 0.98, sy: 0.96, dim: 0.12 + t * 0.1 }
      case 'waiting': return { bob: [0, 1, 0, 1][f], lean: [-0.04, 0, 0.04, 0][f], sx: 1, sy: 1 }
      case 'running': return { bob: [0, -1, -2, -1][f], lean: 0.055, sx: 1, sy: 1 }
      case 'review': return { bob: [0, -1, 0, -1][f], lean: -0.05, sx: 1, sy: 1 }
      default: return { bob: 0, lean: 0, sx: 1, sy: 1 }
    }
  }

  function buildAtlas(baseCanvas) {
    const atlas = document.createElement('canvas')
    atlas.width = COLS * CW
    atlas.height = ROWS * CH
    const actx = atlas.getContext('2d')
    actx.clearRect(0, 0, atlas.width, atlas.height)
    const rows = ['idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review']
    for (let r = 0; r < ROWS; r++) {
      for (let f = 0; f < FRAMES; f++) {
        const p = pose(rows[r], f)
        const cell = document.createElement('canvas')
        cell.width = CW
        cell.height = CH
        const cctx = cell.getContext('2d')
        const baseY = CH - MARGIN
        cctx.save()
        cctx.translate(CW / 2, baseY + p.bob)
        cctx.rotate(p.lean)
        cctx.scale(p.sx, p.sy)
        if (p.dim !== undefined) {
          cctx.filter = `saturate(${Math.max(0.4, 1 - p.dim * 1.5)}) brightness(${Math.max(0.5, 1 - p.dim)})`
        }
        cctx.drawImage(baseCanvas, -dw / 2, -dh, dw, dh)
        cctx.restore()
        actx.drawImage(cell, f * CW, r * CH)
      }
    }
    return atlas.toDataURL('image/webp', 0.9)
  }

  const base = document.createElement('canvas')
  base.width = dw
  base.height = dh
  const bctx = base.getContext('2d')
  bctx.drawImage(img, 0, 0, dw, dh)
  const lightBase = recolorLight(base)
  return { dark: buildAtlas(base), light: buildAtlas(lightBase) }
}, { cutoutDataUrl: cutout.dataUrl, COLS, ROWS, CW, CH, FRAMES, MARGIN })

await browser.close()

for (const form of ['light', 'dark']) {
  const webpPath = path.join(OUT_DIR, form, 'spritesheet.webp')
  fs.writeFileSync(webpPath, Buffer.from(rendered[form].split(',')[1], 'base64'))
  console.log(`wrote ${webpPath} (${Math.round(fs.statSync(webpPath).size / 1024)} KiB)`)
}
console.log('done: final-material Phrolova spritesheets generated')
