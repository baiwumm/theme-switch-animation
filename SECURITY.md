# Security Policy

`theme-switch-animation` 是本机运行的浏览器库：没有服务端、没有账号体系、不发起网络请求，
唯一的落盘是 `localStorage` 里的主题字符串（`THEME_STORAGE_KEY`）。因此安全面很窄，但库会
把使用方传入的选项拼进注入到页面的 `<style>`，这块值得认真对待。

## 报告漏洞

**请不要为安全问题开公开 issue 或 PR。** 走 GitHub 私密漏洞报告：

https://github.com/baiwumm/theme-switch-animation/security/advisories/new

请写明：受影响的版本、框架（React / Vue / Next.js / Nuxt）、复现步骤、以及你预期的
影响面。PoC 里请使用伪造数据，不要贴真实站点的凭证或用户数据。

这是个人维护的项目，响应是尽力而为的：收到后会在 advisory 里给确认，修复前请留出
时间，不要在未协调的情况下公开细节。

## 范围

**在范围内**：

- 选项值拼接进注入样式后的逃逸面（`easing`、`darkClassName` 等透传进 CSS 的字符串）
- 非受控模式的 `localStorage` 读写与 `<html>` 类名观察（`observeThemeClass`）导致的状态污染
- 受控模式 / SSR 场景下 `runThemeTransition`、`waitForThemeSync` 的竞态与拒绝处理
- 发布产物本身：`dist` 里的代码与 `package.json` 的 `exports` / `peerDependencies` 声明
  不一致、误带非预期文件

**不在范围内**：

- 动画观感问题（末帧残留、边缘锯齿、模糊强度、某个类型辨识度不够）——这些是 issue 与
  `docs/animation-roadmap.md` 的事，不是安全漏洞
- 浏览器不支持 View Transitions 导致的降级行为（设计上就是直接切换，状态永远正确）
- 使用方自己在页面里写进 XSS、或把不可信输入直接喂给 `darkClassName` / `easing`
  之外的业务逻辑
- 依赖链上的通用漏洞——请走 Dependabot / `npm audit`，本仓库的 `dependencies` 为空

## 受支持的版本

只有**最新发布的 minor 版本**接收安全修复。0.x 阶段没有 LTS 分支，修复以新版本发布后走
正常升级路径，不单独回补旧版本。
