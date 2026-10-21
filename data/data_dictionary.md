# FreshKeep 数据字典（模拟数据与测试集）

> 本文档说明 `data/` 下本轮新增的**模拟数据**与**测试集**字段，以及小程序本地存储键映射。
> 所有模拟数据 `data_source='synthetic_test'`，**不代表真实用户**，与真实单用户数据严格隔离。

---

## 1. 小程序本地存储键映射（`utils/storage` · PREFIX=`fk:`）

| 存储键（去前缀） | 常量 | 内容 | 说明 |
|---|---|---|---|
| `fk:ingredients` | `KEYS.INGREDIENTS` | `Ingredient[]` | 真实单用户冰箱库存（含合成批次，按 id 区分） |
| `fk:events` | `KEYS.EVENTS` | `EventLog[]` | 埋点事件日志（含 `ingredient_*` / `ingredient_consumed`） |
| `fk:synthetic_users` | （导入工具专用） | `SyntheticUser[]` | 模拟用户列表，**独立于真实单用户** |
| `fk:pending_recognition` | `KEYS.PENDING` | 识别候选 + 图片 | 识别→确认中间态 |
| `fk:user` | `KEYS.USER` | 真实单用户档案 | 真实数据，导入工具**不触碰** |

---

## 2. `data/synthetic_users.json`

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | string | `U001`–`U030`，全局唯一 |
| `display_name` | string | 匿名展示名（如 `匿名用户-01`） |
| `created_at` | string | 注册日期 `yyyy-MM-dd`，相对 base_date 偏移 [-120, -5] 天 |
| `household_size` | number | 家庭人数 1–5 |
| `diet_prefs` | string[] | 饮食偏好（少油/不吃辣/高蛋白/…），可空 |
| `data_source` | string | 固定 `synthetic_test` |
| `dataset_version` | string | `fk-synthetic-v1` |

## 3. `data/synthetic_inventory_batches.json`

每行 = 一个**独立库存批次**（对应 `Ingredient`）。

| 字段 | 类型 | 来源 / 说明 |
|---|---|---|
| `user_id` | string | 归属模拟用户 |
| `batch_id` | string | `Uxxx-Bxxxx`，全局唯一，作为 `Ingredient.id` |
| `name` | string | 食材标准名（来自知识库） |
| `emoji` / `category` | string | 来自知识库 |
| `quantity` / `unit` | number / string | 数量与单位 |
| `purchaseDate` | string | 购买日期，相对 base_date 偏移 [-20, +8] |
| `storageMethod` / `storageArea` | string | 保存方式 / 分区（来自 `getStorageAdvice`） |
| `bestBeforeDate` | string | `purchaseDate + 保存天数` |
| `source` / `data_source` | string | `synthetic_test` |
| `dataset_version` | string | `fk-synthetic-v1` |

> 同名食材在不同批次有**不同 batch_id**，证明批次独立、不合并。

## 4. `data/synthetic_events.json`

| 字段 | 类型 | 说明 |
|---|---|---|
| `event_id` | string | `E-A-<batchId>`（入库）/ `E-C-<batchId>`（消耗） |
| `event_time` | string | 事件时间 `yyyy-MM-dd` |
| `user_id` / `batch_id` | string | 归属 |
| `ingredient_name` | string | 食材名 |
| `type` | string | `ingredient_added_to_inventory` / `ingredient_consumed` |
| `used` / `left` | number | 仅消耗事件：本次用量 / 剩余 |
| `data_source` | string | `synthetic_test` |

## 5. `data/recognition_samples.csv`（图片测试集 ground-truth）

| 列 | 说明 |
|---|---|
| `sample_id` | `S01`–`S30` |
| `category` | 食材分类（9 类全覆盖） |
| `expected_name` | 标准名（来自知识库，作 ground-truth） |
| `aliases` | 别名（`|` 分隔） |
| `default_storage_method` | 默认保存方式 |
| `search_query` | 图片检索词（供联网环境拉取） |
| `image_url` | 预留真实图片地址（当前空） |
| `image_local_path` | 本地图片路径（当前空，未下载） |
| `real_api_status` | **`未执行`**（网络/密钥不可用，诚实标记） |
| `notes` | 备注 |

---

## 6. 诚实声明

- 上述全部为**程序生成**的虚构测试数据；任何基于此的「准确率 / 留存 / 减浪费」结论均**不代表真实用户**。
- 真实图片与真实 API 调用因环境限制**未执行**，相关字段留空并标记 `未执行`，绝不冒充真实测试结果。
