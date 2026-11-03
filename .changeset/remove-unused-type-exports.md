---
'theme-switch-animation': minor
---

**Breaking（仅类型面）**：移除 11 个仓内与公开面均无消费的类型导出——`ShapeAnimationType`、`MaskGeometry`、`Point`、`QrGridMaskSpec`、`Size`、`BuildAnimationCSSParams`、`DomUpdateResult`、`RunThemeTransitionParams`、`RunThemeTransitionResult`、`StoredTheme`、`WaitForThemeSyncOptions`。它们仍是内部实现的一部分（多为公开函数的参数/返回值签名），结构类型推断不受影响，仅不能再从包入口按名 `import type`。运行时行为与全部值导出零变化。0.x 阶段按 minor 承载破坏性变更（沿 0.2.0 删四向类型、0.4.0 删 `CIRCLE_REVERT` 的先例）。
