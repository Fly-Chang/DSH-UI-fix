import { describe, expect, it } from 'vitest'
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  TRACKS_BY_CHARACTER,
  framePosition,
  rowOfTrack,
  trimTrack,
} from './spritesheet.ts'

describe('TRACKS_BY_CHARACTER', () => {
  it('keeps the whale-girl rows under the 8-column contract', () => {
    for (const animation of Object.keys(TRACKS_BY_CHARACTER['whale-girl']) as (keyof typeof TRACKS_BY_CHARACTER['whale-girl'])[]) {
      const track = TRACKS_BY_CHARACTER['whale-girl'][animation]
      expect(track.frames.length).toBe(track.durations.length)
      expect(Math.max(...track.frames)).toBeLessThan(8)
    }
  })

  it('gives Phrolova four frames per row with the agreed pacing', () => {
    const tracks = TRACKS_BY_CHARACTER['phrolova']
    for (const animation of Object.keys(tracks) as (keyof typeof tracks)[]) {
      const track = tracks[animation]
      expect(track.frames).toEqual([0, 1, 2, 3])
      expect(track.durations.length).toBe(4)
      expect(track.durations.every((ms) => ms >= 225 && ms <= 600)).toBe(true)
    }
    expect(tracks['running-right'].durations).toEqual([225, 225, 225, 225])
    expect(tracks['failed'].durations[3]).toBeGreaterThan(tracks['failed'].durations[0]!)
    expect(tracks['failed'].loop).toBe(false)
    expect(tracks['failed'].fallback).toBe('idle')
    expect(tracks['jumping'].loop).toBe(false)
  })
})

describe('sprite geometry helpers', () => {
  it('maps the nine rows onto the handoff row order', () => {
    expect(rowOfTrack('idle')).toBe(0)
    expect(rowOfTrack('running-right')).toBe(1)
    expect(rowOfTrack('running-left')).toBe(2)
    expect(rowOfTrack('waving')).toBe(3)
    expect(rowOfTrack('jumping')).toBe(4)
    expect(rowOfTrack('failed')).toBe(5)
    expect(rowOfTrack('waiting')).toBe(6)
    expect(rowOfTrack('running')).toBe(7)
    expect(rowOfTrack('review')).toBe(8)
  })

  it('positions frames in scaled cell coordinates', () => {
    const origin = framePosition(0, 0)
    expect(Math.abs(origin.x)).toBe(0)
    expect(Math.abs(origin.y)).toBe(0)
    expect(framePosition(1, 2, 0.5)).toEqual({ x: -FRAME_WIDTH, y: -FRAME_HEIGHT * 0.5 })
  })

  it('trims a track to the detected row frame count', () => {
    const track = TRACKS_BY_CHARACTER['whale-girl'].idle
    const trimmed = trimTrack(track, 3)
    expect(trimmed.frames).toEqual([0, 1, 2])
    expect(trimmed.durations).toEqual([400, 400, 500])
    expect(trimTrack(track, 0).frames).toEqual([0])
  })
})
