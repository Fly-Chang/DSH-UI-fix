// generate-pet-phrolova-placeholder.mjs
// Placeholder spritesheet generator for the Phrolova pet (light + dark forms).
// Produces two 1536x1872 WebP atlases (8 columns x 9 rows, 192x208 cells)
// plus pet.json manifests. The artwork is procedural (simple chibi shapes)
// and strictly follows the row contract:
//   0 idle, 1 running-right, 2 running-left, 3 waving, 4 jumping,
//   5 failed, 6 waiting, 7 running, 8 review
// Replace the two .webp files with real art later; code stays unchanged.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'packages', 'dsh-pet', 'assets', 'phrolova')
const COLS = 8
const ROWS = 9
const CW = 192
const CH = 208
const FRAMES_PER_ROW = 4

const FORMS = {
  light: {
    hair: '#5BB8B2',
    hairShade: '#3FA8A0',
    skin: '#F6DFC9',
    dressTop: '#FFFFFF',
    dressTopShade: '#E8DFF5',
    dressSkirt: '#D9C6EA',
    dressAccent: '#B49EBC',
    eye: '#3B3A5C',
    flower: '#C94C6B',
    flowerDeep: '#B83256',
    leg: '#7E5E8E',
    legShade: '#785B8E',
    shoe: '#5D486E',
  },
  dark: {
    hair: '#C8C4D0',
    hairShade: '#A9A4B6',
    skin: '#F2D9C7',
    dressTop: '#21141C',
    dressTopShade: '#160E13',
    dressSkirt: '#2A1420',
    dressAccent: '#E0485A',
    eye: '#E0485A',
    flower: '#E0485A',
    flowerDeep: '#9E2B3E',
    leg: '#171017',
    legShade: '#171017',
    shoe: '#100B10',
  },
}

const browser = await chromium.launch()
const page = await browser.newPage()
const rendered = await page.evaluate(async ({ COLS, ROWS, CW, CH, FRAMES_PER_ROW, FORMS }) => {
  function poseFor(anim, t) {
    const s = Math.sin(t * Math.PI * 2)
    switch (anim) {
      case 'idle':
        return { bob: s * 2, lean: 0, headTilt: s * 0.02, armL: 0.12, armR: 0.12, legSwing: 0, hairFlow: 0, flowerWilt: 0, squash: 1 + s * 0.008 }
      case 'running-right':
        return { bob: Math.abs(Math.cos(t * Math.PI * 2)) * 2, lean: 0.10, headTilt: 0.05, armL: -0.35 - s * 0.25, armR: 0.45 + s * 0.25, legSwing: s * 0.55, hairFlow: -5 - s * 4, flowerWilt: 0, squash: 1 }
      case 'running-left':
        return { bob: Math.abs(Math.cos(t * Math.PI * 2)) * 2, lean: -0.10, headTilt: -0.05, armL: 0.45 - s * 0.25, armR: -0.35 + s * 0.25, legSwing: -s * 0.55, hairFlow: 5 + s * 4, flowerWilt: 0, squash: 1 }
      case 'waving': {
        const wave = Math.sin(t * Math.PI * 2) * 0.45
        return { bob: 0, lean: 0.02, headTilt: 0.03, armL: 0.15, armR: -2.1 + wave, legSwing: 0, hairFlow: 2, flowerWilt: 0, squash: 1 }
      }
      case 'jumping': {
        if (t < 0.25) return { bob: 6, lean: 0, headTilt: 0.06, armL: 0.3, armR: -0.3, legSwing: 0, hairFlow: 0, flowerWilt: 0, squash: 0.94 }
        if (t < 0.5) return { bob: -14, lean: 0, headTilt: -0.04, armL: -0.8, armR: -1.2, legSwing: 0, hairFlow: 6, flowerWilt: 0, squash: 1.05 }
        if (t < 0.75) return { bob: -22, lean: 0, headTilt: -0.06, armL: -1.0, armR: -1.6, legSwing: 0, hairFlow: 8, flowerWilt: 0, squash: 1.04 }
        return { bob: 2, lean: 0.03, headTilt: 0.04, armL: 0.2, armR: 0.2, legSwing: 0, hairFlow: 0, flowerWilt: 0, squash: 1.02 }
      }
      case 'failed':
        return { bob: 4, lean: 0.04, headTilt: -0.22 + t * 0.04, armL: 0.5, armR: 0.5, legSwing: 0, hairFlow: 0, flowerWilt: 0.7 + t * 0.3, squash: 0.96 }
      case 'waiting': {
        const sway = s * 0.05
        return { bob: s * 1.5, lean: sway, headTilt: -sway, armL: -0.5, armR: -0.5, legSwing: 0, hairFlow: s * 2, flowerWilt: 0, squash: 1 }
      }
      case 'running':
        return { bob: Math.abs(Math.cos(t * Math.PI * 2)) * 2, lean: 0.13, headTilt: 0.10, armL: -0.6 - s * 0.2, armR: -0.9 + s * 0.2, legSwing: s * 0.35, hairFlow: -3 - s * 3, flowerWilt: 0, squash: 1 }
      case 'review': {
        const tap = t < 0.5 ? 0.0 : 0.12
        return { bob: s * 1, lean: 0.02, headTilt: 0.10 - tap, armL: 0.3, armR: -0.9 + tap * 0.4, legSwing: 0, hairFlow: 0, flowerWilt: 0, squash: 1 }
      }
      default:
        return { bob: 0, lean: 0, headTilt: 0, armL: 0.12, armR: 0.12, legSwing: 0, hairFlow: 0, flowerWilt: 0, squash: 1 }
    }
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
  }

  function limb(ctx, x1, y1, x2, y2, color, width) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function drawFlower(ctx, x, y, scale, color, deep, wilt) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(wilt * 0.6)
    ctx.scale(scale, scale)
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6
      ellipse(ctx, Math.cos(a) * 7, Math.sin(a) * 7, 4.5, 8, i % 2 === 0 ? color : deep)
    }
    ellipse(ctx, 0, 0, 3.5, 3.5, deep)
    ctx.restore()
  }

  function drawPhrolova(ctx, form, anim, t, cellX, cellY) {
    const p = poseFor(anim, t)
    const c = FORMS[form]
    const cx = cellX + CW / 2
    const baseY = cellY + CH - 20
    ctx.save()
    ctx.translate(cx, baseY + p.bob)
    ctx.rotate(p.lean)
    ctx.scale(1, p.squash)

    const legSwing = p.legSwing * 9
    limb(ctx, -5, -46, -5 - legSwing, -2, c.leg, 10)
    limb(ctx, 5, -46, 5 + legSwing, -2, c.legShade, 10)
    ellipse(ctx, -5 - legSwing, -1, 7, 4, c.shoe)
    ellipse(ctx, 5 + legSwing, -1, 7, 4, c.shoe)

    ctx.beginPath()
    ctx.moveTo(-20, -100)
    ctx.quadraticCurveTo(-30 - p.hairFlow, -80, -22 - p.hairFlow, -58)
    ctx.quadraticCurveTo(-12, -74, -8, -100)
    ctx.closePath()
    ctx.fillStyle = c.hairShade
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-18, -56)
    ctx.lineTo(18, -56)
    ctx.lineTo(26, -24)
    ctx.lineTo(-26, -24)
    ctx.closePath()
    ctx.fillStyle = c.dressSkirt
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-24, -30)
    ctx.lineTo(24, -30)
    ctx.lineTo(26, -24)
    ctx.lineTo(-26, -24)
    ctx.closePath()
    ctx.fillStyle = c.dressAccent
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(-13, -86, 26, 32, 8)
    ctx.fillStyle = c.dressTop
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-13, -62)
    ctx.lineTo(13, -62)
    ctx.lineTo(16, -56)
    ctx.lineTo(-16, -56)
    ctx.closePath()
    ctx.fillStyle = c.dressTopShade
    ctx.fill()

    const shoulderY = -78
    const armL = 30
    const lx = -13 + Math.sin(p.armL) * armL
    const ly = shoulderY + Math.cos(p.armL) * armL
    const rx = 13 + Math.sin(p.armR) * armL
    const ry = shoulderY + Math.cos(p.armR) * armL
    limb(ctx, -13, shoulderY, lx, ly, c.dressTopShade, 9)
    limb(ctx, 13, shoulderY, rx, ry, c.dressTopShade, 9)
    ellipse(ctx, lx, ly, 5, 5, c.skin)
    ellipse(ctx, rx, ry, 5, 5, c.skin)

    const headY = -104 + p.headTilt * 8
    ellipse(ctx, 0, headY, 26, 25, c.skin)
    ellipse(ctx, 0, headY - 4, 28, 27, c.hair)
    ctx.beginPath()
    ctx.moveTo(-18, headY - 22)
    ctx.quadraticCurveTo(-30 - p.hairFlow, headY - 2, -24 - p.hairFlow, headY + 22)
    ctx.quadraticCurveTo(-14, headY + 8, -8, headY + 12)
    ctx.closePath()
    ctx.fillStyle = c.hair
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(18, headY - 22)
    ctx.quadraticCurveTo(30 + p.hairFlow, headY - 2, 24 + p.hairFlow, headY + 22)
    ctx.quadraticCurveTo(14, headY + 8, 8, headY + 12)
    ctx.closePath()
    ctx.fillStyle = c.hair
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-25, headY - 12)
    ctx.quadraticCurveTo(0, headY - 30, 25, headY - 12)
    ctx.quadraticCurveTo(16, headY - 4, 0, headY - 6)
    ctx.quadraticCurveTo(-16, headY - 4, -25, headY - 12)
    ctx.closePath()
    ctx.fillStyle = c.hairShade
    ctx.fill()

    for (const ex of [-9, 9]) {
      ellipse(ctx, ex, headY - 4, 2.6, 2.6, c.eye)
    }
    ctx.beginPath()
    ctx.arc(0, headY + 4, 3.5, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.strokeStyle = c.eye
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.stroke()

    drawFlower(ctx, -20, headY - 24, 1.15, c.flower, c.flowerDeep, p.flowerWilt)
    if (form === 'dark') {
      drawFlower(ctx, rx + 2, ry - 8, 0.9, c.flower, c.flowerDeep, p.flowerWilt)
    }

    ctx.restore()
  }

  const rows = ['idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review']
  const canvas = document.createElement('canvas')
  canvas.width = COLS * CW
  canvas.height = ROWS * CH
  const ctx = canvas.getContext('2d')
  const out = {}
  for (const form of Object.keys(FORMS)) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let r = 0; r < ROWS; r++) {
      for (let f = 0; f < FRAMES_PER_ROW; f++) {
        const t = FRAMES_PER_ROW === 1 ? 0 : f / FRAMES_PER_ROW
        drawPhrolova(ctx, form, rows[r], t, f * CW, r * CH)
      }
    }
    out[form] = canvas.toDataURL('image/webp', 0.92)
  }
  return out
}, { COLS, ROWS, CW, CH, FRAMES_PER_ROW, FORMS })

await browser.close()

fs.mkdirSync(path.join(OUT_DIR, 'light'), { recursive: true })
fs.mkdirSync(path.join(OUT_DIR, 'dark'), { recursive: true })

for (const form of Object.keys(rendered)) {
  const dataUrl = rendered[form]
  const base64 = dataUrl.split(',')[1]
  const webpPath = path.join(OUT_DIR, form, 'spritesheet.webp')
  fs.writeFileSync(webpPath, Buffer.from(base64, 'base64'))
  const json = {
    id: `phrolova-${form}`,
    displayName: '弗洛洛',
    description: form === 'light'
      ? '亮态弗洛洛占位图集：白裙与紫色花海配色。'
      : '暗态弗洛洛占位图集：黑红哥特裙与彼岸花配色。',
    spritesheetPath: 'spritesheet.webp',
    frames: Array(ROWS).fill(FRAMES_PER_ROW),
  }
  fs.writeFileSync(path.join(OUT_DIR, form, 'pet.json'), JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`wrote ${path.relative(ROOT, webpPath)} (${Math.round(fs.statSync(webpPath).size / 1024)} KiB)`)
}
console.log(`done: ${ROWS} rows x ${FRAMES_PER_ROW} frames per row, ${COLS}x${ROWS} atlas of ${CW}x${CH} cells`)
