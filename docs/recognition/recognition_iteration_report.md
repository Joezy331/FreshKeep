# FreshKeep 拍照识别能力 · 迭代报告

> 周期：拍照识别能力专项优化（第一轮）
> 原则：先解决识别结果不可靠，再追求识别品类扩张；先建立真实测试证据，再声称效果提升。

---

## 1. 本轮做了什么（Before → After）

| 维度 | 改造前（Before） | 改造后（After） |
|------|----------------|----------------|
| 识别入口 | `scan.ts` 直连百度、绕过可插拔引擎 | 双通道：百度优先 + 可插拔引擎降级（Mock / 真实视觉模型） |
| 候选处理 | 只取 Top-1（`result[0]`），丢弃其余候选 | 候选数组（`top_num=3`）+ 去重，确认页可逐条去噪 |
| 名称归一 | `scan.ts` 与 `opencode-zen.ts` 各写一份、未命中强制「其他」 | 集中式 `normalizeFoodName`，未命中保留原名并标 `known:false` |
| 失败兜底 | 无结果/异常只 `showToast`，用户被卡在拍照页 | 暴露「手动输入食材」入口（场景 C/E 不卡死） |
| 未知食材 | 静默归为「其他」 | 确认页高亮「未在知识库 · 请确认名称」 |
| 知识库覆盖 | 28 条 | 67 条（纯新增，含叶菜/根茎/瓜果/水果/菌菇/肉类部位/水产/蛋奶/主食半成品） |
| 可测试性 | 仅占位「未执行」 | 17 条识别逻辑层真实单测（另 51 条保鲜/菜谱/提醒既有单测仍全绿） |
| 埋点 | 3 个识别相关事件 | 新增 8 个识别事件（覆盖 上传/开始/成功/失败/候选选择/改名/手动/入库） |

---

## 2. 真实执行结果（不伪造）

- **识别逻辑层**：`tools/recognition-tests.mjs` → **17/17 通过**（unit-logic，真实执行纯函数）。
- **既有业务回归**：`tools/product-evidence-tests.mjs` → 保鲜 26/26、菜谱 20/20、提醒 5/5 全绿；其中 S13/S14/S16/R06 经核查为**真实执行通过、无伪造**。
- **真实模型 API**：因本机无可用百度 / AI Key（密钥已移除待轮换），**未执行**，在 `recognition_test_results.csv` 中以 `测试类型=real-api` 明确标记，不计入通过率、不冒充真实模型测试。

---

## 3. 诚实声明（重要）

- 本轮**未声称**任何「识别准确率 % / 真实用户数据」。所有效果提升均以逻辑层单测与代码重构为依据。
- 百度菜品识别属「菜品识别」而非「食材识别」，返回多为菜名（如「西红柿炒鸡蛋」），经归一化后大概率 `known=false`，需用户在确认页校正——这是**已知真实局限**，已在设计文档二期项列出（建议改用百度 `ingredient` 接口或真实视觉模型）。
- 可插拔引擎的视觉能力（本地 Cline 网关 / OpenCode Zen）当前**未配置真实 Key 时走 Mock**，Mock 结果仅用于演示链路，不构成任何准确率声明。

---

## 4. 文件变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `data/food-database.ts` | 改 | 新增 `normalizeFoodName` + `INGREDIENT_CATEGORIES`；知识库 28→67 条（纯新增） |
| `services/ai/types.ts` | 改 | `RecognizedItem` 增加可选 `known?: boolean` |
| `services/ai/recognition-core.ts` | 新 | 纯函数：候选构建 / 二次归一化 / 置信度归一（可单测，无 wx 依赖） |
| `services/ai/index.ts` | 改 | 导出 `recognizeImage`（供 scan 降级调用） |
| `pages/scan/scan.ts` | 改 | 双通道识别、候选数组、A–E 处理、8 埋点、不写死密钥 |
| `pages/scan/scan.wxml` | 改 | 失败暴露「手动输入食材」入口 |
| `pages/ingredient/ingredient.ts` | 改 | 候选移除（`removeCandidate`）、候选选择/改名/入库埋点、`known` 透传 |
| `pages/ingredient/ingredient.wxml` | 改 | 未命中高亮、确认页逐条移除按钮 |
| `pages/ingredient/ingredient.wxss` | 改 | 新增高亮与移除按钮样式 |
| `types/user.ts` | 改 | `TrackEvent` 新增 8 个识别事件 |
| `tools/recognition-tests.mjs` | 新 | 识别逻辑层真实单测（17 例） |
| `docs/recognition/*.md` | 新 | 审计 / 设计 / 测试计划 / 测试结果 / 迭代报告 |
| `README.md` | 改 | AI 识别能力说明更新 + 专项优化小节 |

---

## 5. 下一步

1. 配置真实视觉模型 Key 后，补充 `real-api` 真实测试集与准确率基线；
2. 评估将百度 `dish` 切换到 `ingredient` 接口，提升单食材命中；
3. 候选相似度排序、OCR 包装文字辅助识别等二期增强。
