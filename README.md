# 🌗 theme-switch-animation

[![npm version](https://img.shields.io/npm/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![npm downloads](https://img.shields.io/npm/dm/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/theme-switch-animation.svg)](https://bundlephobia.com/package/theme-switch-animation)
[![node](https://img.shields.io/node/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![CI](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/baiwumm/theme-switch-animation/blob/main/LICENSE)

**[English](https://github.com/baiwumm/theme-switch-animation/blob/main/README.md) · [中文](https://github.com/baiwumm/theme-switch-animation/blob/main/docs/README.zh-CN.md)**

Theme switching, but as an animation: the new theme is revealed over the old one by a mask — a
circle, a polygon, blinds, a ripple, a clock sweep, a curtain — instead of a hard flip. Built on the
browser's [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).
15 animation types, 10 of them support `reverse`. React 18+, Vue 3+, Next.js (App Router), Nuxt 3+.

<p align="center">
  <a href="https://v.douyin.com/Wz6_MZOcwOE/">
    <img src="https://raw.githubusercontent.com/baiwumm/theme-switch-animation/main/assets/video/theme-switch-animation-promo-cover-16x9.png" width="760"
         alt="theme-switch-animation promo video (57s)" />
  </a>
</p>

> 📚 **Full documentation** — https://theme-switch-animation.baiwumm.com (install guide, a gallery you
> can play with, every parameter and the FAQ; the site is currently Chinese-only).
> Migration notes for 0.1.x / 0.2.0 / 0.3.x live in the [Chinese README](https://github.com/baiwumm/theme-switch-animation/blob/main/docs/README.zh-CN.md).

## ✨ Features

- 🔀 **Cross-framework** — one framework-agnostic core, thin adapters: React hook, Vue composable, Nuxt module with auto-imports.
- 🎨 **15 mask animations** — circle / polygon family, strips, scan, cell grid, ripple, clock sweep, fan, curtain; see the table below.
- 🔌 **Controlled mode** — works with `next-themes` and `@nuxtjs/color-mode`; the library never owns your theme state.
- 🔄 **Multi-instance & cross-tab sync** — in uncontrolled mode `isDark` mirrors the `<html>` class; other tabs sync over `storage`.
- 🛟 **Graceful degradation** — no View Transitions, SSR, or `prefers-reduced-motion: reduce` → instant switch, state always correct.

## 📦 Install

```bash
pnpm add theme-switch-animation
```

## 🚀 Quick start

### ⚛️ React / Next.js (client component)

```tsx
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

export function ThemeToggle() {
  const { ref, toggleTheme, isDark, finished } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
    reverse: 'auto', // darken: expand from the trigger, lighten: collapse into it
  })
  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

`finished` resolves when the current transition ends (immediately when degraded; it never rejects).

### 🔌 Controlled mode (`next-themes`)

```tsx
const { resolvedTheme, setTheme } = useTheme() // next-themes
const { ref, toggleTheme } = useThemeAnimation({
  isDark: resolvedTheme === 'dark',
  onChange: (next) => setTheme(next ? 'dark' : 'light'),
  reverse: 'auto',
})
```

The library does not touch `localStorage` or the `<html>` class; it waits for your theme system to
write the DOM before taking the screenshot, and falls back to an instant switch if that takes longer
than 300 ms.

### 💚 Vue 3

```vue
<script setup lang="ts">
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
  animationType: ThemeAnimationType.CIRCLE,
})
</script>

<template>
  <button ref="triggerRef" @click="toggleTheme">{{ isDark ? '🌙' : '☀️' }}</button>
</template>
```

### 💚 Nuxt 3+

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['theme-switch-animation/nuxt'],
})
```

`useThemeAnimation`, `ThemeAnimationType`, `SKIP_TRANSITION`, `observeThemeClass` and
`THEME_STORAGE_KEY` are auto-imported.

## 🎬 Animation types

| Types | What it looks like | Options |
| --- | --- | --- |
| `CIRCLE` / `CIRCLE_BLUR` | Circle expanding from the trigger element (optionally with a blurred edge) | `reverse`, `blurAmount` |
| `SQUARE` / `DIAMOND` / `RECTANGLE` / `TRIANGLE` | Polygon expanding from the trigger element | `reverse` |
| `HEXAGON` / `STAR` | Polygon expanding from the trigger element | — |
| `BLINDS` / `SCAN` / `QR_GRID` | Slats opening, hard-edge scan with a light beam, cell grid | `direction`, `slatWidth`, `cellSize`, `cellShape` |
| `RIPPLE` | Water surface with a wave band and two decaying rings | `waveWidth`, `reverse` |
| `CLOCK_SWEEP` | Conic sweep from 12 o'clock; `reverse` sweeps counter-clockwise | `reverse` |
| `FAN` | Wedge blades opening from the hub; `reverse` closes them | `bladeCount`, `reverse` |
| `CURTAIN` | Both halves push out from the center; `reverse` closes them | `direction` (axis), `reverse` |

`reverse` is `boolean | 'auto'`: `'auto'` expands when darkening and collapses when lightening. It is
orthogonal to `direction` (which decides the axis) and applies to the 10 types marked above.

## 🧩 API

### `useThemeAnimation(options)`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `animationType` | `ThemeAnimationType` | `CIRCLE` | one of the 15 types |
| `duration` | `number` | `750` | milliseconds |
| `easing` | `string` | `'ease-in-out'` | any CSS timing function, `linear()` included |
| `reverse` | `boolean \| 'auto'` | `false` | 10 types; ignored by the rest |
| `direction` | `'ltr' \| 'rtl' \| 'ttb' \| 'btt'` | `'ltr'` | `BLINDS` / `SCAN` / `QR_GRID`, plus the axis of `CURTAIN` |
| `darkClassName` | `string` | `'dark'` | matches the next-themes / color-mode default |
| `isDark` + `onChange` | — | — | both present → controlled mode |

Type-specific: `blurAmount` (2), `slatWidth` (72, 16–200), `cellSize` (64, 16–200), `cellShape`
(`'square' | 'dot'`), `waveWidth` (18, 8–60), `bladeCount` (8, 4–16 integer). Unknown or
out-of-range values silently fall back to the default.

Returns `{ ref, toggleTheme, isDark, finished }` — Vue exposes `triggerRef`, and `isDark` /
`finished` are refs there.

### Lower-level exports

`runThemeTransition` (return `SKIP_TRANSITION` when the new DOM is not ready), `waitForThemeSync`,
`observeThemeClass`, `supportsViewTransition`, `prefersReducedMotion`, `shouldSkipTransition`,
`THEME_STORAGE_KEY`. Mask geometry builders are exported too, for SSR pre-injection and custom
animations.

## ✅ Requirements

Full animation on Chrome / Edge 111+, Safari 18+, Firefox 144+. Everywhere else — and with
`prefers-reduced-motion: reduce` — the theme still switches, it just does not animate.

## 📄 License

[MIT](https://github.com/baiwumm/theme-switch-animation/blob/main/LICENSE)
