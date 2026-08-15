/**
 * dsh-plugin-health browser half. Mounts one global React root with the
 * fixed health entry; the report overlay portals itself to document.body.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { HEALTH_CSS, HealthCard } from './HealthCard.tsx'

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-health'
  style.textContent = HEALTH_CSS
  document.head.appendChild(style)

  const container = document.createElement('div')
  container.dataset.dshPluginHealth = ''
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(createElement(HealthCard))

  ctx.effect(() => () => {
    root.unmount()
    container.remove()
    style.remove()
  }, 'dsh-plugin-health: ui')
}
