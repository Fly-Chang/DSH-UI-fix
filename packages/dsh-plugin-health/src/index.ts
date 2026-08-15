/**
 * dsh-plugin-health host half. Exposes one GET route `/api/plugin-health/check`
 * that returns a point-in-time health snapshot built from:
 *   - the official `pluginInventory` remote (enabled/fiber phase per plugin)
 *   - the `clientModules` graph (browser bundles + revisions + paths)
 *   - the local workspace links under the web profile's @linxin666 scope
 *   - the locally authored agent presets under ~/.dsh/.agent-presets
 * @module @linxin666/dsh-plugin-health
 */

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'dsh-plugin-health'
export const inject = ['webServer', 'clientModules', 'pluginInventory']

/** One entry of the official plugin inventory. */
interface PluginInventoryEntry {
  entryId: string
  moduleName: string
  enabled: boolean
  fiberPhase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null
}

interface PluginInventorySnapshot {
  entries: readonly PluginInventoryEntry[]
}

interface PluginInventoryService {
  list(): PluginInventorySnapshot
}

/** Client module graph entry as exposed by the modules node half. */
interface ClientModuleEntry {
  id: string
  rev: string
  inject: string[]
  immediately: boolean
}

interface ClientModuleGraph {
  rev: string
  entries: ClientModuleEntry[]
}

interface ClientModulesService {
  graph(): ClientModuleGraph
  clientPath(id: string): string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    pluginInventory: PluginInventoryService
    clientModules: ClientModulesService
  }
}

export interface LinkHealth {
  name: string
  kind: 'junction' | 'symlink' | 'directory' | 'missing'
  target: string
  expected: string
  ok: boolean
}

export interface PresetHealth {
  id: string
  composition: boolean
  files: number
  ok: boolean
  issues: string[]
}

export interface HealthSnapshot {
  checkedAt: string
  host: {
    serviceAvailable: boolean
    total: number
    failed: number
    disabled: number
    entries: PluginInventoryEntry[]
  }
  client: {
    serviceAvailable: boolean
    total: number
    missingPaths: number
    rev: string
    entries: { id: string; rev: string; path: string }[]
  }
  links: LinkHealth[]
  presets: PresetHealth[]
  summary: {
    ok: boolean
    issues: string[]
  }
}

const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/

/** Absolute path of this package root, resolved from the built lib location. */
function packageRoot(): string {
  return fileURLToPath(new URL('../', import.meta.url))
}

/** Normalize a Windows/Linux path for case-insensitive comparisons. */
function normPath(value: string): string {
  const withoutTrailing = value.replace(/[\\/]+$/, '')
  return process.platform === 'win32' ? withoutTrailing.toLowerCase() : withoutTrailing
}

/** Inspect one installed package directory (real dir, symlink or junction). */
function inspectLink(path: string, expected: string): Omit<LinkHealth, 'name'> {
  if (!existsSync(path)) return { kind: 'missing', target: '', expected, ok: false }
  const stat = lstatSync(path)
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(path)
    return { kind: 'junction', target, expected, ok: normPath(resolve(path, '..', target)) === normPath(expected) }
  }
  if (stat.isDirectory()) {
    return { kind: 'directory', target: path, expected, ok: normPath(path) === normPath(expected) }
  }
  return { kind: 'missing', target: path, expected, ok: false }
}

/** Compose the full health snapshot from the live host services. */
export function collectHealth(ctx: Context): HealthSnapshot {
  const checkedAt = new Date().toISOString()
  const issues: string[] = []
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const profileScope = join(home, 'profiles', 'web', 'node_modules', '@linxin666')
  const packagesRoot = resolve(packageRoot(), '..')

  const linkChecks = [
    { name: '@linxin666/dsh-pet', expected: join(packagesRoot, 'dsh-pet') },
    { name: '@linxin666/dsh-ssh', expected: join(packagesRoot, 'dsh-ssh') },
    { name: '@linxin666/dsh-client-ui-task-board', expected: join(packagesRoot, 'dsh-task-board') },
    { name: '@linxin666/dsh-client-ui-aionui-panel', expected: join(packagesRoot, 'dsh-aionui-panel') },
    { name: '@linxin666/dsh-skins', expected: join(packagesRoot, 'dsh-skins') },
    { name: '@linxin666/dsh-client-ui-skin-center', expected: join(packagesRoot, 'skins', 'skin-center') },
  ]
  const links: LinkHealth[] = linkChecks.map((entry) => ({
    name: entry.name,
    ...inspectLink(join(profileScope, entry.name.slice('@linxin666/'.length)), entry.expected),
  }))
  for (const link of links) {
    if (!link.ok) {
      issues.push(`${link.name} 不是预期的本地链接（当前 ${link.kind}${link.target === '' ? '' : ': ' + link.target}）`)
    }
  }

  const presetsRoot = join(home, '.agent-presets')
  const presets: PresetHealth[] = []
  if (existsSync(presetsRoot)) {
    for (const child of readdirSync(presetsRoot, { withFileTypes: true })) {
      if (!child.isDirectory() || !PRESET_ID.test(child.name)) continue
      const dir = join(presetsRoot, child.name)
      const composition = existsSync(join(dir, 'agent.cordis.yml'))
      const files = readdirSync(dir).length
      const presetIssues: string[] = []
      if (!composition) presetIssues.push('缺少 agent.cordis.yml')
      const cordisPath = join(dir, 'agent.cordis.yml')
      if (composition) {
        const text = readFileText(cordisPath)
        if (text.includes('../preset/')) presetIssues.push('仍引用 ../preset/（旧共享路径）')
      }
      if (presetIssues.length > 0) issues.push(`预设 ${child.name}: ${presetIssues.join('；')}`)
      presets.push({ id: child.name, composition, files, ok: presetIssues.length === 0, issues: presetIssues })
    }
  }

  const inventory = ctx.get('pluginInventory') as PluginInventoryService | undefined
  let host: HealthSnapshot['host']
  if (inventory === undefined) {
    host = { serviceAvailable: false, total: 0, failed: 0, disabled: 0, entries: [] }
    issues.push('pluginInventory 服务不可用')
  } else {
    const entries = [...inventory.list().entries]
    host = {
      serviceAvailable: true,
      total: entries.length,
      failed: entries.filter((entry) => entry.fiberPhase === 'failed').length,
      disabled: entries.filter((entry) => !entry.enabled).length,
      entries,
    }
    for (const entry of entries) {
      if (entry.fiberPhase === 'failed') issues.push(`宿主插件失败: ${entry.moduleName}`)
    }
  }

  const modules = ctx.get('clientModules') as ClientModulesService | undefined
  let client: HealthSnapshot['client']
  if (modules === undefined) {
    client = { serviceAvailable: false, total: 0, missingPaths: 0, rev: '', entries: [] }
    issues.push('clientModules 服务不可用')
  } else {
    const graph = modules.graph()
    const entries = graph.entries.map((entry) => {
      let path = ''
      try { path = modules.clientPath(entry.id) } catch { path = '' }
      return { id: entry.id, rev: entry.rev.slice(0, 8), path }
    })
    client = {
      serviceAvailable: true,
      total: entries.length,
      missingPaths: entries.filter((entry) => entry.path === '').length,
      rev: graph.rev,
      entries,
    }
    for (const entry of entries) {
      if (entry.path === '') issues.push(`客户端 bundle 路径缺失: ${entry.id}`)
    }
  }

  return {
    checkedAt,
    host,
    client,
    links,
    presets,
    summary: { ok: issues.length === 0, issues },
  }
}

function readFileText(path: string): string {
  return readFileSync(path, 'utf8')
}

/** Register the health-check HTTP route. */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const route = ctx.webServer.register({
      kind: 'exact',
      path: '/api/plugin-health/check',
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405)
          res.end()
          return
        }
        const payload = Buffer.from(JSON.stringify(collectHealth(ctx)), 'utf8')
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(payload.byteLength),
          'cache-control': 'no-cache',
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        res.end(payload)
      },
    })
    return () => route()
  }, 'dsh-plugin-health: route')
}
