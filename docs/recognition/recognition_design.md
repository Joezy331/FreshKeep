# FreshKeep 拍照识别能力 · 专项设计文档

> 配套：`recognition_audit.md`（现状审计）、`recognition_test_plan.md`（测试计划）、`recognition_test_results.csv`（真实执行结果）、`recognition_iteration_report.md`（迭代结论）。
> 设计原则（取自优化 Prompt）：**先解决识别结果不可靠，再追求识别品类扩张；先建立真实测试证据，再声称效果提升。**

---

## 1. 目标与约束

- **目标**：系统提升拍照识别的覆盖度、候选确认可靠性、分类准确度、失败兜底与可测试性。
- **硬约束**：
  - 不破坏其它业务流程（入库/批次/提醒/推荐保持原样）；
  - 不写死任何密钥（百度 / AI Key 全部来自本地存储）；
  - 不伪造识别准确率 / 真实用户数据 / 把 Mock 当真实模型；
  - 识别与库存解耦（识别只写 `KEYS.PENDING`，确认页才入库）。

---

## 2. 处理流程（解耦后的清晰链路）

```
图片输入
  → 模型调用（百度优先；无 Key / 异常 / 无结果 → 可插拔引擎降级）
  → 结果解析（候选数组，非 Top-1）
  → 名称归一化（集中式 normalizeFoodName）
  → 候选结果展示（确认页，可逐条去噪 / 改名）
  → 用户确认 / 修改
  → 正式入库（addIngredient）
```

---

## 3. 集中式分类与别名系统

- 新增 `normalizeFoodName(raw)`（`data/food-database.ts`）：别名 → 标准名，未命中**不强制**归为「其他」，而是保留原名称并透出 `known:false`。
- 新增 `INGREDIENT_CATEGORIES`（10 个，与 `types/ingredient.ts` 的 `IngredientCategory` 对齐）。
- 知识库从 28 条扩充到 67 条（纯新增，不改动既有 28 条），覆盖叶菜细分、根茎、瓜果、更多水果、菌菇、肉类部位、水产、蛋奶、主食半成品。
- `RecognizedItem` 增加可选字段 `known?: boolean`，用于在确认页高亮「未在知识库，请确认」。

---

## 4. 识别结果 = 候选数组（解决 Top-1 缺陷）

- 百度菜品识别请求 `top_num=3`，返回 `result[]` 多候选 → 由 `buildCandidatesFromBaidu` 映射为 `RecognizedItem[]`，**保留多个候选并去重**。
- 可插拔引擎（Mock / OpenCode Zen / 本地 Cline 网关）本身已返回 `items[]`，由 `normalizeCandidates` 做二次归一化与去重。
- 置信度统一归一（`clampConfidence`）：`NaN/<=0 → 0.8`；`>1 → 视为百分制 /100`；异常大值封顶 1。未命中知识库的候选叠加 `-0.2` 偏置，提示用户复核。

---

## 5. 场景 A–E 的可靠确认 UI

| 场景 | 含义 | 处理方式 |
|------|------|----------|
| A 清晰单物体 | 高置信度单候选 | 直接进入确认页，单条卡片，可改 |
| B 相似候选 / 低置信 | 多候选或置信偏低 | 确认页列出**多条候选**，用户可**逐条移除（✕）**或改名（下拉知识库名） |
| C 完全无法识别 | API 返回空 | 不卡死：提示 + 暴露「手动输入食材」入口（跳 `mode=manual`） |
| D 一张图多种食材 | 多 `items` | 确认页天然支持多条，分别确认 / 去噪 |
| E 接口不可用 | 无 Key / 网络 / 鉴权失败 | 降级到可插拔引擎（Mock 演示）；若仍失败 → 同 C 暴露手动入口，并明确告知「已切换本地演示」 |

双通道识别（修复「scan 绕过可插拔引擎」的架构不一致）：
1. 管理员已配百度密钥 → 优先百度；
2. 无密钥 / 百度异常 / 无结果 → 降级 `recognizeImage`（Mock 或已配置的真实视觉模型），**最多降级一次，绝不无限重试**。

---

## 6. 8 个识别埋点事件（复用现有 `track`，不记录 Key / 图片）

| 事件 | 触发时机 |
|------|----------|
| `recognition_image_uploaded` | 用户选图成功 |
| `recognition_started` | 开始调用识别（带 `hasBaiduKey`） |
| `recognition_succeeded` | 拿到候选数组（带 `count` / `knownCount` / `fallback`） |
| `recognition_failed` | 最终失败（带 `reason`） |
| `recognition_candidate_selected` | 确认页用户从下拉选择候选名称 |
| `recognition_name_corrected` | 确认页用户把候选改成了不同名称 |
| `recognition_manual_entry` | 用户走「手动输入」绕过识别 |
| `recognition_added_to_inventory` | 确认页把识别结果正式入库（带 `count`） |

> 同时保留旧的 `photo_recognition_success` / `photo_recognition_failed` / `ingredient_added` 以维持个人中心既有指标兼容。

---

## 7. 与入库逻辑的关系

- 识别只写 `KEYS.PENDING.{items, image, provider, fallback}`；`pages/ingredient` 在 `mode=confirm` 读取并映射为可编辑卡片，`submit()` 才调用 `addIngredient`（`source:'ai'`）。
- 批次独立性、D1/D2、提醒、菜谱推荐均未被改动，识别改造**不触碰这些路径**。

---

## 8. 后续（二期，不影响本期交付）

- 将百度 `dish`（菜品识别）替换为 `ingredient`（食材识别）以更直接命中单食材；
- 真实视觉模型（本地 Cline 网关 / OpenCode Zen）接入后，补充真实 API 测试集（需密钥，当前明确标记未执行）；
- 候选名称相似度排序、OCR 包装文字辅助识别等。
