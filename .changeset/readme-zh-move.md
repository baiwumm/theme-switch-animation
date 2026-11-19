---
"theme-switch-animation": patch
---

修正 npm 包页显示的语言：中文 README 移到 `docs/README.zh-CN.md`。0.6.1 把中英两份都放在包根目录，npm registry 把 `README.zh-CN.md` 误当成包页 readme（线上显示的是 228 行中文版）；挪进 `docs/` 后 tarball 只含英文 `README.md`，中文全文仍随仓库提供。
