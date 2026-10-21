# FreshKeep 全量迭代报告（A–F）

> 迭代范围：AI 食材识别升级 + 30 模拟用户 + 30 图片测试集 + 库存业务闭环
> 报告日期：2026-10-21 · 仓库：`origin/main`
> 格式：A 现状 / B 改造 / C 测试 / D 缺口 / E 复现 / F 结论

---

## A. 现状与已交付

| 层 | 状态 | 证据 |
|---|---|---|
| 识别链路 | ✅ 双通道 + 候选数组 + 集中式归一化 | `services/ai/recognition-core.ts`、`pages/scan/scan.ts` |
| 知识库 | ✅ 87 条 / 10 类（原 28 → +39 → +20） | `data/food-database.ts` |
| 埋点 | ✅ 8 个 `ingredient_*` + `ingredient_consumed` | `types/user.ts`、`fridge.ts` |
| 批次模型 | ✅ 同名独立批次、不合并 | `services/food/fridge.ts` |
| 单元测试 | ✅ 识别 17/17 + 库存回归 17/17 + 产品证据 26/26/20/20/5/5 | `tools/*.mjs` |
| 模拟数据 | ✅ 30 用户 / 191 批次 / 197 事件 | `data/synthetic_*.json` |
| 图片测试集 | ✅ 30 ground-truth 行（真实图/API 未执行） | `data/recognition_samples.csv` |
| 导入工具 | ✅ dry-run/幂等/回滚/仅 synthetic_test | `scripts/import_synthetic_data.mjs` |

---

## B. 本轮改造清单

| 任务 | 改造 | 文件 | 影响 |
|---|---|---|---|
| #30–#36 | 识别专项优化（候选数组/双通道/归一化/埋点/67→87 条） | `scan.ts`/`ingredient.ts`/`recognition-core.ts`/`food-database.ts` | 已推送 `f12c7f5` |
| #37 | 迭代审计 + 最小改造计划 | `docs/iteration-audit.md` | 纯文档 |
| #38 | 知识库 +20 条（87 总计） | `data/food-database.ts` | — |
| #39 | 埋点对齐 `ingredient_*` | `types/user.ts`/`scan.ts`/`ingredient.ts`/`fridge.ts` | — |
| #40 | 生成 30 模拟用户+库存+事件 | `scripts/generate_synthetic_data.mjs` → `data/synthetic_*.json` | 新增 |
| #41 | 30 图片 ground-truth + 诚实缺口 | `data/recognition_samples.csv`/`scripts/fetch_recognition_images.mjs`/`manifest.json` | 新增 |
| #42 | 安全导入工具 | `scripts/import_synthetic_data.mjs` | 新增 |
| #43 | 库存业务闭环回归 17 场景 | `tools/inventory-regression-tests.mjs` → `docs/testing/inventory_regression_results.csv` | 新增 |
| #44 | 数据字典/生成报告/识别报告/迭代报告/README | `data/*.md`/`docs/**`/`README.md` | 文档 |
| #45 | 提交并推送全部交付物 | git | — |

---

## C. 测试结果汇总

| 测试套件 | 命令 | 结果 |
|---|---|---|
| 识别核心单测 | `tools/recognition-tests.mjs` | **通过 17 / 0 失败**（真实 API 行标记未执行） |
| 库存业务回归 | `tools/inventory-regression-tests.mjs` | **17/17 全绿**（含 S13/S14/S16/R06 复跑） |
| 产品证据回归 | `tools/product-evidence-tests.mjs` | 26/26/20/20/5/5 全绿 |
| 模拟数据生成 | `scripts/generate_synthetic_data.mjs` | 30 用户 / 191 批次 / 197 事件 ✅ |
| 安全导入 | `scripts/import_synthetic_data.mjs --apply` | 写入 30/191/197；二次幂等无重复；`--rollback` 可还原 ✅ |
| 图片测试集 | `scripts/fetch_recognition_images.mjs --no-download` | 30 行 ground-truth；0 下载（诚实未执行） |

---

## D. 诚实缺口（Honest Gaps）

| 缺口 | 原因 | 处理 |
|---|---|---|
| 30 张真实食材照片 | 环境网络被屏蔽，无法下载 | CSV + manifest 占位，`未执行`，未伪造任何图片二进制 |
| 百度/视觉真实识别 | 无可用密钥 + 网络屏蔽 | `recognition_samples.csv` 每行 `real_api_status=未执行` |
| 真实识别准确率 | 无真实 API 执行 | **不声称**准确率提升，仅交付可复跑测试框架 |
| 真实用户留存/减浪费 | 无真实用户 | 全部 `synthetic_test`，报告明确「不代表真实用户」 |
| 密钥 | 安全红线 | 全部来自本地存储，无硬编码；已写 `.gitignore` |

> 全程**未把 Mock 当真实**、**未虚构用户数据/准确率**。所有「未执行」均显式标注。

---

## E. 如何复现

```bash
# 1) 识别单测
node --experimental-strip-types --import ./tools/hooks.mjs tools/recognition-tests.mjs

# 2) 库存业务回归
node --experimental-strip-types --import ./tools/hooks.mjs tools/inventory-regression-tests.mjs

# 3) 生成 30 模拟用户（可复现，种子 20261021）
node --experimental-strip-types --import ./tools/hooks.mjs scripts/generate_synthetic_data.mjs --base-date 2026-10-21

# 4) 导入（dry-run → apply → verify → 可选 rollback）
node --experimental-strip-types --import ./tools/hooks.mjs scripts/import_synthetic_data.mjs
node --experimental-strip-types --import ./tools/hooks.mjs scripts/import_synthetic_data.mjs --apply
node --experimental-strip-types --import ./tools/hooks.mjs scripts/import_synthetic_data.mjs --verify

# 5) 图片测试集（联网环境去掉 --no-download 才会真实下载）
node --experimental-strip-types --import ./tools/hooks.mjs scripts/fetch_recognition_images.mjs --no-download
```
> 关键：所有 `.mjs` 必须 `--import ./tools/hooks.mjs`（解析 `.ts` 内部依赖）。

---

## F. 结论与下一步

**已完成（本轮目标）**：识别架构升级、可测试性补齐、30 模拟用户闭环、30 图片 ground-truth、
安全导入/回滚、17+17 真实回归全绿、全部交付物文档化，且所有真实缺口诚实标记并区分 Mock/真实。

**下一步（需联网 + 密钥）**：
1. 在联网环境跑 `fetch_recognition_images.mjs` 真实下载 30 图，并把 `real_api_status` 改为真实结果；
2. 配置百度/视觉密钥后，对 `recognition_samples.csv` 执行真实识别，得出**真实准确率**；
3. 接入真实用户行为（留存/减浪费）后再声称业务效果；
4. 二期评估切换百度 `ingredient` 接口或真实视觉模型，提升 `known` 命中率。
