/**
 * dsh-plugin-health host half. Exposes one GET route `/api/plugin-health/check`
 * that returns a point-in-time health snapshot built from:
 *   - the official `pluginInventory` remote (enabled/fiber phase per plugin)
 *   - the `clientModules` graph (browser bundles + revisions + paths)
 *   - the local workspace links under the web profile's @linxin666 scope
 *   - the locally authored agent presets under ~/.dsh/.agent-presets
 * @module @linxin666/dsh-plugin-health
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-plugin-health";
export declare const inject: string[];
/** One entry of the official plugin inventory. */
interface PluginInventoryEntry {
    entryId: string;
    moduleName: string;
    enabled: boolean;
    fiberPhase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null;
}
interface PluginInventorySnapshot {
    entries: readonly PluginInventoryEntry[];
}
interface PluginInventoryService {
    list(): PluginInventorySnapshot;
}
/** Client module graph entry as exposed by the modules node half. */
interface ClientModuleEntry {
    id: string;
    rev: string;
    inject: string[];
    immediately: boolean;
}
interface ClientModuleGraph {
    rev: string;
    entries: ClientModuleEntry[];
}
interface ClientModulesService {
    graph(): ClientModuleGraph;
    clientPath(id: string): string;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        pluginInventory: PluginInventoryService;
        clientModules: ClientModulesService;
    }
}
export interface LinkHealth {
    name: string;
    kind: 'junction' | 'symlink' | 'directory' | 'missing';
    target: string;
    expected: string;
    ok: boolean;
}
export interface PresetHealth {
    id: string;
    composition: boolean;
    files: number;
    ok: boolean;
    issues: string[];
}
export interface HealthSnapshot {
    checkedAt: string;
    host: {
        serviceAvailable: boolean;
        total: number;
        failed: number;
        disabled: number;
        entries: PluginInventoryEntry[];
    };
    client: {
        serviceAvailable: boolean;
        total: number;
        missingPaths: number;
        rev: string;
        entries: {
            id: string;
            rev: string;
            path: string;
        }[];
    };
    links: LinkHealth[];
    presets: PresetHealth[];
    summary: {
        ok: boolean;
        issues: string[];
    };
}
/** Compose the full health snapshot from the live host services. */
export declare function collectHealth(ctx: Context): HealthSnapshot;
/** Register the health-check HTTP route. */
export declare function apply(ctx: Context): void;
export {};
