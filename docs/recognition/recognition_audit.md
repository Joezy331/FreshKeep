# FreshKeep 拍照识别能力 · 现状审计报告

> 审计目标：在动手改造前，先如实摸清「现有识别实现 / 模型接口 / Mock 数据 / 食材知识库 / 入库逻辑」的真实状态，定位识别结果不可靠的根因，避免为改造而破坏其它业务流程。
> 审计原则：**不伪造未实现的功能、不把 Mock 当真实模型、区分单元测试与真实 API 调用、区分「已知可用」与「待修复」。**

---

## 1. 调用链路现状（实测读码）

| 入口 | 真实调用方 | 模型/接口 | 返回处理 | 状态 |
|------|-----------|-----------|----------|------|
| `pages/scan/scan.ts` `takePhoto` | 直接调用 | 百度智能云 `image-classify/v2/dish` | **仅取 `result[0]`（Top-1）** | 依赖本地存储的百度 Key；无 Key 时提示配置 |
| `services/ai/recognizeImage` | 仅被「菜谱文案/连通性测试」间接使用 | Mock / OpenCode Zen（OpenAI 兼容） | 返回 `RecognizedItem[]`（已是多候选） | **未被 scan 调用** |

**关键发现（A 类：架构不一致）**：AI 引擎改造（config.ts / profile.ts）已经把视觉 Provider 做成可插拔（`MockVisionProvider` / `OpenCodeZenProvider`），但 `scan.ts` 并没有走这条链路，而是绕过它直连百度。后果：

- 用户之前配的「本地 Cline 网关 / 5 个免费模型」只影响菜谱文案，**不影响拍照识别**；
- 百度 Key 缺失时，拍照识别直接不可用，没有降级到本地演示（Mock），演示链路断裂；
- 两套识别结果映射逻辑重复（`scan.ts` 的 `toRecognizedItem` 与 `opencode-zen.ts` 的 `toRecognizedItem`），归一化规则各写一份，易漂移。

---

## 2. 识别结果「不可靠」的根因分类（A–E 诊断）

### A. 清晰单物体 → 直接确认
- 现状：百度 `result[0]` 置信度高时直接进确认页。基本可用，但**缺少候选兜底**——一旦 Top-1 错，用户只能整条改。
- 判定：**可用，需补候选**。

### B. 相似候选 / Top-1 置信度低
- 现状：百度 `dish` 实际返回 `result[]` 多候选数组（含 `probability`），但代码**只消费 `[0]**，把其余候选丢弃；同时 `scan.ts` 自己写了 `probability < 0.5` 的文案提示，但候选根本没给用户选。
- 判定：**核心缺陷**。模型本来给了候选，前端把它们压成一个，等于主动制造「不可靠」。

### C. 完全无法识别（API 返回空 / 无结果）
- 现状：`resultArr.length === 0` 时 `showToast('未能识别出菜品')` 然后 `return`，**没有手动输入入口**，用户被卡在拍照页。
- 判定：**缺陷**。应提供「手动输入」出口与「重新识别」。

### D. 一张图多种食材
- 现状：百度 `dish` 是「菜品识别」不是「食材识别」，返回的是菜名（如「西红柿炒鸡蛋」），天然不是多食材；Mock Provider 有 ~35% 概率返回 2–3 个食材，但 scan 取不到（因为走百度路径）。`OpenCodeZenProvider` 的模型 JSON 可返回多 `items`，但也未被 scan 消费。
- 判定：**架构未打通**。多食材能力已存在于 Provider 层，但 scan 直连百度导致用不上。

### E. 接口不可用（无 Key / 网络 / 鉴权失败）
- 现状：无百度 Key → 提示配置；有 Key 但请求失败 → catch 里只 `showToast('识别失败')`，**无降级、无手动入口**。
- 判定：**缺陷**。应降级到可插拔引擎的 Mock，保证演示链路不断，并明确告知「已切换本地演示」。

---

## 3. 食材知识库与归一化现状

- `data/food-database.ts`：`FOOD_DATABASE` 28 条，`FOOD_MAP` 别名索引，`findFood` 精确+别名匹配。10 个分类（蔬菜/水果/肉类/蛋类/奶制品/海鲜/豆制品/调味品/主食/其他）**已齐备**。
- 归一化缺陷（`scan.ts` / `opencode-zen.ts` 的 `toRecognizedItem`）：未命中知识库时**强制 `category:'其他'`** 并给「未收录」提示，但没有把 `known:false` 透出给前端，导致用户无从感知「这条可能识别错了，请确认」。
- 覆盖缺口（非阻塞，专项二期）：叶菜细分、根茎、瓜果、更多水果、菌菇、肉类部位、水产、主食半成品等仍有扩充空间。

---

## 4. 入库逻辑现状（确认解耦已具备）

- `pages/ingredient/ingredient.ts` 在 `mode=confirm` 下读取 `KEYS.PENDING.{items,image}`，把 `RecognizedItem[]` 映射成可编辑 `EditItem[]`，`submit()` → `addIngredient`，来源标记 `source:'ai'`。
- `services/food/fridge.ts` `addIngredient` 每次入库=独立批次（D：批次独立已落地），`updateIngredient` 含 D1（购买日期→重算最佳食用期）、D2（保存方式→分区联动）。
- **结论**：识别与入库已解耦（识别只写 PENDING，确认页才入库），本次改造**不触碰入库逻辑**，仅增强「候选数组 + 归一化 + 确认 UI」。

---

## 5. 测试证据现状（诚实核查 S13 / S14 / S16 / R06）

`tools/product-evidence-tests.mjs` 真实执行项目模块逻辑层（Node + wx mock）：

| 用例 | 声称 | 实测 | 结论 |
|------|------|------|------|
| S13 | 改购买日期→最佳食用期重算（D1） | `updateIngredient(id,{purchaseDate})` 后 `bestBefore` 重算正确 | ✅ 通过，诚实 |
| S14 | 改保存方式→分区联动（D2） | 牛肉 冷冻→冷藏 后 `storageArea` 变「冷藏区」 | ✅ 通过，诚实 |
| S16 | 同名两次→两个独立批次 | 两次 `addIngredient` 生成 2 个不同 id | ✅ 通过，诚实 |
| R06 | 别名 番茄→归一为西红柿并推荐 | `findFood('番茄')` 命中西红柿，推荐命中 | ✅ 通过，诚实 |

- **一致性结论**：S13/S14/S16/R06 当前均为「真实执行通过」，无伪造。**唯一不一致点**在于：`tools/product-evidence-tests.mjs` 末尾的 `recognition_test_results.csv` 仅有一行占位「未执行（无百度 Key）」，而 README 仍写着「AI 菜品识别（真实）」。这会让读者误以为识别已被测试验证。
- **修复动作**：本次新增 `tools/recognition-tests.mjs`，对**识别逻辑层**（归一化 `normalizeFoodName`、候选数组构建、降级判定）做真实可复现单元测试，并在 CSV 中用 `测试类型` 列严格区分 `unit-logic`（已执行）与 `real-api`（无 Key，明确标记未执行），消除误导。

---

## 6. 改造范围红线（本次不做 / 保留）

- ✅ 保留：`fridge.ts` 批次模型、D1/D2、提醒、菜谱推荐、手动添加、现有 28 条知识库与别名。
- ✅ 保留：百度菜品识别真实调用（Key 在本地存储，不写死代码）。
- ❌ 不伪造：任何「识别准确率 %」「真实用户数据」。
- ❌ 不新增硬编码密钥：百度 Key / AI Key 全部来自本地存储。
- 🔧 改造：scan 改为「百度优先 + 可插拔引擎降级」双通道；识别结果改为**候选数组**；引入集中式归一化；确认页支持候选移除；补齐 8 个识别埋点；补齐真实可复现测试。

---

## 7. 下一步

- 见 `recognition_design.md`：候选数组 + 归一化 + 场景 A–E 处理流程 + 8 埋点设计。
- 见 `recognition_test_plan.md`：测试计划（Mock vs 真实严格区分）。
- 见 `recognition_test_results.csv` + `recognition_iteration_report.md`：真实执行结果与迭代结论。
