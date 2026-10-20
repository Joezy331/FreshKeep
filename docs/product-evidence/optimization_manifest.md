# FreshKeep 优化 · 交付清单与复核建议（Optimization Manifest）

> 生成日期：2026-10-19 ｜ 对应任务：产品体验优化与功能迭代（审计→修证据→重跑测试→交付）

---

## 一、本次修改文件清单（真实改动）

| 文件 | 类型 | 说明 |
|------|------|------|
| `services/food/fridge.ts` | 代码 | 撤销 D4 合并，恢复批次独立；保留 D1/D2 |
| `tools/product-evidence-tests.mjs` | 脚本 | 重构测试（S13/S14/S16/R06 备注一致；新增 S21–S26、N01–N05；输出 meta+log） |

## 二、测试与证据文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `storage_rule_test_results.csv` | 数据 | 26 例，26 通过 |
| `recipe_test_results.csv` | 数据 | 20 例，20 通过 |
| `reminder_test_results.csv` | 数据（新增） | 5 例，5 通过 |
| `recognition_test_results.csv` | 数据 | 未执行（缺密钥，模板） |
| `test_run_meta.json` | 元数据（新增） | 命令/时间/环境/各套件通过数/类型 |
| `test_run_log.txt` | 日志（新增） | 原始 stdout + 退出码 |
| `tools/pack_evidence.py` | 工具 | 合并/打包证据给 ChatGPT（前序） |

## 三、文档交付清单（9 份，含更新）

| # | 文件 | 状态 | 说明 |
|---|------|------|------|
| 1 | `optimization_audit.md` | 新增 | 现状审计、功能边界、风险清单 |
| 2 | `optimization_changelog.md` | 新增 | 改了什么/为什么/如何验证 |
| 3 | `final_test_report.md` | 新增 | 命令/环境/结果/S13-S16/R06 核验 |
| 4 | `storage_rule_test_results.csv` | 更新 | 26/26 |
| 5 | `recipe_test_results.csv` | 保持 | 20/20 |
| 6 | `capability_boundary.md` | 新增 | 真实 API/Mock/规则/逻辑提醒/推送/用户数据 边界 |
| 7 | `analytics_spec.md` | 更新 | 任务建议事件对照 + 5 指标口径（仅设计） |
| 8 | `resume_evidence.md` | 更新 | 计数改 26/20/5 + D4 更正 |
| 9 | `optimization_manifest.md` | 新增 | 本文件 |

> 其余既有文档同步：`test_plan.md`（总览/缺陷表 D4/用例）、`project_audit.md`（行 6/9）、`iteration_backlog.md`（P2-1）、`README.md`（计数）。

## 四、未完成事项（如实列出）

| 项 | 依赖 | 下一步 |
|----|------|--------|
| 百度菜品识别端到端验证 | 轮换有效 Key + 30–50 张测试图 | 到百度控制台轮换；跑 `recognition_test_results.csv` |
| 微信订阅消息真实推送（D6） | 订阅消息资质 + 定时任务 + 真机 | 列入 P0 后续 |
| 库存状态/位置筛选（P1-1） | `filterIngredients` 扩展 + UI | 下轮 |
| 食材模型补 生产日期/保质期（P1-2） | `types/ingredient.ts` + 录入表单 | 下轮 |
| 浪费复盘/丢弃记录（P2-1） | 新增 `discard` 模型 + profile | 下轮 |
| 真实用户实验 | 招募 5–8 人 | 下轮 |

## 五、复核建议

1. **重跑命令**：`node --experimental-strip-types --import ./tools/hooks.mjs tools/product-evidence-tests.mjs`，应得到 51/0 + 识别未执行。
2. **核对边界**：对外表述以 `capability_boundary.md` 为准，避免把 Mock/规则/逻辑层包装成已验证能力。
3. **密钥安全**：百度 Key 仅本地，历史密钥已移除；生产环境务必后端代理（不留在前端）。
4. **D4 已更正**：简历/文档不得再提"去重合并"，应表述为"批次独立管理"。
