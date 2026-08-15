import { describe, expect, it } from 'vitest'
import { collectHealth, type HealthSnapshot } from '../src/index.ts'

function fakeContext(): unknown {
  return {
    get(name: string) {
      if (name === 'pluginInventory') {
        return {
          list: () => ({
            entries: [
              { entryId: 'a', moduleName: '@deepseek-ai/dsh-base', enabled: true, fiberPhase: 'active' },
              { entryId: 'b', moduleName: '@linxin666/dsh-pet', enabled: true, fiberPhase: 'failed' },
              { entryId: 'c', moduleName: 'disabled-plugin', enabled: false, fiberPhase: null },
            ],
          }),
        }
      }
      if (name === 'clientModules') {
        return {
          graph: () => ({
            rev: 'rev-test',
            entries: [
              { id: '@linxin666/dsh-pet', rev: 'abcdef12', inject: [], immediately: false },
              { id: 'missing-path', rev: '12345678', inject: [], immediately: false },
            ],
          }),
          clientPath: (id: string) => (id === '@linxin666/dsh-pet' ? '/tmp/pet.js' : ''),
        }
      }
      return undefined
    },
  }
}

describe('collectHealth', () => {
  it('reports failed host plugins, missing client paths, and service availability', () => {
    const snapshot = collectHealth(fakeContext() as never) as HealthSnapshot
    expect(snapshot.host.serviceAvailable).toBe(true)
    expect(snapshot.host.total).toBe(3)
    expect(snapshot.host.failed).toBe(1)
    expect(snapshot.host.disabled).toBe(1)
    expect(snapshot.client.serviceAvailable).toBe(true)
    expect(snapshot.client.missingPaths).toBe(1)
    expect(snapshot.summary.ok).toBe(false)
    expect(snapshot.summary.issues.some((issue) => issue.includes('@linxin666/dsh-pet'))).toBe(true)
  })

  it('does not scan non-preset directories as presets', () => {
    const snapshot = collectHealth(fakeContext() as never) as HealthSnapshot
    expect(snapshot.presets.every((preset) => /^[a-z0-9][a-z0-9-]*$/.test(preset.id))).toBe(true)
  })
})
