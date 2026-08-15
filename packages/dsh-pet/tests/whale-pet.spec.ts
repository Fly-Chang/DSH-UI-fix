/// <reference path="../src/client/css-modules.d.ts" />
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PetStateView } from '../src/service.ts'
import type { PetDisplayConfig } from '../src/persist.ts'
import { WhalePet } from '../src/client/WhalePet.tsx'
import { NS, t } from '../src/client/locales.ts'

const DISPLAY: PetDisplayConfig = { visible: true, size: 160, right: 24, bottom: 20 }

function phrolovaSnapshot(): PetStateView {
  return {
    animation: 'idle',
    phase: 'idle',
    sessionActive: true,
    character: 'phrolova',
    characters: [
      { id: 'whale-girl', displayName: '鲸鱼娘', treatName: '小鱼干', hasDarkForm: false },
      { id: 'phrolova', displayName: '弗洛洛', treatName: '彼岸花', hasDarkForm: true },
    ],
    affinity: {
      points: 0,
      rank: '花苞',
      rankEmoji: '*',
      pets: 0,
      feeds: 0,
      turns: 0,
      petCooldown: false,
      feedCooldown: false,
    },
    display: DISPLAY,
    name: '弗洛洛',
    treats: { stocked: 3, max: 20 },
  }
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('WhalePet Phrolova surface', () => {
  it('renders the Phrolova panel copy and switches to whale-girl', async () => {
    Object.assign(window, {
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
    })
    const snapshot = phrolovaSnapshot()
    const onSwitchCharacter = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    render(createElement(WhalePet, {
      snapshot,
      display: DISPLAY,
      feedback: null,
      characters: snapshot.characters,
      onPet: vi.fn(),
      onFeed: vi.fn(),
      onSwitchCharacter,
      onHide: vi.fn(),
      onDragEnd: vi.fn(),
      onRename: vi.fn(),
      onFeedbackDone: vi.fn(),
      t: t as TranslateNS<typeof NS>,
    }), { container })

    const float = document.querySelector<HTMLElement>('[data-character="phrolova"]')
    expect(float).not.toBeNull()
    fireEvent.pointerEnter(float!)

    expect(await screen.findByText('换装')).toBeTruthy()
    expect(screen.getByText('当前角色 弗洛洛')).toBeTruthy()
    expect(screen.getByText('彼岸花 ×3')).toBeTruthy()
    expect(screen.getByText('亲密度 花苞')).toBeTruthy()

    fireEvent.click(screen.getByText('换装'))
    expect(onSwitchCharacter).toHaveBeenCalledWith('whale-girl')
  })
})
