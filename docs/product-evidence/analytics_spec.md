# 埋点方案与指标口径（Analytics Spec）

> 日期：2026-10-19
> 现状：`utils/analytics.ts` 的 `track()` 已在 app/home/fridge/scan/recipe/ingredient 等多页埋点，**仅写入本地存储（`fk:events`），未上报服务端、无看板、无真实用户数据**。
> 原则：未实现的事件只列入规划；**不把页面浏览量当独立用户数；不把提醒弹出当点击率；无真实用户数据不生成虚假转化率/留存率**。

---

## 1. 事件定义（核心链路）

实现状态：✅=已埋点（本地）｜⚠️=已埋点但未上报/无看板｜❌=未实现（规划）

| 事件名 | 触发时机 | 必要属性 | 用户/会话标识 | 去重规则 | 数据用途 | 隐私风险 | 实现状态 |
|--------|---------|---------|-------------|---------|---------|---------|---------|
| app_open | 小程序启动/前台 | scene, ts | openid(微信登录后) / 匿名 deviceId | 同日多次启动计 1 次活跃 | 活跃/留存分母 | 低（匿名设备号） | ✅本地⚠️未上报 |
| ingredient_recognition_started | 点击拍照/相册/识别入口 | source(camera/album), ts | 同上 | 一次点击计 1 | 识别漏斗起点 | 低 | ✅本地⚠️ |
| ingredient_recognition_succeeded | 识别成功返回结果 | name, confidence, provider | 同上 | 一次成功计 1 | 识别成功率分子 | 中（含食材名，本地） | ✅本地⚠️ |
| ingredient_recognition_failed | 识别失败/网络异常 | error_type, ts | 同上 | 一次失败计 1 | 识别成功率分母 | 低 | ✅本地⚠️ |
| ingredient_confirmed | 用户确认/修正识别结果 | name, edited(bool) | 同上 | 一次确认计 1 | 录入完成率 | 中 | ✅本地⚠️ |
| ingredient_added | 加入冰箱成功 | name, storageMethod, area | 同上 | 一次加入计 1 | 识别→入库转化 | 中 | ✅本地⚠️ |
| storage_advice_viewed | 查看保存建议 | name, method | 同上 | 同食材同日去重 | 建议触达 | 低 | ✅本地⚠️ |
| expiry_reminder_shown | 临期提醒展示 | name, daysLeft | 同上 | 每条提醒计 1 | 提醒触达分母 | 低 | ❌未接入推送 |
| expiry_reminder_clicked | 用户点击提醒 | name, ts | 同上 | 一次点击计 1 | 提醒点击率分子 | 低 | ❌未接入推送 |
| recipe_recommendation_viewed | 查看菜谱推荐 | count, useExpiring | 同上 | 每次进入计 1 | 推荐触达 | 低 | ⚠️部分 |
| recipe_clicked | 点击某道菜谱 | recipe_id | 同上 | 一次点击计 1 | 菜谱点击率分子 | 低 | ⚠️部分 |
| ingredient_consumed | 消耗食材 | name, amount | 同上 | 一次消耗计 1 | 库存更新完成率 | 中 | ✅本地⚠️ |

> 隐私：所有事件仅含食材名/操作类型，**不含图片、不含精确位置、不含姓名**；建议正式上报采用设备匿名 ID，敏感字段脱敏；遵守《个人信息保护法》最小必要原则。

---

## 2. 核心指标口径（分子/分母/窗口/排除）

| 指标 | 分子 | 分母 | 统计窗口 | 排除条件 | 当前可算？ |
|------|------|------|---------|---------|----------|
| 识别成功率 | recognition_succeeded | recognition_started | 日/周 | 排除测试/管理员账号 | ❌ 无上报数据 |
| 食材录入完成率 | ingredient_confirmed | recognition_succeeded + 手动录入触发 | 日/周 | — | ❌ |
| 识别→入库转化率 | ingredient_added | ingredient_confirmed | 日/周 | — | ❌ |
| 临期提醒点击率 | expiry_reminder_clicked | expiry_reminder_shown | 日/周 | 同提醒同日去重 | ❌ 未接入 |
| 临期食材处理率 | 临期食材被 consumed | 曾处 urgent/soon 的食材数 | 7 日 | 排除误删 | ❌ |
| 菜谱点击率 | recipe_clicked | recipe_recommendation_viewed | 日/周 | — | ❌ |
| 库存更新完成率 | ingredient_consumed | ingredient_added | 7 日 | — | ❌ |
| 次日/7 日留存率 | 第 N 日 app_open 用户数 | 新增用户数 |  cohort | 排除测试设备 | ❌ 无真实用户 |

> **严禁**：把 `expiry_reminder_shown` 次数当点击率；把页面 PV 当活跃用户数；用模拟数据冒充真实用户行为。

---

## 3. 与优化任务建议事件的对照（2026-10-19 补充）

任务书建议的 10 个事件，对照当前实现（均为本地 `track()`，未上报）：

| 任务建议事件 | 当前对应事件 | 实现状态 | 说明 |
|--------------|-------------|---------|------|
| `ingredient_add_started` | 无独立"开始"事件；可由 `ingredient_recognition_started` / 手动录入点击近似 | ❌ 待补 | 建议新增统一 `ingredient_add_started` |
| `ingredient_recognition_completed` | `ingredient_recognition_succeeded` | ✅本地⚠️ | — |
| `ingredient_recognition_failed` | `ingredient_recognition_failed` | ✅本地⚠️ | — |
| `ingredient_add_confirmed` | `ingredient_confirmed` | ✅本地⚠️ | — |
| `ingredient_batch_updated` | 无独立事件 | ❌ 待补 | 编辑批次时补 `ingredient_batch_updated` |
| `ingredient_priority_viewed` | 首页 `expiring` 区块无专属事件 | ❌ 待补 | 建议补 `ingredient_priority_viewed` |
| `recipe_recommendation_viewed` | `recipe_recommendation_viewed` | ⚠️部分 | — |
| `recipe_selected` | `recipe_clicked` | ⚠️部分 | — |
| `ingredient_consumed` | `ingredient_consumed` | ✅本地⚠️ | — |
| `ingredient_discarded` | 无（无丢弃数据模型） | ❌ 未实现 | 需先建 `discard` 模型（P2） |

> 凡 ❌/待补 事件：仅为设计规划，当前无埋点、无数据；不得写成已实现。

## 4. 任务建议指标口径（补充定义）

以下 5 个指标为"口径定义"，**当前无真实数据，不输出数值**；待真实埋点回填后按此计算。

| 指标 | 分子 | 分母 | 口径说明 |
|------|------|------|---------|
| 录入完成率 | 成功完成录入次数（confirmed+manual） | 开始录入次数（add_started） | 需新增 `ingredient_add_started` 方可计算 |
| 识别人工修改率 | 发生人工修改的识别结果数（edited=true） | 已完成识别结果数（succeeded） | 反映识别置信度质量 |
| 临期食材处理率 | 统计周期内完成处理（consumed）的临期批次数 | 该周期内应处理（urgent+soon）批次数 | 7 日窗口，排除误删 |
| 菜谱选择率 | 被选择的推荐菜谱数（recipe_selected） | 展示的推荐菜谱数（viewed） | — |
| 食材消耗记录率 | 完成消耗记录的操作数（consumed） | 进入消耗流程的操作数 | 取消操作不计 |

> 上述指标与 §2 既有指标一致：均为"定义已就绪、真实采集待补"。禁止将 `mock_analytics_sample.csv` 冒充真实用户数据。

---

## 5. 模拟数据（仅用于演示看板，非真实用户行为）

> ⚠️ **模拟数据，仅用于演示**。以下数字为构造示例，不代表任何真实用户行为，不得写入简历或对外号称真实指标。
> 文件：`mock_analytics_sample.csv`（30 日漏斗示例，已醒目标记）

用途：填充分析看板原型、向面试官演示"指标如何计算"。一旦接入真实上报，应以真实数据替换。

---

## 4. 落地建议（P1）
1. `track()` 增加上报通道（自有后端/云函数），本地存储仅作离线缓存。
2. 补齐 `expiry_reminder_*` 两事件（需先接入微信订阅消息，见 test_plan D6）。
3. 建最小看板：识别成功率、识别→入库转化、临期处理率、菜谱点击率。
4. 设备匿名 ID 统一，满足隐私合规。
