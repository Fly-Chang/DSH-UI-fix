import { describe, expect, it } from 'vitest'
import {
  AFFINITY_MAX,
  applyInteraction,
  applyTurnReward,
  defaultAffinityConfig,
  emptyAffinity,
  rankOf,
} from './affinity.ts'
import { CHARACTERS } from './characters.ts'

const WHALE_RANKS = CHARACTERS['whale-girl'].ranks
const PHROLOVA_RANKS = CHARACTERS['phrolova'].ranks

describe('applyInteraction', () => {
  it('accepts the first pet and grants the pet reward', () => {
    const now = 1_000_000
    const outcome = applyInteraction(emptyAffinity(), 'pet', now)
    expect(outcome.accepted).toBe(true)
    expect(outcome.delta).toBe(defaultAffinityConfig.petReward)
    expect(outcome.affinity.points).toBe(defaultAffinityConfig.petReward)
    expect(outcome.affinity.pets).toBe(1)
    expect(outcome.affinity.lastPetAt).toBe(now)
  })

  it('rejects a pet inside the cooldown without mutating state', () => {
    const now = 1_000_000
    const first = applyInteraction(emptyAffinity(), 'pet', now)
    const second = applyInteraction(first.affinity, 'pet', now + defaultAffinityConfig.petCooldownMs - 1)
    expect(second.accepted).toBe(false)
    expect(second.delta).toBe(0)
    expect(second.affinity).toBe(first.affinity) // same reference: no mutation
    expect(second.affinity.pets).toBe(1)
  })

  it('accepts a pet again after the cooldown elapsed', () => {
    const now = 1_000_000
    const first = applyInteraction(emptyAffinity(), 'pet', now)
    const second = applyInteraction(first.affinity, 'pet', now + defaultAffinityConfig.petCooldownMs)
    expect(second.accepted).toBe(true)
    expect(second.affinity.pets).toBe(2)
  })

  it('rejects a feed inside the cooldown without spending anything', () => {
    const now = 1_000_000
    const first = applyInteraction(emptyAffinity(), 'feed', now)
    const second = applyInteraction(first.affinity, 'feed', now + defaultAffinityConfig.feedCooldownMs - 1)
    expect(second.accepted).toBe(false)
    expect(second.delta).toBe(0)
    expect(second.affinity).toBe(first.affinity)
    expect(second.affinity.feeds).toBe(1)
  })

  it('clamps points at AFFINITY_MAX', () => {
    const state = { ...emptyAffinity(), points: AFFINITY_MAX - 1 }
    const outcome = applyInteraction(state, 'pet', 1_000_000)
    expect(outcome.affinity.points).toBe(AFFINITY_MAX)
  })
})

describe('applyTurnReward', () => {
  it('increments turns and points', () => {
    const next = applyTurnReward(emptyAffinity())
    expect(next.turns).toBe(1)
    expect(next.points).toBe(defaultAffinityConfig.turnReward)
  })
})

describe('rankOf', () => {
  it('maps point totals onto the whale-girl rank ladder', () => {
    for (const rank of WHALE_RANKS) {
      expect(rankOf(rank.min, WHALE_RANKS).name).toBe(rank.name)
    }
    expect(rankOf(AFFINITY_MAX, WHALE_RANKS).name).toBe(WHALE_RANKS[WHALE_RANKS.length - 1]!.name)
    expect(rankOf(-1, WHALE_RANKS).name).toBe(WHALE_RANKS[0]!.name)
  })

  it('maps point totals onto the Phrolova rank ladder', () => {
    expect(rankOf(0, PHROLOVA_RANKS).name).toBe('花苞')
    expect(rankOf(25, PHROLOVA_RANKS).name).toBe('花开')
    expect(rankOf(50, PHROLOVA_RANKS).name).toBe('绯红')
    expect(rankOf(80, PHROLOVA_RANKS).name).toBe('彼岸之约')
    expect(rankOf(100, PHROLOVA_RANKS).name).toBe('彼岸之约')
  })
})
