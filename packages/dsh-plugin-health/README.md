# dsh-plugin-health

一键检查当前 DSH Web 部署里的插件是否正常运行。

## 检查内容

- **宿主插件**：读取官方 `pluginInventory`，列出每个插件的启用状态与 Fiber 阶段（active / failed / disabled）
- **客户端插件**：读取 `clientModules` 图，统计浏览器 bundle 数量与缺失路径
- **本地包链接**：检查 web profile 中常用 `@linxin666` 包是否仍是本地链接，防止 `pnpm install` 回滚成 npm 旧版
- **Agent 预设**：检查 `~/.dsh/.agent-presets` 下每个预设是否有 `agent.cordis.yml`，以及是否残留旧版 `../preset/` 引用

## 使用

- 浏览器右上角出现「插件体检」按钮
- 点击后从 `/api/plugin-health/check` 拉取快照，在毛玻璃面板中展示结果
- 所有问题会集中在顶部列出，绿色表示全部正常

## 开发

```sh
pnpm --filter @linxin666/dsh-plugin-health build
pnpm --filter @linxin666/dsh-plugin-health typecheck
pnpm --filter @linxin666/dsh-plugin-health test
```

## 部署

```sh
dsh plugin --profile web add link:<repo>/packages/dsh-plugin-health
# 重启 DSH Web Host 后刷新页面
```
