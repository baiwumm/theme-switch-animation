---
"theme-switch-animation": patch
---

README 拆成英文精简版 + 中文全文两份：`README.md` 改为英文（GitHub 与 npm 默认展示，npm 只渲染这一份），原中文全文移入 `README.zh-CN.md`，两份顶部各带语言切换。英文版只保留稳定骨架（安装 / 最小示例 / 类型表 / options 表 / 契约），0.1.x / 0.2.0 / 0.3.x 迁移历史与逐类参数细节只留在中文版。包内容新增 `README.zh-CN.md`，`verify:package` 白名单同步放行。
