import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { PetService } from '../src/service.ts'

function activity(phase: string, seq: number): SessionEvent {
  return {
    type: 'activity/status',
    seq,
    time: seq,
    data: { phase },
  } as SessionEvent
}

const session = null as unknown as Session

function tempPersistDir(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-service-test-'))
}

describe('PetService enabled switch', () => {
  it('stops consuming session activity while disabled and resumes on re-enable', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { enabled: false, persistDir: dir })

    ctx.emit('session/event', session, activity('done', 1))
    expect((await service.state()).animation).toBe('idle')

    service.setEnabled(true)
    ctx.emit('session/event', session, activity('done', 2))
    expect((await service.state()).animation).toBe('jumping')

    service.setEnabled(false)
    ctx.emit('session/event', session, activity('done', 3))
    expect((await service.state()).animation).toBe('jumping')
    rmSync(dir, { recursive: true, force: true })
  })

  it('trims settings names so whitespace-only values cannot persist', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { persistDir: dir })
    service.applySettingsSection({
      visible: true,
      size: 160,
      right: 24,
      bottom: 20,
      name: '  鲸鱼娘  ',
    })
    expect(service.petName()).toBe('鲸鱼娘')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('PetService character switch', () => {
  it('switches to Phrolova and keeps the shared affinity and treat ledger', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { persistDir: dir })
    // Earn affinity through one completed turn.
    ctx.emit('session/event', session, activity('done', 1))
    const before = await service.state()
    expect(before.affinity.points).toBe(1)
    const stockedBefore = before.treats.stocked

    const view = await service.setCharacter('phrolova')
    expect(view.character).toBe('phrolova')
    expect(view.name).toBe('弗洛洛')
    expect(view.affinity.rank).toBe('花苞')
    expect(view.affinity.points).toBe(before.affinity.points)
    expect(view.treats.stocked).toBe(stockedBefore)
    expect(view.characters.map((entry) => entry.id)).toEqual(['whale-girl', 'phrolova'])
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects unknown character ids', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { persistDir: dir })
    await expect(service.setCharacter('octopus-king' as never)).rejects.toThrow('invalid-character')
    rmSync(dir, { recursive: true, force: true })
  })

  it('remembers names per character', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { persistDir: dir })
    await service.setCharacter('phrolova')
    const renamed = await service.setName('小洛')
    expect(renamed.ok).toBe(true)
    await service.setCharacter('whale-girl')
    expect(service.petName()).toBe('鲸鱼娘')
    await service.setCharacter('phrolova')
    expect(service.petName()).toBe('小洛')
    rmSync(dir, { recursive: true, force: true })
  })

  it('uses Phrolova reactions and the spider-lily treat vocabulary', async () => {
    const ctx = new Context()
    const dir = tempPersistDir()
    const service = new PetService(ctx, { persistDir: dir })
    await service.setCharacter('phrolova')
    const pet = await service.interact('pet')
    expect(pet.reaction).toBe('……并不讨厌。允许你再摸一下。')
    const feed = await service.interact('feed')
    expect(feed.delta).toBe(0)
    expect(feed.reaction).toContain('彼岸花')
    expect(feed.reaction).toContain('弗洛洛')
    rmSync(dir, { recursive: true, force: true })
  })
})
