/**
 * Pet character registry — shared by the host and client halves.
 *
 * The pet plugin is a single package hosting multiple characters (whale-girl
 * and Phrolova). Each character owns its display name, treat vocabulary,
 * affinity rank ladder and interaction reactions; the affinity ledger and
 * treat stock stay shared across characters so switching never resets them.
 * @module @linxin666/dsh-pet/characters
 */

/** Stable character ids persisted in pet.json. */
export type CharacterId = 'whale-girl' | 'phrolova'

/** One affinity rank ladder entry. */
export interface RankDef {
  /** Minimum affinity points for this rank. */
  min: number
  /** Rank display name. */
  name: string
  /** Plain ASCII marker glyphs (the repo bans all emoji characters). */
  emoji: string
}

/** Interaction reactions shown in the pet bubble. */
export interface CharacterReactions {
  /** Accepted pet reaction. */
  petOk: string
  /** Pet refused by cooldown. */
  petCooldown: string
  /** Accepted feed reaction. */
  feedOk: string
  /** Feed refused by cooldown. */
  feedCooldown: string
  /**
   * Out-of-stock feed reaction. `{treat}` and `{name}` placeholders are
   * filled by the service from the character definition.
   */
  noTreat: string
}

/** One playable pet character. */
export interface CharacterDef {
  id: CharacterId
  /** Panel display name. */
  displayName: string
  /** Default name before the user renames this character. */
  defaultName: string
  /** Treat (投喂物) display name. */
  treatName: string
  /** Asset route prefix: `/pet/whale` or `/pet/phrolova`. */
  assetPrefix: string
  /** True when the character ships a dark-form atlas following the GUI theme. */
  hasDarkForm: boolean
  /** Affinity rank ladder. */
  ranks: readonly RankDef[]
  /** Reaction copy. */
  reactions: CharacterReactions
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  'whale-girl': {
    id: 'whale-girl',
    displayName: '鲸鱼娘',
    defaultName: '鲸鱼娘',
    treatName: '小鱼干',
    assetPrefix: '/pet/whale',
    hasDarkForm: false,
    ranks: [
      { min: 0, name: '幼鲸', emoji: '*' },
      { min: 25, name: '伙伴', emoji: '**' },
      { min: 50, name: '挚友', emoji: '***' },
      { min: 80, name: '深海羁绊', emoji: '****' },
    ],
    reactions: {
      petOk: '咕噜咕噜～被摸摸好舒服！',
      petCooldown: '摸过头啦，让鲸鱼娘歇口气～',
      feedOk: '呜哇！小鱼干好好吃！',
      feedCooldown: '吃饱啦，晚点再喂～',
      noTreat: '没有{treat}了，多陪{name}工作一会儿吧～',
    },
  },
  'phrolova': {
    id: 'phrolova',
    displayName: '弗洛洛',
    defaultName: '弗洛洛',
    treatName: '彼岸花',
    assetPrefix: '/pet/phrolova',
    hasDarkForm: true,
    ranks: [
      { min: 0, name: '花苞', emoji: '*' },
      { min: 25, name: '花开', emoji: '**' },
      { min: 50, name: '绯红', emoji: '***' },
      { min: 80, name: '彼岸之约', emoji: '****' },
    ],
    reactions: {
      petOk: '……并不讨厌。允许你再摸一下。',
      petCooldown: '别得寸进尺。下次再说。',
      feedOk: '彼岸花，收下了。味道……不坏。',
      feedCooldown: '已经够了，先放着吧。',
      noTreat: '没有{treat}了，多陪{name}工作一会儿吧～',
    },
  },
}

/** The character a fresh pet starts with (backward compatible). */
export const DEFAULT_CHARACTER: CharacterId = 'whale-girl'

/** Type guard for ids received over the API or loaded from disk. */
export function isCharacterId(value: unknown): value is CharacterId {
  return value === 'whale-girl' || value === 'phrolova'
}

/** Resolve a persisted value (possibly absent/corrupt) to a character id. */
export function resolveCharacterId(value: unknown): CharacterId {
  return isCharacterId(value) ? value : DEFAULT_CHARACTER
}

/** Fill the `{treat}` / `{name}` placeholders of one reaction. */
export function fillReaction(template: string, def: CharacterDef): string {
  return template
    .replaceAll('{treat}', def.treatName)
    .replaceAll('{name}', def.displayName)
}

/** Summary slice the host sends to the browser for the switch button and copy. */
export interface CharacterSummary {
  id: CharacterId
  displayName: string
  treatName: string
  hasDarkForm: boolean
}

export function characterSummary(def: CharacterDef): CharacterSummary {
  return {
    id: def.id,
    displayName: def.displayName,
    treatName: def.treatName,
    hasDarkForm: def.hasDarkForm,
  }
}
