// Post-check: scan the changed package CSS files for hardcoded timings that
// should have been converted to --dsw-motion-* tokens. Run from repo root.
// Usage: node scripts/motion-audit.mjs  (no deps, plain fs)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGETS = [
  'packages/dsh-aionui-panel/src/client/styles',
  'packages/dsh-task-board/src/client',
  'packages/dsh-ssh/src/client/panel',
  'packages/dsh-git-graph/src/client/chips',
  'packages/dsh-live-stats/src/client',
  'packages/dsh-web-ui-settings/src/client',
  'packages/dsh-pet/src/client',
  'packages/dsh-remote-web-ui/src/client',
  'packages/skins/skin-center/src/client',
]

// Duration in any timing value: digits + optional decimals + ms/s unit.
const TIMING_RE = /(\d+(?:\.\d+)?)(ms|s)/g
// Decorative ambient animation (>= 400ms, e.g. skeleton pulse, pet bubbles)
// and indeterminate progress spinners (linear infinite) are exempt.
const DECOR_MIN_MS = 400

const problems = []
function walk(dir, list) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) { walk(p, list); continue }
    if (entry.endsWith('.module.css')) list.push(p)
  }
}

for (const t of TARGETS) {
  const files = []
  walk(join(ROOT, t), files)
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    // Emoji guard for the repo rule.
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(src)) {
      problems.push(`${relative(ROOT, f)}: EMOJI FOUND`)
    }
    const lines = src.split('\n')
    lines.forEach((line, i) => {
      if (line.includes('--dsw-motion-')) return
      for (const m of line.matchAll(TIMING_RE)) {
        const value = parseFloat(m[1])
        const ms = m[2] === 's' ? value * 1000 : value
        if (ms === 0) continue
        const linearInfinite = /linear/.test(line) && /infinite/.test(line)
        if (linearInfinite) continue // indeterminate progress spinners
        if (ms >= DECOR_MIN_MS) continue // decorative ambient animations
        problems.push(`${relative(ROOT, f)}:${i + 1} raw timing ${m[1]}${m[2]} — ${line.trim().slice(0, 110)}`)
      }
    })
  }
}

if (problems.length === 0) {
  console.log('PASS: no stray raw timings, no emoji in changed CSS.')
} else {
  console.log(`FOUND ${problems.length} issues:`)
  for (const p of problems) console.log('  ' + p)
  process.exitCode = 1
}
