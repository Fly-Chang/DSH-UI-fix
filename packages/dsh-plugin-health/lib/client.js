window.__ModuleLoader__.load({
	id: "@linxin666/dsh-plugin-health",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom_client = require("react-dom/client");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/HealthCard.tsx
		/**
		* Health report card for dsh-plugin-health. A fixed entry button plus a
		* frosted-glass overlay that portals to document.body.
		*/
		const HEALTH_CSS = `
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
`;
		const ZH = {
			title: "插件体检",
			open: "插件体检",
			close: "关闭",
			loading: "检查中…",
			run: "运行检查",
			allOk: "全部正常",
			issues: "发现问题",
			hostSection: "宿主插件",
			clientSection: "客户端插件",
			linkSection: "本地包链接",
			presetSection: "Agent 预设",
			checkedAt: "检查时间",
			hostCount: "宿主插件 {total} 个，失败 {failed} 个，停用 {disabled} 个",
			clientCount: "客户端插件 {total} 个，路径缺失 {missing} 个",
			linkOk: "链接正常",
			linkBad: "链接异常",
			presetOk: "正常",
			presetBad: "异常",
			failed: "失败",
			disabled: "停用",
			active: "运行中",
			phase: "阶段",
			name: "名称",
			status: "状态",
			id: "ID",
			target: "指向",
			files: "文件数",
			fetchFailed: "检查请求失败，请确认 /api/plugin-health/check 可用"
		};
		const EN = {
			title: "Plugin health",
			open: "Plugin health",
			close: "Close",
			loading: "Checking…",
			run: "Run check",
			allOk: "All plugins healthy",
			issues: "Issues found",
			hostSection: "Host plugins",
			clientSection: "Client plugins",
			linkSection: "Local package links",
			presetSection: "Agent presets",
			checkedAt: "Checked at",
			hostCount: "{total} host plugins, {failed} failed, {disabled} disabled",
			clientCount: "{total} client plugins, {missing} missing paths",
			linkOk: "link ok",
			linkBad: "link broken",
			presetOk: "ok",
			presetBad: "broken",
			failed: "failed",
			disabled: "disabled",
			active: "active",
			phase: "phase",
			name: "name",
			status: "status",
			id: "id",
			target: "target",
			files: "files",
			fetchFailed: "Health request failed; check /api/plugin-health/check"
		};
		function dictionary() {
			return (typeof document === "undefined" ? "zh" : document.documentElement.lang ?? "zh").toLowerCase().startsWith("en") ? EN : ZH;
		}
		function fmt(text, params) {
			let out = text;
			for (const [key, value] of Object.entries(params)) out = out.replaceAll(`{${key}}`, String(value));
			return out;
		}
		function HealthCard() {
			const t = dictionary();
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [loading, setLoading] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const run = () => {
				setLoading(true);
				setError(null);
				fetch("/api/plugin-health/check").then(async (response) => {
					if (!response.ok) throw new Error(String(response.status));
					return response.json();
				}).then((value) => {
					setSnapshot(value);
					setOpen(true);
				}).catch(() => {
					setError(t.fetchFailed);
					setOpen(true);
				}).finally(() => setLoading(false));
			};
			const card = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ph-overlay",
				onClick: () => setOpen(false),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ph-card",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ph-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: "dsh-ph-title",
								children: t.title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ph-close",
								onClick: () => setOpen(false),
								children: t.close
							})]
						}),
						loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t.loading }) : null,
						error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ph-issue",
							children: error
						}) : null,
						snapshot !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: snapshot.summary.ok ? "dsh-ph-ok" : "dsh-ph-bad",
								children: snapshot.summary.ok ? t.allOk : `${t.issues}: ${snapshot.summary.issues.length}`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-muted",
								children: [
									t.checkedAt,
									": ",
									snapshot.checkedAt
								]
							}),
							snapshot.summary.issues.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ph-h2",
									children: t.issues
								}), snapshot.summary.issues.map((issue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ph-issue",
									children: ["- ", issue]
								}, index))]
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-section",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ph-h2",
										children: t.hostSection
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ph-muted",
										children: fmt(t.hostCount, {
											total: snapshot.host.total,
											failed: snapshot.host.failed,
											disabled: snapshot.host.disabled
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: "dsh-ph-table",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.name }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.status }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.phase })
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: snapshot.host.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: entry.moduleName }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: entry.enabled ? entry.fiberPhase === "failed" ? t.failed : t.active : t.disabled }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: entry.fiberPhase ?? "-" })
										] }, entry.entryId)) })]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ph-h2",
									children: t.clientSection
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ph-muted",
									children: fmt(t.clientCount, {
										total: snapshot.client.total,
										missing: snapshot.client.missingPaths
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ph-h2",
									children: t.linkSection
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									className: "dsh-ph-table",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.name }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.status }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.target })
									] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: snapshot.links.map((link) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: link.name }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: link.ok ? "dsh-ph-ok" : "dsh-ph-bad",
											children: link.ok ? t.linkOk : t.linkBad
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: "dsh-ph-muted",
											children: link.kind === "missing" ? "-" : link.target
										})
									] }, link.name)) })]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ph-section",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ph-h2",
									children: t.presetSection
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									className: "dsh-ph-table",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.id }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.status }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t.files })
									] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: snapshot.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: preset.id }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											className: preset.ok ? "dsh-ph-ok" : "dsh-ph-bad",
											children: preset.ok ? t.presetOk : t.presetBad
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: preset.files })
									] }, preset.id)) })]
								})]
							})
						] }) : null,
						snapshot === null && !loading && error === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ph-close",
							onClick: run,
							children: t.run
						}) : null
					]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-ph-entry",
				onClick: run,
				children: loading ? t.loading : t.open
			}), open ? (0, react_dom.createPortal)(card, document.body) : null] });
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-plugin-health browser half. Mounts one global React root with the
		* fixed health entry; the report overlay portals itself to document.body.
		*/
		/** Apply the browser half. */
		function apply(ctx) {
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-plugin-health";
			style.textContent = HEALTH_CSS;
			document.head.appendChild(style);
			const container = document.createElement("div");
			container.dataset.dshPluginHealth = "";
			document.body.appendChild(container);
			const root = (0, react_dom_client.createRoot)(container);
			root.render((0, react.createElement)(HealthCard));
			ctx.effect(() => () => {
				root.unmount();
				container.remove();
				style.remove();
			}, "dsh-plugin-health: ui");
		}
		//#endregion
		exports.apply = apply;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map