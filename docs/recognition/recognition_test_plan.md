# FreshKeep 拍照识别能力 · 测试计划

> 测试策略核心：**严格区分「逻辑层单元测试」与「真实模型 API 调用」**，绝不把 Mock 当真实模型，绝不伪造准确率。

---

## 1. 测试分层

| 层 | 是否真实执行 | 运行方式 | 覆盖 |
|----|--------------|----------|------|
| 识别逻辑层（unit-logic） | ✅ 真实执行项目纯函数 | `tools/recognition-tests.mjs`（Node + `--experimental-strip-types`） | 归一化、候选构建、置信度、去重、降级判定、知识库完整性 |
| 保鲜/临期/菜谱/提醒（既有） | ✅ 真实执行项目模块 | `tools/product-evidence-tests.mjs` | S13/S14/S16（批次与重算）、R06（别名归一）等 |
| 真实模型 API（real-api） | ❌ 未执行（无密钥） | 需百度 / AI Key + 联网 | 百度菜品识别、本地 Cline 网关视觉模型 |

---

## 2. 识别逻辑层用例清单（`recognition_test_results.csv`）

| ID | 场景 | 期望 |
|----|------|------|
| R-01~R-06 | `normalizeFoodName` 别名归一 / 未命中不强制映射 / 空输入兜底 / 已知直出 | canonical 与 known 正确 |
| R-07~R-10 | `buildCandidatesFromBaidu` 多候选去重 / 空结果 / 脏数据 / 未命中偏置 | 候选数组与置信度正确 |
| R-11~R-14 | `clampConfidence` 百分制 / 非法兜底 / 正常 / 异常封顶 | 0~1 区间与边界正确 |
| R-15~R-16 | `normalizeCandidates` 再归一 / 去重 | 知识库分类为准、去重生效 |
| R-17 | 9 个真实分类齐备（「其他」为兜底不要求入库） | 分类完整 |

---

## 3. 真实模型测试（待补充，当前未执行）

- **前置条件**：在「我的」页管理员模式配置百度 Key，或配置本地 Cline 网关 Key。
- **数据集**：构建一组固定样本图（含单食材 / 多食材 / 相似候选 / 模糊图 / 非食材图），每张标注真实标签。
- **判定**：调用真实接口 → 比对候选数组 top-1 是否命中、known 是否正确、`fallback` 标记是否如实。
- **记录**：结果写入 `recognition_test_results.csv` 的 `real-api` 行，`测试类型` 列明确标注，不混入 `unit-logic` 统计。
- **红线**：无 Key 时该部分**只占位、不执行**，绝不编造通过率。

---

## 4. 回归保障

- 每次改动识别相关代码后，必须重跑 `tools/recognition-tests.mjs` 与 `tools/product-evidence-tests.mjs`；
- S13/S14/S16/R06 为关键回归用例，验证批次独立、到期重算、别名归一未被破坏；
- 任何「识别成功率 / 准确率」对外宣称，必须以 `real-api` 真实执行为依据，否则标注「未经验证」。

---

## 5. 运行命令

```bash
# 识别逻辑层（真实）
node --experimental-strip-types --import ./tools/hooks.mjs tools/recognition-tests.mjs

# 保鲜/临期/菜谱/提醒（真实）
node --experimental-strip-types --import ./tools/hooks.mjs tools/product-evidence-tests.mjs
```
