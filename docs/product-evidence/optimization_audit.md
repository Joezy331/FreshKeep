# FreshKeep 产品体验优化 · 现状审计（Optimization Audit）

> 审计日期：2026-10-19 ｜ 审计方式：**只读代码 + 运行真实逻辑测试**，未改写业务功能
> 目的：在实施优化前厘清"已实现 / 部分实现 / Mock 演示 / 尚未实现"，暴露真实问题，避免描述超过实际能力
> 证据分级：**A** 已有证据（代码/测试/文档）｜**B** 本次实际执行测试结果｜**C** 待验证假设｜**D** 暂无数据

---

## 1. 项目结构与技术栈

- **形态**：微信小程序（无原生插件、无第三方运行时依赖）。
- **语言**：TypeScript + WXSS + WXML；`tsconfig.json` 开启类型检查，Node 下可用 `--experimental-strip-types` 直接跑逻辑模块（见 `tools/product-evidence-tests.mjs`）。
- **页面（8）**：`splash` 启动页 → `home` 首页 → `fridge` 我的冰箱 → `recipe` 食谱 → `profile` 我的 → `scan` 拍照识别 → `ingredient` 录入/编辑 → `recipe-detail` 菜谱详情。
- **底部导航（4）**：首页 / 我的冰箱 / 食谱 / 我的。
- **组件（7）**：`ai-loading`、`empty-state`、`expiration-card`、`fridge-section`、`ingredient-card`、`recipe-card`、`scan-button`。
- **服务层**：`services/food`（expiration/fridge/storage-advice）、`services/recipe/recommend`、`services/notification/reminder`、`services/ai`（Mock/LLM 可插拔）、`services/baidu/config`（凭证安全读取）。
- **本地存储**：`utils/storage.ts`，键前缀 `PREFIX='fk:'`；无云端/后端写入（纯前端小程序）。

## 2. 当前页面与功能清单

| 页面 | 已实现 | 状态 | 证据 |
|------|--------|------|------|
| 首页 home | 真实库存摘要、优先处理区、拍食材/生成菜单入口、提醒弹层 | 已实现（数据真实，非写死） | `home.ts` 用 `getStats()`/`buildReminders()` 计算 |
| 我的冰箱 fridge | 按分类筛选 + 名称搜索、按分区分组、批次点击进编辑 | **部分实现** | 仅 keyword+category 筛选，缺状态/分区筛选（见 §3） |
| 食谱 recipe | 规则推荐 + 临期优先 + 自然语言意图解析 + 可选 LLM 文案 | 已实现（规则，非 LLM 生成） | `recommend.ts` |
| 我的 profile | 库存统计、提醒偏好、使用说明、数据管理、埋点汇总 | **部分实现** | 统计来自本地；无真实用户行为数据 |
| 拍照识别 scan | 真实百度菜品识别调用 + Mock/LLM 兜底 + 确认页 | **部分实现** | `scan.ts` L76–116 真实调用；端到端未跑通（无密钥） |
| 录入 ingredient | 名称/数量/日期/保存方式/位置确认写入 | 已实现 | `fridge.addIngredient` |
| 菜谱详情 recipe-detail | 食材匹配、缺料、推荐理由 | 已实现 | `recipe-detail.ts` |
| 提醒 reminder | 逻辑层生成提醒数据（未接入订阅消息） | **部分实现** | `reminder.ts`：仅生成，未推送 |

## 3. 发现的问题与证据位置

| # | 问题 | 严重度 | 证据位置 | 结论 |
|---|------|-------|----------|------|
| P0-1 | 上一轮"D4 去重"把同名录入**合并**成一条，违反批次独立性 | 高 | `services/food/fridge.ts` `addIngredient`（已修正） | **已撤销**：本轮改为每次入库=独立批次（见 §4） |
| P0-2 | 改购买日期未重算最佳食用期 | 中 | `fridge.updateIngredient` | **已修复 D1** |
| P0-3 | 改保存方式不同步存放分区 | 中 | `fridge.updateIngredient` | **已修复 D2** |
| P0-4 | 菜谱匹配不归一别名（番茄≠西红柿） | 中 | `recommend.ts` | **已修复 D3** |
| P1-1 | 库存筛选仅有"分类/搜索"，缺"需处理/冷藏/冷冻/位置"筛选 | 中 | `fridge.ts` `filterIngredients` | 待实现（UI 本次不大幅改动，列入 P1 计划） |
| P1-2 | 食材数据模型缺"生产日期 / 保质期天数"字段 | 中 | `types/ingredient.ts` | 待补充（R06 依赖项） |
| P1-3 | `computeStats.kinds` 实为批次计数，命名易误解 | 低 | `expiration.ts` `computeStats` | 待澄清（UI 用"批次数"语义即可） |
| P2-1 | 无"丢弃/浪费复盘"记录模型 | 中 | 无对应表/字段 | 待建（见 §4 计划） |
| P2-2 | 埋点仅本地 300 条上限，无上报/看板 | 低 | `utils/analytics.ts` | 仅规范+本地桩，无真实数据 |
| 安全 | 百度 Key 经本地存储，前端无硬编码；历史密钥已移除待轮换 | — | `scan.ts`、`storage.ts` KEYS.BAIDU | 风险已记录，建议后端代理 |

> 说明：本轮**未引入新框架/新基础设施**；纯前端小程序，百度调用建议经可信服务端代理（不擅自加后端）。

## 4. 本次优化计划（已执行 + 计划）

### 已执行（P0 数据正确性 + 证据修复）
1. 撤销"D4 合并"，恢复批次独立（`addIngredient` 每次生成独立 id 批次）。
2. 保留并核验 D1/D2/D3 修复。
3. 测试脚本重构：S13/S14/S16/R06 备注与结果一致；新增 S21–S26（批次独立性/日期边界/部分消耗）、N01–N05（提醒逻辑）。
4. 重跑真实测试：保鲜 26/26、菜谱 20/20、提醒 5/5；识别未执行（缺密钥）。
5. 输出 `test_run_meta.json`、`test_run_log.txt` 留存命令/时间/环境/退出码。

### 计划（P1/P2，不破坏现有 UI）
- P1：扩展 `filterIngredients` 支持 状态/分区 筛选；补充 `Ingredient` 的 `productionDate`/`shelfLifeDays` 及录入表单。
- P2：新增轻量 `discard` 记录（食材/批次/数量/类型/时间/原因），`profile` 展示"浪费复盘"占位。

## 5. 本次不准备实现的功能及原因

| 功能 | 原因 |
|------|------|
| 微信订阅消息真实推送（D6） | 需小程序订阅消息资质 + 定时任务 + 真机验证，超出纯前端范围，列入 P0 后续 |
| 百度识别端到端验证 | 需轮换有效 API Key + 30–50 张测试图，缺密钥无法执行 |
| 真实用户实验（留存/浪费降低） | 无用户，禁止编造数据 |
| 后端代理 / 云端存储 | 当前纯前端小程序，擅自引入大型基础设施与"保持稳定"约束冲突 |
| 大幅改版首页/库存 UI | 用户明确"UI 可不用大幅修改"；本轮聚焦数据正确性与证据一致性 |

---

## 批次独立性（重点澄清）

每条 `Ingredient` 记录即一个**批次**：独立 `id`、购买日期、数量、保存方式、到期日、状态。同名食材多次录入 = 多个批次；UI 可按名称聚合展示，但**底层互不影响**。上一轮"D4 去重合并"会覆盖历史批次（日期/数量错乱），已撤销。该修正经测试 S16/S21/S22 验证。
