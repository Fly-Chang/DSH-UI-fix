// smoke-pet-phrolova.mjs
// Post-restart smoke test for the Phrolova pet feature. Runs against the
// local dsh web (default http://127.0.0.1:3080) and checks:
//   - /api/pet/state exposes the two-character roster
//   - /pet/phrolova/{light,dark} assets are served
//   - /api/pet/set-character switches to Phrolova and back to the original
// Usage: node scripts/smoke-pet-phrolova.mjs [baseUrl]
const base = (process.argv[2] ?? 'http://127.0.0.1:3080').replace(/\/$/, '')
const failures = []

async function getJson(path) {
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`)
  return res.json()
}

async function getBytes(path) {
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  return { status: res.status, type: res.headers.get('content-type'), size: buf.byteLength }
}

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS ${name}`)
  } else {
    failures.push(name)
    console.error(`FAIL ${name} ${detail}`)
  }
}

const state = await getJson('/api/pet/state')
const ids = Array.isArray(state.characters) ? state.characters.map((entry) => entry.id) : []
check('state exposes whale-girl', ids.includes('whale-girl'))
check('state exposes phrolova', ids.includes('phrolova'))
check('state exposes a selected character', state.character === 'whale-girl' || state.character === 'phrolova', String(state.character))
const phrolova = Array.isArray(state.characters) ? state.characters.find((entry) => entry.id === 'phrolova') : undefined
check('phrolova summary carries treatName', phrolova?.treatName === '彼岸花', String(phrolova?.treatName))
check('phrolova summary carries dark form flag', phrolova?.hasDarkForm === true, String(phrolova?.hasDarkForm))

const lightSprite = await getBytes('/pet/phrolova/light/spritesheet.webp')
const darkSprite = await getBytes('/pet/phrolova/dark/spritesheet.webp')
const lightManifest = await getBytes('/pet/phrolova/light/pet.json')
const darkManifest = await getBytes('/pet/phrolova/dark/pet.json')
check('light spritesheet served as webp', lightSprite.type?.startsWith('image/webp') === true && lightSprite.size > 50_000, `${lightSprite.type} ${lightSprite.size}`)
check('dark spritesheet served as webp', darkSprite.type?.startsWith('image/webp') === true && darkSprite.size > 50_000, `${darkSprite.type} ${darkSprite.size}`)
check('light manifest served as json', lightManifest.type?.startsWith('application/json') === true, String(lightManifest.type))
check('dark manifest served as json', darkManifest.type?.startsWith('application/json') === true, String(darkManifest.type))

const original = state.character
let switchedOk = false
try {
  const switched = await fetch(`${base}/api/pet/set-character`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ character: 'phrolova' }),
  })
  switchedOk = switched.ok && (await switched.json()).character === 'phrolova'
  check('set-character accepts phrolova', switchedOk)
} finally {
  // Restore the original character even when an earlier check failed, so the
  // smoke never leaves the user's pet switched.
  if (switchedOk && original !== 'phrolova') {
    await fetch(`${base}/api/pet/set-character`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character: original }),
    })
  }
}

if (failures.length > 0) {
  console.error(`smoke failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('smoke passed: Phrolova pet is live')
