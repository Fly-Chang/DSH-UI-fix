/**
 * Phrolova skin — 「弗洛洛」, the twin-faced bloom: light theme rides the
 * 紫海暮色 (a lavender flower field at dusk, petals on the wind), dark theme
 * rides the 夜玫微光 (a single glowing red rose in a black-violet night).
 * apply() owns the whole ambient surface and retracts it on dispose (the
 * ThemePresenter retraction discipline: the plugin only ever removes what it
 * wrote): the `data-dsh-phrolova` body attribute the stylesheet is scoped
 * on, the artwork backdrop layer (a fixed full-viewport element carrying the
 * artwork data URL with a readability scrim and a brightness/contrast lift,
 * swapped live on `data-ds-dark-theme` changes), the drifting petal field,
 * the fixed title/status bars, the injected favicon (a rose mark — violet by
 * day, glowing red by night), and the document title. The palette remap and
 * the frosted pane surfaces ride the bundle's CSS-modules auto-inject (style
 * tag owned by the loader, removed on entry dispose). No services are
 * injected: the skin needs only the DOM.
 */
import type { Context } from '@deepseek-ai/cordis'
import { DARK_ART, DARK_ICON, LIGHT_ART, LIGHT_ICON } from './art.ts'
import css from './phrolova.module.css'

/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
const SKIN_TITLE = '弗洛洛 · DeepSeek 在线'

/** Status bar cells; the spacer cell splits left and right groups. */
const STATUS_LEFT = ['弗洛洛', '就绪'] as const
const STATUS_RIGHT = ['紫海暮色', '夜玫微光'] as const

/** Title bar window buttons (decorative glyphs, aria-hidden). */
const TITLEBAR_GLYPHS = ['–', '□', '×'] as const

/** Petal field size (per theme); kept low — ambience, not a screensaver. */
const PETAL_COUNT = 10

/** Light scrim: a pale lavender veil, deepening toward the composer. */
const SCRIM_LIGHT = [
  'linear-gradient(rgba(243, 238, 247, 0.06) 0%, rgba(238, 230, 245, 0.1) 55%, rgba(230, 220, 240, 0.16) 100%)',
].join(', ')

/** Dark scrim: a whisper of night over the rose — thin enough that the
 *  glow stays clearly visible. */
const SCRIM_DARK = [
  'linear-gradient(rgba(12, 8, 16, 0.16) 0%, rgba(16, 10, 20, 0.22) 60%, rgba(10, 6, 14, 0.28) 100%)',
].join(', ')

/** The light artwork is already pale — keep it nearly as-shot. The dark
 *  artwork is deeply underexposed; lift it so the rose reads through the
 *  frosted surfaces. */
const FILTER_LIGHT = 'brightness(1.04) contrast(1.03) saturate(1.08)'
const FILTER_DARK = 'brightness(1.38) contrast(1.16) saturate(1.12)'

/** Resolve one module class name (fallback only satisfies the indexed-access type). */
const cls = (name: keyof typeof css): string => css[name] ?? ''

/**
 * Apply the Phrolova skin: body attribute, themed artwork backdrop layer
 * (with a live-swapping theme scrim and brightness/contrast lift), the
 * drifting petal field, chrome bars, themed rose favicon and document title.
 * All writes are retracted by the effect disposer on dispose. Backdrop
 * writes go through the canonical hyphenated CSSOM API
 * (setProperty/getPropertyValue) on the layer element; body inline styles
 * are never touched.
 * @param ctx - owning context (the effect lifecycle owns retraction).
 */
export function apply(ctx: Context): void {
  const body = document.body
  const originalTitle = document.title
  body.dataset.dshPhrolova = ''

  const artLayer = document.createElement('div')
  artLayer.dataset.skinChrome = 'backdrop'
  artLayer.style.position = 'fixed'
  artLayer.style.inset = '0'
  artLayer.style.zIndex = '-1'
  artLayer.style.pointerEvents = 'none'
  body.append(artLayer)

  // The petal field rides the same z-depth as the backdrop (appended after
  // it, so petals drift over the art but under the app surface). Each petal
  // gets a deterministic-ish scatter of lane, delay, duration and sway so
  // the field never looks metronomic.
  const petalField = document.createElement('div')
  petalField.dataset.skinChrome = 'petals'
  petalField.className = cls('petalField')
  for (let i = 0; i < PETAL_COUNT; i += 1) {
    const petal = document.createElement('span')
    petal.className = cls('petal')
    const lane = (i * 37 + 11) % 100 // 0..99 vw lane
    const delay = -((i * 53 + 7) % 160) / 10 // 0..-16s, negative = mid-flight start
    const fall = 14 + ((i * 29 + 5) % 90) / 10 // 14..23s
    const sway = 2.4 + ((i * 17 + 3) % 30) / 10 // 2.4..5.4s
    const size = 9 + ((i * 13 + 4) % 8) // 9..16px
    petal.style.left = `${lane}vw`
    petal.style.width = `${size}px`
    petal.style.height = `${size}px`
    petal.style.animationDelay = `${delay}s, ${delay}s`
    petal.style.animationDuration = `${fall}s, ${sway}s`
    petalField.append(petal)
  }
  body.append(petalField)

  const titlebar = document.createElement('div')
  titlebar.className = cls('titlebar')
  titlebar.dataset.skinChrome = 'titlebar'
  const icon = document.createElement('span')
  icon.className = cls('titlebarIcon')
  const title = document.createElement('span')
  title.className = cls('titlebarTitle')
  title.textContent = SKIN_TITLE
  titlebar.append(icon, title)
  for (const glyph of TITLEBAR_GLYPHS) {
    const btn = document.createElement('span')
    btn.className = cls('titlebarBtn')
    btn.setAttribute('aria-hidden', 'true')
    btn.textContent = glyph
    titlebar.append(btn)
  }

  const statusbar = document.createElement('div')
  statusbar.className = cls('statusbar')
  statusbar.dataset.skinChrome = 'statusbar'
  for (const cell of STATUS_LEFT) {
    const el = document.createElement('span')
    el.className = cls('statusbarCell')
    el.textContent = cell
    statusbar.append(el)
  }
  const spacer = document.createElement('span')
  spacer.className = cls('statusbarSpacer')
  statusbar.append(spacer)
  for (const cell of STATUS_RIGHT) {
    const el = document.createElement('span')
    el.className = cls('statusbarCell')
    el.textContent = cell
    statusbar.append(el)
  }
  body.append(titlebar, statusbar)

  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.type = 'image/svg+xml'
  document.head.append(favicon)

  const setSurface = (): void => {
    const dark = body.dataset.dsDarkTheme !== undefined
    const art = dark ? DARK_ART : LIGHT_ART
    const scrim = dark ? SCRIM_DARK : SCRIM_LIGHT
    const filter = dark ? FILTER_DARK : FILTER_LIGHT
    artLayer.style.setProperty('background-image', `${scrim}, url("${art}")`)
    artLayer.style.setProperty('background-position', 'center')
    artLayer.style.setProperty('background-size', 'cover')
    artLayer.style.setProperty('background-attachment', 'fixed')
    artLayer.style.setProperty('background-repeat', 'no-repeat')
    artLayer.style.setProperty('filter', filter)
    favicon.href = dark ? DARK_ICON : LIGHT_ICON
    // The titlebar rose re-tints through the stylesheet (it reads the icon
    // data URI via a CSS mask), so it follows the theme without JS writes.
    icon.style.setProperty('-webkit-mask-image', `url("${dark ? DARK_ICON : LIGHT_ICON}")`)
    icon.style.setProperty('mask-image', `url("${dark ? DARK_ICON : LIGHT_ICON}")`)
  }
  setSurface()

  // Swap art, scrim, lift and rose live when the base theme system flips dark/light.
  const observer = new MutationObserver(setSurface)
  observer.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })

  document.title = SKIN_TITLE

  ctx.effect(() => () => {
    delete body.dataset.dshPhrolova
    observer.disconnect()
    artLayer.remove()
    petalField.remove()
    titlebar.remove()
    statusbar.remove()
    favicon.remove()
    // Only restore when the skin's own title still stands — a session title
    // projected by the shell must not be clobbered by skin teardown.
    if (document.title === SKIN_TITLE) document.title = originalTitle
  }, 'ui-skin-phrolova: phrolova chrome')
}
