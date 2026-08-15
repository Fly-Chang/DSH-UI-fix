/**
 * Pet persistence — tiny JSON store for affinity, treat stock and display
 * config, written under $DSH_HOME (defaults to ~/.dsh) as `pet.json`.
 * Deliberately minimal: one file, atomic rename write, tolerant read
 * (corrupt file → defaults). Character selection and per-character names are
 * persisted here; old files without the `character` field migrate to
 * whale-girl and their legacy `name` field becomes the whale-girl name.
 * @module @linxin666/dsh-pet/persist
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { AFFINITY_MAX, emptyAffinity, type AffinityState } from './affinity.ts'
import {
  CHARACTERS,
  DEFAULT_CHARACTER,
  resolveCharacterId,
  type CharacterId,
} from './characters.ts'
import { defaultTreatConfig, emptyTreatLedger, type TreatLedger } from './treats.ts'

/** Display configuration the user can tweak. */
export interface PetDisplayConfig {
  /** Master switch. */
  visible: boolean
  /** Scale of the rendered pet in px (sprite cell height). */
  size: number
  /** Horizontal inset from the viewport right edge, px. */
  right: number
  /** Vertical inset from the viewport bottom edge, px. */
  bottom: number
}

export const defaultDisplayConfig: PetDisplayConfig = {
  visible: true,
  size: 160,
  right: 24,
  bottom: 20,
}

/** Display value bounds (shared by load-time validation and setConfig). */
export const DISPLAY_SIZE_MIN = 32
export const DISPLAY_SIZE_MAX = 512
export const DISPLAY_INSET_MAX = 10_000

/** Everything persisted for the pet. */
export interface PetPersist {
  /** Currently selected character. */
  character: CharacterId
  /** Per-character custom names; missing entries use the character default. */
  names: Partial<Record<CharacterId, string>>
  affinity: AffinityState
  /** Treat (小鱼干 / 彼岸花) stock ledger. */
  treats: TreatLedger
  display: PetDisplayConfig
}

/** Default pet name used by the settings schema before any character rename. */
export const DEFAULT_PET_NAME = '鲸鱼娘'

/** Name constraints. */
export const PET_NAME_MAX_LENGTH = 20

export function emptyPersist(): PetPersist {
  return {
    character: DEFAULT_CHARACTER,
    names: {},
    affinity: emptyAffinity(),
    treats: emptyTreatLedger(),
    display: { ...defaultDisplayConfig },
  }
}

/** Resolve the persistence directory ($DSH_HOME or ~/.dsh). */
export function petHomeDir(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** Current display name of one character (custom name or character default). */
export function petNameFor(persist: PetPersist, character: CharacterId = persist.character): string {
  return persist.names[character] ?? CHARACTERS[character].defaultName
}

/** Current display name of the selected character. */
export function petDisplayName(persist: PetPersist): string {
  return petNameFor(persist, persist.character)
}

/** Numeric field guard: finite numbers only, else the fallback. */
function finiteNum(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Clamp one count/score into [0, max]. */
function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value))
}

/** A persisted name is accepted when it is a non-empty trimmed string. */
function validName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Load persisted state; missing or corrupt files fall back to defaults. */
export function loadPetPersist(dir: string = petHomeDir()): PetPersist {
  try {
    const raw = readFileSync(join(dir, 'pet.json'), 'utf8')
    const parsed = JSON.parse(raw) as Partial<PetPersist> & { name?: unknown; names?: unknown }
    const base = emptyPersist()
    const rawAffinity = (parsed.affinity ?? {}) as Partial<AffinityState>
    const affinity: AffinityState = {
      points: clamp(finiteNum(rawAffinity.points, 0), AFFINITY_MAX),
      lastPetAt: clamp(finiteNum(rawAffinity.lastPetAt, 0), Number.MAX_SAFE_INTEGER),
      lastFeedAt: clamp(finiteNum(rawAffinity.lastFeedAt, 0), Number.MAX_SAFE_INTEGER),
      pets: clamp(finiteNum(rawAffinity.pets, 0), Number.MAX_SAFE_INTEGER),
      feeds: clamp(finiteNum(rawAffinity.feeds, 0), Number.MAX_SAFE_INTEGER),
      turns: clamp(finiteNum(rawAffinity.turns, 0), Number.MAX_SAFE_INTEGER),
    }
    const rawTreats = (parsed.treats ?? {}) as Partial<TreatLedger>
    const treats: TreatLedger = {
      treats: clamp(finiteNum(rawTreats.treats, 0), defaultTreatConfig.maxTreats),
      lastTreatGrantAt: clamp(finiteNum(rawTreats.lastTreatGrantAt, 0), Number.MAX_SAFE_INTEGER),
      turnsAtLastTreatGrant: clamp(finiteNum(rawTreats.turnsAtLastTreatGrant, 0), Number.MAX_SAFE_INTEGER),
    }
    const rawDisplay = (parsed.display ?? {}) as Partial<PetDisplayConfig>
    const display: PetDisplayConfig = {
      visible: typeof rawDisplay.visible === 'boolean' ? rawDisplay.visible : base.display.visible,
      // The settings schema requires whole pixels; drag positions are
      // clamped but not integral, so round at the persistence boundary.
      size: Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, finiteNum(rawDisplay.size, base.display.size)))),
      right: Math.round(clamp(finiteNum(rawDisplay.right, base.display.right), DISPLAY_INSET_MAX)),
      bottom: Math.round(clamp(finiteNum(rawDisplay.bottom, base.display.bottom), DISPLAY_INSET_MAX)),
    }
    // Character selection: unknown or missing ids stay on whale-girl.
    const character = resolveCharacterId(parsed.character)
    // Per-character names. Legacy `name` migrates into names['whale-girl'].
    const names: Partial<Record<CharacterId, string>> = {}
    if (typeof parsed.names === 'object' && parsed.names !== null) {
      for (const [key, value] of Object.entries(parsed.names as Record<string, unknown>)) {
        if (key !== 'whale-girl' && key !== 'phrolova') continue
        const name = validName(value)
        if (name !== undefined) names[key] = name
      }
    }
    const legacyName = validName(parsed.name)
    if (names['whale-girl'] === undefined && legacyName !== undefined) {
      names['whale-girl'] = legacyName
    }
    return {
      character,
      names,
      affinity,
      treats,
      display,
    }
  } catch {
    return emptyPersist()
  }
}

/** Atomically persist state (write temp + rename). */
export function savePetPersist(data: PetPersist, dir: string = petHomeDir()): void {
  mkdirSync(dir, { recursive: true })
  const target = join(dir, 'pet.json')
  const tmp = `${target}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, target)
}
