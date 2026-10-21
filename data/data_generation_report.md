# 模拟数据生成报告（FreshKeep）

> 生成器：`scripts/generate_synthetic_data.mjs`
> 数据版本：`fk-synthetic-v1` · 生成日期：2026-10-21
> 运行：`node --experimental-strip-types --import ./tools/hooks.mjs scripts/generate_synthetic_data.mjs [--base-date YYYY-MM-DD]`

---

## 1. 设计原则

- **可复现**：固定随机种子 `mulberry32(seed=20261021)`，同种子同输出，不漂移。
- **可注入基准日**：默认今天；`--base-date` 可固定，保证 `daysLeft` / 临期分布稳定可追溯。
- **安全隔离**：全部记录 `data_source='synthetic_test'`；导入工具拒绝任何非该标记的数据。
- **知识库驱动**：保存期限引用真实 `getStorageAdvice`，不编造食品安全保证。
- **批次独立**：同名食材多次购买 = 不同 `batch_id`，不合并，用于验证批次模型。

---

## 2. 生成结果

| 指标 | 数值 |
|---|---|
| 模拟用户数 | **30**（`U001`–`U030`） |
| 有效库存批次数 | **191** |
| 事件总数 | **197**（入库 177 + 消耗 20） |
| 已消耗批次 | 20（约 15% 概率，从有效库存移除，仅留事件） |
| 同名独立批次用户 | 约 1/3 用户制造了同名的第二个独立批次 |

---

## 3. 分布观察（基于 base_date=2026-10-21）

- 购买日期相对基准偏移 `[-20, +8]` 天，自然覆盖 新鲜 / 临期 / 紧急 / 过期 四态。
- 导入后库存状态统计（见 `scripts/import_synthetic_data.mjs --verify`）：
  - 新鲜 ≈ 106 · 临期 ≈ 9 · 紧急 ≈ 8 · 过期 ≈ 68
  - 过期占比较高，因短保食材 + 较早购买偏移所致，符合「模拟长周期积压」演示目的。
- 同名独立批次共 **119** 对，证明导入与库存逻辑**不做同名合并**。

---

## 4. 复现命令

```bash
# 默认用今天作基准日
node --experimental-strip-types --import ./tools/hooks.mjs scripts/generate_synthetic_data.mjs

# 固定基准日（便于对照分布）
node --experimental-strip-types --import ./tools/hooks.mjs scripts/generate_synthetic_data.mjs --base-date 2026-10-21
```

输出：`data/synthetic_users.json` / `synthetic_inventory_batches.json` / `synthetic_events.json` / `synthetic_meta.json`

---

## 5. 诚实缺口

| 缺口 | 原因 |
|---|---|
| 非真实用户 | 全部程序生成，仅用于回归 / 演示 |
| 临期分布非真实 | 随机偏移模拟，不代表真实采购节奏 |
| 无真实行为事件 | 事件由生成器构造，非真实用户操作 |

本报告**不声称**任何真实留存 / 识别准确率 / 减浪费效果。
