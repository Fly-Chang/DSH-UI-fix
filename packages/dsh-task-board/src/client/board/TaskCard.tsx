/**
 * Task card: the board's column item. Clicking opens the task detail — it
 * never executes anything directly (detail holds the Run button). A right
 * click opens a quick-action menu: run / rerun, edit (open detail), delete.
 */
import { useEffect, useRef, useState } from 'react'
import type { TaskRecord } from '../../core/tasks.ts'
import { executionLabel, formatCountdown } from '../../core/tasks.ts'
import { t } from '../locales.ts'
import css from '../board.module.css'

/** Compact relative/absolute time label. */
export function formatTime(ms: number): string {
  const date = new Date(ms)
  const now = Date.now()
  const minutes = Math.floor((now - ms) / 60000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** One card in a column. */
export function TaskCard({
  task,
  onClick,
  onRun,
  onRerun,
  onDelete,
}: {
  task: TaskRecord
  onClick: () => void
  onRun: () => void
  onRerun: () => void
  onDelete: () => void
}) {
  const latest = task.executions[task.executions.length - 1]
  const runs = task.executions.length
  const running = task.status === 'running'
  const menuRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  // Live countdown on the schedule badge (ticks while a run is armed).
  const nextRunAt = task.schedule?.enabled === true ? task.schedule.nextRunAt : undefined
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (nextRunAt === undefined) return
    const timer = setInterval(() => { forceTick(tick => tick + 1) }, 1000)
    return () => clearInterval(timer)
  }, [nextRunAt])

  // Close the quick menu on outside clicks / Escape (auto-close keeps the
  // board keyboard-friendly: one menu at a time).
  useEffect(() => {
    if (menu === null) return
    const close = (event: MouseEvent): void => {
      if (menuRef.current !== null && menuRef.current.contains(event.target as Node)) return
      setMenu(null)
    }
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', key)
    }
  }, [menu])

  return (
    <>
      <button
        type="button"
        className={css.card}
        data-status={task.status}
        onClick={onClick}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
        title={task.description !== '' ? task.description : task.title}
      >
        <span className={css.cardTitle}>{task.title}</span>
        {task.description !== '' && <span className={css.cardExcerpt}>{task.description}</span>}
        <span className={css.cardMeta}>
          <span className={css.cardTime}>{t('board.updated')} {formatTime(task.updatedAt)}</span>
          {task.schedule?.enabled === true && (
            <span
              className={css.cardSchedule}
              title={task.schedule.nextRunAt !== undefined
                ? `${t('card.scheduled')} · ${new Date(task.schedule.nextRunAt).toLocaleString()}`
                : t('card.scheduled')}
            >
              {nextRunAt !== undefined
                ? formatCountdown(nextRunAt - Date.now())
                : t('card.scheduled')}
            </span>
          )}
          {latest !== undefined && (
            <span className={css.cardRun} data-result={latest.result}>
              {runs} {t('board.runs')}
            </span>
          )}
          {latest?.sessionId !== undefined && (
            <span className={css.cardSession} title={latest.sessionId}>⌁</span>
          )}
          {running && <span className={css.cardSpinner} aria-hidden="true" />}
        </span>
        {latest !== undefined && executionLabel(latest) === 'running' && (
          <span className={css.cardRunningLabel}>{t('detail.result.running')}…</span>
        )}
      </button>
      {menu !== null && (
        <div
          ref={menuRef}
          className={css.cardMenu}
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {running ? (
            <div
              className={css.cardMenuItem}
              role="menuitem"
              onClick={() => { setMenu(null); onRerun() }}
            >
              {t('card.menu.rerun')}
            </div>
          ) : (
            <div
              className={css.cardMenuItem}
              role="menuitem"
              onClick={() => { setMenu(null); onRun() }}
            >
              {t('card.menu.run')}
            </div>
          )}
          <div
            className={css.cardMenuItem}
            role="menuitem"
            onClick={() => { setMenu(null); onClick() }}
          >
            {t('card.menu.edit')}
          </div>
          <div className={css.cardMenuSep} />
          <div
            className={`${css.cardMenuItem} ${css.cardMenuItemDanger}`}
            role="menuitem"
            onClick={() => { setMenu(null); onDelete() }}
          >
            {t('card.menu.delete')}
          </div>
        </div>
      )}
    </>
  )
}
