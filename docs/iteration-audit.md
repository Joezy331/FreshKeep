# FreshKeep 全量迭代审计 · 改造计划（A–F）

> 文档定位：对「AI 食材识别升级 + 30 模拟用户 + 30 图片测试集 + 库存业务闭环」这一轮迭代的
> **现状审计 + 最小改造计划**。本文与 `docs/recognition/recognition_audit.md`（识别链路专项审计）
> 互为补充，本文聚焦「本轮 10 阶段大 Prompt」的整体可行性与诚实缺口。
> 生成时间：2026-10-21 · 数据版本：`fk-synthetic-v1`

---

## A. 现状（Audit · 已核实）

| 维度 | 现状 | 证据 |
|---|---|---|
| 识别链路 | `pages/scan/scan.ts` 已实现 **双通道**（百度 `top_num=3` → 可插拔 `recognizeImage` 降级），候选数组化 | `services/ai/recognition-core.ts`、`scan.ts` |
| 知识库 | `data/food-database.ts` 已扩至 **87 条**（原 28 + #31 的 39 + #38 的 20），含 `normalizeFoodName` 与 `INGREDIENT_CATEGORIES` | `food-database.ts` |
| 埋点 | 8 个 `ingredient_*` 事件已对齐；`ingredient_consumed` 已在 `fridge.consumeIngredient` 发射 | `types/user.ts`、`scan.ts`、`ingredient.ts`、`fridge.ts` |
| 批次独立性 | `addIngredient` 每次录入 = 独立批次（不合并）；`updateIngredient` 支持 D1/D2 重算 | `services/food/fridge.ts` |
| 单元测试 | 识别核心 17/17 通过；产品证据回归 26/26/20/20/5/5 全绿 | `tools/recognition-tests.mjs` |
| 模拟数据 | 30 用户 / 191 批次 / 197 事件 已生成（种子可复现） | `data/synthetic_*.json` |
| 密钥安全 | 百度/AI Key 全部来自本地存储，**无硬编码** | `scan.ts`、`utils/storage` |

---

## B. 问题（Problems）

1. **真实图片测试集无法落地**：当前环境 **网络被屏蔽**（`curl` 超时），无法下载 30 张真实食材照片；
   百度/AI 视觉 API 因无可用 Key 也**未执行**。
2. **已消耗批次未形成推荐隔离验证**：生成器已把 consumed 批次移出有效库存，但缺一个回归测试证明
   「已消耗食材不污染临期提醒 / 推荐」。
3. **导入工具缺失**：`data/synthetic_*.json` 已生成，但没有「安全导入小程序本地存储」的脚本
   （需保证 dry-run、幂等、仅 `synthetic_test`、可回滚）。
4. **识别→库存闭环缺少端到端回归**：候选数组确认后写入库存的全链路，仅有人工 code review，缺可复跑测试。

---

## C. 根因（Root Cause）

- **C1 网络/Key 缺失**（环境限制，非代码缺陷）：无法下载真实图、无法调真实 API。→ 按 Prompt §4.2
  诚实保留图片占位 + 标准标签 + 测试模板，真实测试标记 `未执行`，**不虚构返回结果**。
- **C2 测试资产分散**：识别单测、产品证据、合成数据三者各自独立，缺少把「合成库存」接入
  `fridge` 业务逻辑做回归的统一入口。

---

## D. 最小改造方案（Minimal Changes）

| # | 改造 | 文件 | 说明 | 影响范围 |
|---|---|---|---|---|
| D1 | 30 图片 ground-truth 表 + 拉取脚本（诚实缺口） | `data/recognition_samples.csv`、`scripts/fetch_recognition_images.mjs` | 仅描述 + 占位，不伪造图 | 新增，零风险 |
| D2 | 安全导入工具 | `scripts/import_synthetic_data.mjs` | dry-run / 幂等（user_id+batch_id）/ 仅 synthetic_test / 备份回滚 | 新增，零风险 |
| D3 | 业务回归测试 | `tools/inventory-regression-tests.mjs` | 17 场景 + 复跑 S13/S14/S16/R06 → CSV | 新增，零风险 |
| D4 | 数据字典 + 生成报告 + 迭代报告 | `data/data_dictionary.md`、`data/data_generation_report.md`、`docs/testing/iteration_report.md` | 纯文档 | 新增 |
| D5 | README 更新 | `README.md` | 识别配置 / Mock vs 真实 / 跑测试 / 生成用户 / 导入 / 切换用户 / 回滚 / 已完成 vs 待验证 | 文档 |

> **硬约束遵守**：不改动与本轮无关的业务模块；不删除既有功能；**不硬编码任何密钥**；
> 真实图片/真实 API 一律标记 `未执行`，绝不把 Mock 当真实结果呈现。

---

## E. 诚实缺口（Honest Gaps）

| 缺口 | 原因 | 处理 |
|---|---|---|
| 30 张真实食材照片 | 网络屏蔽，无法下载 | `data/recognition_images/` 仅放 manifest，`samples.csv` 标 `未执行` |
| 百度/AI 真实识别 | 无可用 Key + 网络屏蔽 | `recognition_samples.csv` 每行 `real_api_status=未执行` |
| 真实识别准确率 | 无真实 API 执行 | 不声称准确率提升；只交付可复跑测试框架 |
| 真实用户留存/减浪费 | 无真实用户 | 全部为 `synthetic_test`，报告明确「不代表真实用户」 |

---

## F. 验收标准（Acceptance）

- [x] F1 识别链路双通道 + 候选数组 + `ingredient_*` 埋点（#31–#36 已交付并推送）
- [x] F2 知识库覆盖扩展至 87 条（#38）
- [x] F3 30 模拟用户 + 库存 + 事件生成（#40，种子可复现）
- [ ] F4 30 图片 ground-truth 表 + 拉取脚本（诚实缺口标记）
- [ ] F5 安全导入工具（dry-run/幂等/回滚）
- [ ] F6 17 场景业务回归 + S13/S14/S16/R06 复跑
- [ ] F7 数据字典/生成报告/迭代报告 + README
- [ ] F8 提交并推送全部交付物（无硬编码密钥）

> F1–F3 已落地；F4–F8 为本轮剩余交付，逐一执行后再统一 commit/push。
