import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/index.ts
/**
* dsh-plugin-health host half. Exposes one GET route `/api/plugin-health/check`
* that returns a point-in-time health snapshot built from:
*   - the official `pluginInventory` remote (enabled/fiber phase per plugin)
*   - the `clientModules` graph (browser bundles + revisions + paths)
*   - the local workspace links under the web profile's @linxin666 scope
*   - the locally authored agent presets under ~/.dsh/.agent-presets
* @module @linxin666/dsh-plugin-health
*/
const name = "dsh-plugin-health";
const inject = [
	"webServer",
	"clientModules",
	"pluginInventory"
];
const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/;
/** Absolute path of this package root, resolved from the built lib location. */
function packageRoot() {
	return fileURLToPath(new URL("../", import.meta.url));
}
/** Normalize a Windows/Linux path for case-insensitive comparisons. */
function normPath(value) {
	const withoutTrailing = value.replace(/[\\/]+$/, "");
	return process.platform === "win32" ? withoutTrailing.toLowerCase() : withoutTrailing;
}
/** Inspect one installed package directory (real dir, symlink or junction). */
function inspectLink(path, expected) {
	if (!existsSync(path)) return {
		kind: "missing",
		target: "",
		expected,
		ok: false
	};
	const stat = lstatSync(path);
	if (stat.isSymbolicLink()) {
		const target = readlinkSync(path);
		return {
			kind: "junction",
			target,
			expected,
			ok: normPath(resolve(path, "..", target)) === normPath(expected)
		};
	}
	if (stat.isDirectory()) return {
		kind: "directory",
		target: path,
		expected,
		ok: normPath(path) === normPath(expected)
	};
	return {
		kind: "missing",
		target: path,
		expected,
		ok: false
	};
}
/** Compose the full health snapshot from the live host services. */
function collectHealth(ctx) {
	const checkedAt = (/* @__PURE__ */ new Date()).toISOString();
	const issues = [];
	const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
	const profileScope = join(home, "profiles", "web", "node_modules", "@linxin666");
	const packagesRoot = resolve(packageRoot(), "..");
	const links = [
		{
			name: "@linxin666/dsh-pet",
			expected: join(packagesRoot, "dsh-pet")
		},
		{
			name: "@linxin666/dsh-ssh",
			expected: join(packagesRoot, "dsh-ssh")
		},
		{
			name: "@linxin666/dsh-client-ui-task-board",
			expected: join(packagesRoot, "dsh-task-board")
		},
		{
			name: "@linxin666/dsh-client-ui-aionui-panel",
			expected: join(packagesRoot, "dsh-aionui-panel")
		},
		{
			name: "@linxin666/dsh-skins",
			expected: join(packagesRoot, "dsh-skins")
		},
		{
			name: "@linxin666/dsh-client-ui-skin-center",
			expected: join(packagesRoot, "skins", "skin-center")
		}
	].map((entry) => ({
		name: entry.name,
		...inspectLink(join(profileScope, entry.name.slice(11)), entry.expected)
	}));
	for (const link of links) if (!link.ok) issues.push(`${link.name} 不是预期的本地链接（当前 ${link.kind}${link.target === "" ? "" : ": " + link.target}）`);
	const presetsRoot = join(home, ".agent-presets");
	const presets = [];
	if (existsSync(presetsRoot)) for (const child of readdirSync(presetsRoot, { withFileTypes: true })) {
		if (!child.isDirectory() || !PRESET_ID.test(child.name)) continue;
		const dir = join(presetsRoot, child.name);
		const composition = existsSync(join(dir, "agent.cordis.yml"));
		const files = readdirSync(dir).length;
		const presetIssues = [];
		if (!composition) presetIssues.push("缺少 agent.cordis.yml");
		const cordisPath = join(dir, "agent.cordis.yml");
		if (composition) {
			if (readFileText(cordisPath).includes("../preset/")) presetIssues.push("仍引用 ../preset/（旧共享路径）");
		}
		if (presetIssues.length > 0) issues.push(`预设 ${child.name}: ${presetIssues.join("；")}`);
		presets.push({
			id: child.name,
			composition,
			files,
			ok: presetIssues.length === 0,
			issues: presetIssues
		});
	}
	const inventory = ctx.get("pluginInventory");
	let host;
	if (inventory === void 0) {
		host = {
			serviceAvailable: false,
			total: 0,
			failed: 0,
			disabled: 0,
			entries: []
		};
		issues.push("pluginInventory 服务不可用");
	} else {
		const entries = [...inventory.list().entries];
		host = {
			serviceAvailable: true,
			total: entries.length,
			failed: entries.filter((entry) => entry.fiberPhase === "failed").length,
			disabled: entries.filter((entry) => !entry.enabled).length,
			entries
		};
		for (const entry of entries) if (entry.fiberPhase === "failed") issues.push(`宿主插件失败: ${entry.moduleName}`);
	}
	const modules = ctx.get("clientModules");
	let client;
	if (modules === void 0) {
		client = {
			serviceAvailable: false,
			total: 0,
			missingPaths: 0,
			rev: "",
			entries: []
		};
		issues.push("clientModules 服务不可用");
	} else {
		const graph = modules.graph();
		const entries = graph.entries.map((entry) => {
			let path = "";
			try {
				path = modules.clientPath(entry.id);
			} catch {
				path = "";
			}
			return {
				id: entry.id,
				rev: entry.rev.slice(0, 8),
				path
			};
		});
		client = {
			serviceAvailable: true,
			total: entries.length,
			missingPaths: entries.filter((entry) => entry.path === "").length,
			rev: graph.rev,
			entries
		};
		for (const entry of entries) if (entry.path === "") issues.push(`客户端 bundle 路径缺失: ${entry.id}`);
	}
	return {
		checkedAt,
		host,
		client,
		links,
		presets,
		summary: {
			ok: issues.length === 0,
			issues
		}
	};
}
function readFileText(path) {
	return readFileSync(path, "utf8");
}
/** Register the health-check HTTP route. */
function apply(ctx) {
	ctx.effect(() => {
		const route = ctx.webServer.register({
			kind: "exact",
			path: "/api/plugin-health/check",
			handler: (req, res) => {
				if (req.method !== "GET" && req.method !== "HEAD") {
					res.writeHead(405);
					res.end();
					return;
				}
				const payload = Buffer.from(JSON.stringify(collectHealth(ctx)), "utf8");
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"content-length": String(payload.byteLength),
					"cache-control": "no-cache"
				});
				if (req.method === "HEAD") {
					res.end();
					return;
				}
				res.end(payload);
			}
		});
		return () => route();
	}, "dsh-plugin-health: route");
}
//#endregion
export { apply, collectHealth, inject, name };
