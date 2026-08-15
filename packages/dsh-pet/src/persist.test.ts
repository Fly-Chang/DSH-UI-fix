import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AFFINITY_MAX, emptyAffinity } from './affinity.ts'
import { DEFAULT_CHARACTER } from './characters.ts'
import { defaultTreatConfig, emptyTreatLedger } from './treats.ts'
import {
  DEFAULT_PET_NAME,
  DISPLAY_INSET_MAX,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  defaultDisplayConfig,
  emptyPersist,
  loadPetPersist,
  petDisplayName,
  savePetPersist,
} from './persist.ts'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-test-'))
}

describe('loadPetPersist', () => {
  it('falls back to defaults when the file is missing', () => {
    const dir = tempDir()
    try {
      expect(loadPetPersist(dir)).toEqual(emptyPersist())
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to defaults on corrupt JSON', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), '{ not json', 'utf8')
      expect(loadPetPersist(dir)).toEqual(emptyPersist())
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('round-trips a saved persist file with character and per-character names', () => {
    const dir = tempDir()
    try {
      const data = {
        character: 'phrolova' as const,
        names: { 'whale-girl': '泡泡', 'phrolova': '弗洛洛' },
        affinity: { ...emptyAffinity(), points: 42, pets: 3, feeds: 1, turns: 10 },
        treats: { ...emptyTreatLedger(), treats: 7, lastTreatGrantAt: 1234, turnsAtLastTreatGrant: 9 },
        display: { visible: false, size: 200, right: 10, bottom: 40 },
      }
      savePetPersist(data, dir)
      expect(loadPetPersist(dir)).toEqual(data)
      expect(petDisplayName(loadPetPersist(dir))).toBe('弗洛洛')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('migrates the legacy name field into the whale-girl names map', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), JSON.stringify({
        name: '泡泡',
        affinity: { points: 12 },
      }), 'utf8')
      const loaded = loadPetPersist(dir)
      expect(loaded.character).toBe(DEFAULT_CHARACTER)
      expect(loaded.names['whale-girl']).toBe('泡泡')
      expect(petDisplayName(loaded)).toBe('泡泡')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to whale-girl for an unknown persisted character id', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), JSON.stringify({
        character: 'octopus-king',
        names: { 'whale-girl': '泡泡' },
      }), 'utf8')
      const loaded = loadPetPersist(dir)
      expect(loaded.character).toBe(DEFAULT_CHARACTER)
      expect(petDisplayName(loaded)).toBe('泡泡')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('uses the character default name when no custom name exists', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), JSON.stringify({ character: 'phrolova' }), 'utf8')
      const loaded = loadPetPersist(dir)
      expect(petDisplayName(loaded)).toBe('弗洛洛')
      loaded.character = 'whale-girl'
      expect(petDisplayName(loaded)).toBe('鲸鱼娘')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('clamps out-of-range and non-numeric fields', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), JSON.stringify({
        name: '   ',
        names: { 'whale-girl': '   ', 'phrolova': 42, 'octopus-king': '八爪' },
        affinity: { points: 9999, lastPetAt: -5, lastFeedAt: 'x', pets: -1, feeds: 1.5, turns: 0 },
        treats: { treats: 150, lastTreatGrantAt: -1, turnsAtLastTreatGrant: 0 },
        display: { visible: 'yes', size: -10, right: 1e12, bottom: 20 },
      }), 'utf8')
      const loaded = loadPetPersist(dir)
      expect(petDisplayName(loaded)).toBe(DEFAULT_PET_NAME)
      expect(loaded.names['phrolova']).toBeUndefined()
      expect((loaded.names as Record<string, string | undefined>)['octopus-king']).toBeUndefined()
      expect(loaded.affinity.points).toBe(AFFINITY_MAX)
      expect(loaded.affinity.lastPetAt).toBe(0)
      expect(loaded.affinity.lastFeedAt).toBe(0)
      expect(loaded.affinity.pets).toBe(0)
      expect(loaded.affinity.feeds).toBe(1.5) // finite numbers pass through
      expect(loaded.treats.treats).toBe(defaultTreatConfig.maxTreats)
      expect(loaded.treats.lastTreatGrantAt).toBe(0)
      expect(loaded.display.visible).toBe(defaultDisplayConfig.visible)
      expect(loaded.display.size).toBe(DISPLAY_SIZE_MIN) // -10 clamped to min
      expect(loaded.display.right).toBe(DISPLAY_INSET_MAX) // 1e12 clamped to max
      expect(loaded.display.bottom).toBe(20) // finite in-range passes through
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('clamps oversized display size to the max', () => {
    const dir = tempDir()
    try {
      writeFileSync(join(dir, 'pet.json'), JSON.stringify({
        display: { visible: true, size: 1e9, right: 0, bottom: 0 },
      }), 'utf8')
      expect(loadPetPersist(dir).display.size).toBe(DISPLAY_SIZE_MAX)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
