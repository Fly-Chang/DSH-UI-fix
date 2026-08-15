/**
 * dsh-plugin-health build config. Uses the repo's shared client-bundle preset
 * (window.__ModuleLoader__ contract, externals resolved through the loader
 * module table) and emits the host half from src/index.ts.
 */
import { clientBundle } from '../../shared/tsdown.client.ts'

export default clientBundle('@linxin666/dsh-plugin-health', ['src/index.ts'])
