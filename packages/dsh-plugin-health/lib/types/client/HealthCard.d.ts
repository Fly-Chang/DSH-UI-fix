import type { ReactElement } from 'react';
interface HostEntry {
    entryId: string;
    moduleName: string;
    enabled: boolean;
    fiberPhase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null;
}
interface LinkHealth {
    name: string;
    kind: string;
    target: string;
    expected: string;
    ok: boolean;
}
interface PresetHealth {
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
        entries: HostEntry[];
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
export declare const HEALTH_CSS = "\n.dsh-ph-entry {\n  position: fixed;\n  top: 84px;\n  right: 16px;\n  z-index: 2147482000;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.2));\n  border-radius: 10px;\n  padding: 6px 10px;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary, #686c75);\n  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.72));\n}\n.dsh-ph-entry:hover {\n  color: var(--dsw-alias-label-primary, #15171b);\n  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.86));\n}\n.dsh-ph-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 24px;\n  background: rgba(0,0,0,.42);\n}\n.dsh-ph-card {\n  width: min(860px, 100%);\n  max-height: 84vh;\n  overflow: auto;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(121,126,145,.2));\n  border-radius: 14px;\n  padding: 14px 16px;\n  color: var(--dsw-alias-label-primary, #15171b);\n  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.82));\n  -webkit-backdrop-filter: blur(22px) saturate(1.2);\n  backdrop-filter: blur(22px) saturate(1.2);\n  box-shadow: 0 14px 44px rgba(0,0,0,.38);\n}\n.dsh-ph-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 10px;\n}\n.dsh-ph-title { margin: 0; font-size: 15px; font-weight: 600; }\n.dsh-ph-close {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.2));\n  border-radius: 7px;\n  padding: 3px 10px;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary, #686c75);\n  background: transparent;\n}\n.dsh-ph-ok { color: var(--dsw-alias-state-success-primary, #1f9d55); font-weight: 600; }\n.dsh-ph-bad { color: var(--dsw-alias-state-error-primary, #c83e4d); font-weight: 600; }\n.dsh-ph-section { margin: 12px 0; }\n.dsh-ph-h2 { margin: 0 0 6px; font-size: 13px; font-weight: 600; }\n.dsh-ph-table { width: 100%; border-collapse: collapse; font-size: 12px; }\n.dsh-ph-table th, .dsh-ph-table td {\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(121,126,145,.16));\n  padding: 5px 6px;\n  text-align: left;\n  vertical-align: top;\n}\n.dsh-ph-table th { color: var(--dsw-alias-label-tertiary, #9296a0); font-weight: 500; }\n.dsh-ph-issue { color: var(--dsw-alias-state-error-primary, #c83e4d); white-space: pre-wrap; }\n.dsh-ph-muted { color: var(--dsw-alias-label-tertiary, #9296a0); }\n";
export declare function HealthCard(): ReactElement;
export {};
