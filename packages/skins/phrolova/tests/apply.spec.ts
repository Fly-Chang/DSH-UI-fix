// @vitest-environment jsdom
/**
 * Phrolova skin apply spec — the contract: the body attribute the
 * stylesheet is scoped on is set on apply and retracted on dispose; every
 * injected element (backdrop, petal field, titlebar, statusbar — all marked
 * data-skin-chrome) is removed; the favicon link leaves the head; the title
 * is pinned and restored; and the surface re-reads when the base theme
 * flips dark/light.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'

let fiber: Fiber | undefined

async function mount(): Promise<Fiber> {
  const f = new Context().plugin({ apply })
  await f.await()
  return f
}

afterEach(async () => {
  await fiber?.dispose()
  fiber = undefined
  document.body.innerHTML = ''
  document.body.removeAttribute('data-ds-dark-theme')
  document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove())
  document.title = ''
})

describe('phrolova skin apply', () => {
  it('sets the body attribute and retracts it on dispose', async () => {
    fiber = await mount()
    expect(document.body.hasAttribute('data-dsh-phrolova')).toBe(true)
    await fiber.dispose()
    expect(document.body.hasAttribute('data-dsh-phrolova')).toBe(false)
  })

  it('injects backdrop, petals and chrome; retracts every element on dispose', async () => {
    fiber = await mount()
    const kinds = [...document.body.querySelectorAll('[data-skin-chrome]')].map((el) =>
      el.getAttribute('data-skin-chrome'),
    )
    expect(kinds).toContain('backdrop')
    expect(kinds).toContain('petals')
    expect(kinds).toContain('titlebar')
    expect(kinds).toContain('statusbar')
    await fiber.dispose()
    expect(document.body.querySelectorAll('[data-skin-chrome]').length).toBe(0)
  })

  it('pins the skin title and restores the original on dispose', async () => {
    document.title = 'original'
    fiber = await mount()
    expect(document.title).not.toBe('original')
    await fiber.dispose()
    expect(document.title).toBe('original')
  })

  it('injects a themed favicon and removes it on dispose', async () => {
    fiber = await mount()
    const favicon = document.head.querySelector('link[rel="icon"]')
    expect(favicon).not.toBeNull()
    expect(favicon!.getAttribute('href')).toContain('data:image/svg+xml')
    await fiber.dispose()
    expect(document.head.querySelector('link[rel="icon"]')).toBeNull()
  })

  it('swaps the surface when the base theme flips dark', async () => {
    fiber = await mount()
    const lightFavicon = document.head
      .querySelector('link[rel="icon"]')!
      .getAttribute('href')
    document.body.dataset.dsDarkTheme = ''
    await new Promise((resolve) => setTimeout(resolve, 0))
    const darkFavicon = document.head
      .querySelector('link[rel="icon"]')!
      .getAttribute('href')
    expect(darkFavicon).not.toBe(lightFavicon)
  })
})
