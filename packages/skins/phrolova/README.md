# @linxin666/dsh-client-ui-skin-phrolova

Phrolova skin for the dsh web GUI — 紫海暮色与夜玫微光的双面角色主题：亮态是暮色紫色
花海，暗态是黑紫暗夜里一朵发光的红玫瑰，玫瑰红为整套皮肤的点睛色。

Hot-pluggable as a client plugin in the official standalone bundle shape:
`apply()` sets the `data-dsh-phrolova` body attribute (the scope of the whole
stylesheet), renders the chrome, and pins the document title; its effect
disposer retracts every write. The stylesheet rides the bundle's CSS-modules
auto-inject, so the loader removes it with the entry.

The skin is presentation-only: no services are injected, no cordis events are
emitted, and nothing reaches a model request.

## Installing (official bundle)

1. Local path: `dsh plugin --profile <name> add /path/to/dsh-web-ui/packages/skins/phrolova`
2. Git: `dsh plugin --profile <name> add github:<org>/dsh-web-ui#<sha>` —
   pnpm ≥10 asks once for `allowBuilds` authorization (the `prepare` script
   self-containedly builds `lib/`; no monorepo reference needed).
3. Switch with `scripts/dsh-skin` (`dsh-skin use phrolova`); only one skin is
   ever active at a time.

## Building and testing

```sh
pnpm build   # tsdown: lib/index.js + lib/client.js (self-contained preset)
pnpm test    # vitest: apply/dispose contract spec
```

## Publishing to the skin center

```sh
node scripts/skin-center-bundles    # re-embed this skin into skin-center's registry
pnpm --filter @linxin666/dsh-client-ui-skin-center build
node scripts/gallery-build          # refresh the gallery manifest/bundles
node scripts/capture-previews       # re-shoot preview/light.png + preview/dark.png
```

Then commit everything (lib/, preview/, regenerated registry/gallery) and open a PR.
