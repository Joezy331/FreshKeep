# FreshKeep 优化 · 修改记录（Optimization Changelog）

> 记录本轮（2026-10-19）实际改动：改了什么文件、为什么、如何验证。仅记录真实改动，无虚构。

---

## 修改文件清单

| 文件 | 改动类型 | 改动说明 | 验证方式 |
|------|---------|---------|----------|
| `services/food/fridge.ts` | 修改 | 撤销"D4 同名合并"，恢复批次独立；保留 D1/D2 修复逻辑 | 重跑测试 S16/S21/S22 通过 |
| `tools/product-evidence-tests.mjs` | 修改 | 重构测试：S13/S14/R06 备注改为"已修复"；S16 改为批次独立断言；新增 S21–S26、N01–N05 | `node … tools/product-evidence-tests.mjs` |
| `docs/product-evidence/storage_rule_test_results.csv` | 覆盖 | 26 行（原 20 行），S13/S14/S16 备注与结果一致 | CSV 复核 |
| `docs/product-evidence/recipe_test_results.csv` | 未改 | 仍为 20/20（R06 已修复） | grep R06 |
| `docs/product-evidence/reminder_test_results.csv` | 新增 | 5 行提醒逻辑测试（N01–N05） | 重跑通过 |
| `docs/product-evidence/test_run_meta.json` | 新增 | 命令/时间/环境/各套件通过数/类型 | 随脚本生成 |
| `docs/product-evidence/test_run_log.txt` | 新增 | 原始 stdout + 退出码 | 随脚本生成 |
| `docs/product-evidence/optimization_audit.md` 等 9 份 | 新增/更新 | 见 `optimization_manifest.md` | — |

---

## 逐项改动与动机

### 1. 撤销"D4 去重合并"（关键更正）
- **原状**：上一轮在 `addIngredient` 中按归一名查重并合并数量。
- **问题**：破坏"同名不同批次独立"语义（用户需求 §五.2、竞品批次管理）。修改一个批次会误伤另一个；且"去重"本身是错误预期。
- **改法**：删除合并分支，每次录入生成独立 `id` 批次；增加批次语义注释。
- **验证**：S16（两批独立）、S21（编辑 A 不影响 B）、S22（消耗 A 不影响 B）全部通过。

### 2. 保留并核验 D1/D2/D3（上一轮修复，本轮回归确认）
- D1：改购买日期重算最佳食用期（S13 通过）。
- D2：改保存方式同步分区（S14 通过）。
- D3：菜谱别名归一（R06 通过）。

### 3. 测试证据一致性修复（本轮重点）
- 过去 CSV 备注仍写"缺陷:…"但结果=通过，产生冲突。本轮将备注改为"已修复(Dx)：…（回归通过）"，并新增 S21–S26 / N01–N05 把隐含逻辑显式化。
- 区分测试类型：保鲜/菜谱/提醒为**真实模块单元测试**；识别为**真实 API 调用**，因缺密钥标记为"未执行"，不计入通过数。

### 4. 未改动的"众所周知"项
- 百度识别真实调用代码（`scan.ts`）与 Mock/LLM 兜底未动；密钥仍本地，无硬编码。
- 微信订阅消息（D6）未接入，如实保留"逻辑层提醒"描述，未宣称已推送。
- 首页/库存 UI 未大幅改版（按用户要求）。

---

## 风险与注意事项
- `computeStats().kinds` 当前计的是批次数；UI 已用"批次数"语义展示，命名歧义留待 P1 澄清。
- 历史"D4 已修复"的旧表述在本轮文档中已更正为"已撤销/非缺陷"，避免误导。
