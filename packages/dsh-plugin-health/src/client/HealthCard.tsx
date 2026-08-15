/**
 * Health report card for dsh-plugin-health. A fixed entry button plus a
 * frosted-glass overlay that portals to document.body.
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import { createPortal } from 'react-dom'

interface HostEntry {
  entryId: string
  moduleName: string
  enabled: boolean
  fiberPhase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null
}

interface LinkHealth {
  name: string
  kind: string
  target: string
  expected: string
  ok: boolean
}

interface PresetHealth {
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
    entries: HostEntry[]
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
  summary: { ok: boolean; issues: string[] }
}

export const HEALTH_CSS = `
.dsh-ph-entry {
  position: fixed;
  top: 84px;
  right: 16px;
  z-index: 2147482000;
  border: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.2));
  border-radius: 10px;
  padding: 6px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #686c75);
  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.72));
}
.dsh-ph-entry:hover {
  color: var(--dsw-alias-label-primary, #15171b);
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.86));
}
.dsh-ph-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,.42);
}
.dsh-ph-card {
  width: min(860px, 100%);
  max-height: 84vh;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l2, rgba(121,126,145,.2));
  border-radius: 14px;
  padding: 14px 16px;
  color: var(--dsw-alias-label-primary, #15171b);
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.82));
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
  backdrop-filter: blur(22px) saturate(1.2);
  box-shadow: 0 14px 44px rgba(0,0,0,.38);
}
.dsh-ph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.dsh-ph-title { margin: 0; font-size: 15px; font-weight: 600; }
.dsh-ph-close {
  border: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.2));
  border-radius: 7px;
  padding: 3px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #686c75);
  background: transparent;
}
.dsh-ph-ok { color: var(--dsw-alias-state-success-primary, #1f9d55); font-weight: 600; }
.dsh-ph-bad { color: var(--dsw-alias-state-error-primary, #c83e4d); font-weight: 600; }
.dsh-ph-section { margin: 12px 0; }
.dsh-ph-h2 { margin: 0 0 6px; font-size: 13px; font-weight: 600; }
.dsh-ph-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dsh-ph-table th, .dsh-ph-table td {
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.16));
  padding: 5px 6px;
  text-align: left;
  vertical-align: top;
}
.dsh-ph-table th { color: var(--dsw-alias-label-tertiary, #9296a0); font-weight: 500; }
.dsh-ph-issue { color: var(--dsw-alias-state-error-primary, #c83e4d); white-space: pre-wrap; }
.dsh-ph-muted { color: var(--dsw-alias-label-tertiary, #9296a0); }
`

const ZH = {
  title: '插件体检',
  open: '插件体检',
  close: '关闭',
  loading: '检查中…',
  run: '运行检查',
  allOk: '全部正常',
  issues: '发现问题',
  hostSection: '宿主插件',
  clientSection: '客户端插件',
  linkSection: '本地包链接',
  presetSection: 'Agent 预设',
  checkedAt: '检查时间',
  hostCount: '宿主插件 {total} 个，失败 {failed} 个，停用 {disabled} 个',
  clientCount: '客户端插件 {total} 个，路径缺失 {missing} 个',
  linkOk: '链接正常',
  linkBad: '链接异常',
  presetOk: '正常',
  presetBad: '异常',
  failed: '失败',
  disabled: '停用',
  active: '运行中',
  phase: '阶段',
  name: '名称',
  status: '状态',
  id: 'ID',
  target: '指向',
  files: '文件数',
  fetchFailed: '检查请求失败，请确认 /api/plugin-health/check 可用',
}

const EN: Record<string, string> = {
  title: 'Plugin health',
  open: 'Plugin health',
  close: 'Close',
  loading: 'Checking…',
  run: 'Run check',
  allOk: 'All plugins healthy',
  issues: 'Issues found',
  hostSection: 'Host plugins',
  clientSection: 'Client plugins',
  linkSection: 'Local package links',
  presetSection: 'Agent presets',
  checkedAt: 'Checked at',
  hostCount: '{total} host plugins, {failed} failed, {disabled} disabled',
  clientCount: '{total} client plugins, {missing} missing paths',
  linkOk: 'link ok',
  linkBad: 'link broken',
  presetOk: 'ok',
  presetBad: 'broken',
  failed: 'failed',
  disabled: 'disabled',
  active: 'active',
  phase: 'phase',
  name: 'name',
  status: 'status',
  id: 'id',
  target: 'target',
  files: 'files',
  fetchFailed: 'Health request failed; check /api/plugin-health/check',
}

function dictionary(): Record<string, string> {
  const lang = typeof document === 'undefined' ? 'zh' : (document.documentElement.lang ?? 'zh')
  return lang.toLowerCase().startsWith('en') ? EN : ZH
}

function fmt(text: string, params: Record<string, unknown>): string {
  let out = text
  for (const [key, value] of Object.entries(params)) out = out.replaceAll(`{${key}}`, String(value))
  return out
}

export function HealthCard(): ReactElement {
  const t = dictionary()
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (): void => {
    setLoading(true)
    setError(null)
    fetch('/api/plugin-health/check')
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<HealthSnapshot>
      })
      .then((value) => {
        setSnapshot(value)
        setOpen(true)
      })
      .catch(() => {
        setError(t.fetchFailed)
        setOpen(true)
      })
      .finally(() => setLoading(false))
  }

  const card = (
    <div className="dsh-ph-overlay" onClick={() => setOpen(false)}>
      <div className="dsh-ph-card" onClick={(event) => event.stopPropagation()}>
        <div className="dsh-ph-head">
          <h2 className="dsh-ph-title">{t.title}</h2>
          <button type="button" className="dsh-ph-close" onClick={() => setOpen(false)}>{t.close}</button>
        </div>
        {loading ? <div>{t.loading}</div> : null}
        {error !== null ? <div className="dsh-ph-issue">{error}</div> : null}
        {snapshot !== null ? (
          <>
            <div className={snapshot.summary.ok ? 'dsh-ph-ok' : 'dsh-ph-bad'}>
              {snapshot.summary.ok ? t.allOk : `${t.issues}: ${snapshot.summary.issues.length}`}
            </div>
            <div className="dsh-ph-muted">{t.checkedAt}: {snapshot.checkedAt}</div>
            {snapshot.summary.issues.length > 0 ? (
              <div className="dsh-ph-section">
                <div className="dsh-ph-h2">{t.issues}</div>
                {snapshot.summary.issues.map((issue, index) => (
                  <div key={index} className="dsh-ph-issue">- {issue}</div>
                ))}
              </div>
            ) : null}

            <div className="dsh-ph-section">
              <div className="dsh-ph-h2">{t.hostSection}</div>
              <div className="dsh-ph-muted">{fmt(t.hostCount, { total: snapshot.host.total, failed: snapshot.host.failed, disabled: snapshot.host.disabled })}</div>
              <table className="dsh-ph-table">
                <thead>
                  <tr><th>{t.name}</th><th>{t.status}</th><th>{t.phase}</th></tr>
                </thead>
                <tbody>
                  {snapshot.host.entries.map((entry) => (
                    <tr key={entry.entryId}>
                      <td>{entry.moduleName}</td>
                      <td>{entry.enabled ? (entry.fiberPhase === 'failed' ? t.failed : t.active) : t.disabled}</td>
                      <td>{entry.fiberPhase ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dsh-ph-section">
              <div className="dsh-ph-h2">{t.clientSection}</div>
              <div className="dsh-ph-muted">{fmt(t.clientCount, { total: snapshot.client.total, missing: snapshot.client.missingPaths })}</div>
            </div>

            <div className="dsh-ph-section">
              <div className="dsh-ph-h2">{t.linkSection}</div>
              <table className="dsh-ph-table">
                <thead><tr><th>{t.name}</th><th>{t.status}</th><th>{t.target}</th></tr></thead>
                <tbody>
                  {snapshot.links.map((link) => (
                    <tr key={link.name}>
                      <td>{link.name}</td>
                      <td className={link.ok ? 'dsh-ph-ok' : 'dsh-ph-bad'}>{link.ok ? t.linkOk : t.linkBad}</td>
                      <td className="dsh-ph-muted">{link.kind === 'missing' ? '-' : link.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dsh-ph-section">
              <div className="dsh-ph-h2">{t.presetSection}</div>
              <table className="dsh-ph-table">
                <thead><tr><th>{t.id}</th><th>{t.status}</th><th>{t.files}</th></tr></thead>
                <tbody>
                  {snapshot.presets.map((preset) => (
                    <tr key={preset.id}>
                      <td>{preset.id}</td>
                      <td className={preset.ok ? 'dsh-ph-ok' : 'dsh-ph-bad'}>{preset.ok ? t.presetOk : t.presetBad}</td>
                      <td>{preset.files}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {snapshot === null && !loading && error === null ? (
          <button type="button" className="dsh-ph-close" onClick={run}>{t.run}</button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <button type="button" className="dsh-ph-entry" onClick={run}>
        {loading ? t.loading : t.open}
      </button>
      {open ? createPortal(card, document.body) : null}
    </>
  )
}
