/**
 * FreshKeep · 模拟数据生成器（30 个合成用户 + 库存批次 + 事件）
 * 运行：node scripts/generate_synthetic_data.mjs [--base-date YYYY-MM-DD]
 *
 * 设计约束（严格遵循迭代 Prompt）：
 *  - 固定随机种子（mulberry32, seed=20261021）→ 可复现，不漂移。
 *  - 基准日期可注入（默认今天），保证 daysLeft / 临期分布稳定可追溯。
 *  - 全部数据带 data_source='synthetic_test'，绝不混入真实用户。
 *  - 保存期限优先引用现有知识库（getStorageAdvice），不编造食品安全保证。
 *  - 同名食材可形成不同批次（独立 batch_id），不合并。
 *  - 已消耗的批次从有效库存移除，仅出现在事件里，不污染推荐。
 */

import fs from 'node:fs'
import path from 'node:path'

/* ---------- wx mock（纯函数模块不依赖，仅防御性） ---------- */
globalThis.wx = { getStorageSync: () => '', setStorageSync: () => {} }

const { FOOD_DATABASE } = await import('../data/food-database.ts')
const { getStorageAdvice } = await import('../services/food/storage-advice.ts')
const { addDays, today } = await import('../utils/date.ts')

const OUT = path.resolve('data')
const SEED = 20261021
const DATASET_VERSION = 'fk-synthetic-v1'
const BASE_DATE = process.argv.includes('--base-date')
  ? process.argv[process.argv.indexOf('--base-date') + 1]
  : today()

/* ---------- 可复现 RNG ---------- */
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(SEED)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const randInt = (min, max) => min + Math.floor(rnd() * (max - min + 1))

/* ---------- 1. 30 个模拟用户 ---------- */
const HOUSEHOLDS = [1, 2, 3, 4, 5]
const PREF_POOL = [
  ['少油', '清淡'], ['不吃辣'], ['高蛋白', '健身'], ['宝宝辅食'],
  ['素食为主', '少肉'], ['家常味'], ['爱吃海鲜'], ['控糖', '低 GI'], []
]
const ANON = ['匿名用户', '测试家庭', '小户型', '合租屋', '三口之家', '独居', '三代同堂']
const users = []
for (let i = 1; i <= 30; i++) {
  const created = addDays(BASE_DATE, -randInt(5, 120))
  users.push({
    user_id: `U${String(i).padStart(3, '0')}`,
    display_name: `${pick(ANON)}-${String(i).padStart(2, '0')}`,
    created_at: created,
    household_size: pick(HOUSEHOLDS),
    diet_prefs: pick(PREF_POOL),
    data_source: 'synthetic_test',
    dataset_version: DATASET_VERSION
  })
}

/* ---------- 2. 库存批次 + 事件 ---------- */
const METHODS_BY_FOOD = (f) => f.options.map((o) => o.method)
const unitsPool = ['个', '把', '根', '颗', '块', 'g', 'ml', 'kg', '份', '袋', '盒', '条', '只']

const activeBatches = []
const consumedEvents = []
const addEvents = []
const consumedBatchIds = new Set()
let batchSeq = 0

for (const u of users) {
  const n = randInt(4, 10) // 每用户 4~10 个批次，且用户之间有差异
  const usedNames = new Set()
  for (let k = 0; k < n; k++) {
    const food = pick(FOOD_DATABASE)
    const method = pick(METHODS_BY_FOOD(food))
    const advice = getStorageAdvice(food.name, method)
    const unit = food.defaultUnit || pick(unitsPool)
    const quantity = food.defaultQuantity || randInt(1, 5)
    // 购买日期偏移 [-20, +8] 天，自然覆盖 新鲜/临期/紧急/过期
    const offset = randInt(-20, 8)
    const purchaseDate = addDays(BASE_DATE, offset)
    const bestBeforeDate = addDays(purchaseDate, advice.days)

    // ~15% 概率标记为已消耗（从有效库存移除，仅留事件）
    const isConsumed = rnd() < 0.15
    batchSeq += 1
    const batchId = `${u.user_id}-B${String(batchSeq).padStart(4, '0')}`
    const batch = {
      user_id: u.user_id,
      batch_id: batchId,
      name: food.name,
      emoji: food.emoji,
      category: food.category,
      quantity,
      unit,
      purchaseDate,
      storageMethod: method,
      storageArea: advice.area,
      bestBeforeDate,
      source: 'synthetic_test',
      data_source: 'synthetic_test',
      dataset_version: DATASET_VERSION
    }
    if (isConsumed) {
      consumedBatchIds.add(batchId)
      consumedEvents.push({
        event_id: `E-C-${batchId}`,
        event_time: addDays(purchaseDate, randInt(1, Math.max(1, advice.days - 1))),
        user_id: u.user_id,
        batch_id: batchId,
        ingredient_name: food.name,
        type: 'ingredient_consumed',
        used: quantity,
        left: 0,
        data_source: 'synthetic_test'
      })
    } else {
      activeBatches.push(batch)
      addEvents.push({
        event_id: `E-A-${batchId}`,
        event_time: purchaseDate,
        user_id: u.user_id,
        batch_id: batchId,
        ingredient_name: food.name,
        type: 'ingredient_added_to_inventory',
        data_source: 'synthetic_test'
      })
    }
    usedNames.add(food.name)
  }
  // 约 1/3 用户制造一次「同名多次购买」形成独立批次（不合并）
  if (rnd() < 0.35 && usedNames.size > 0) {
    const name = pick([...usedNames])
    const food = FOOD_DATABASE.find((f) => f.name === name)
    const method = pick(METHODS_BY_FOOD(food))
    const advice = getStorageAdvice(food.name, method)
    const offset = randInt(-15, 5)
    const purchaseDate = addDays(BASE_DATE, offset)
    batchSeq += 1
    const batchId = `${u.user_id}-B${String(batchSeq).padStart(4, '0')}`
    activeBatches.push({
      user_id: u.user_id,
      batch_id: batchId,
      name: food.name,
      emoji: food.emoji,
      category: food.category,
      quantity: food.defaultQuantity || randInt(1, 5),
      unit: food.defaultUnit || '个',
      purchaseDate,
      storageMethod: method,
      storageArea: advice.area,
      bestBeforeDate: addDays(purchaseDate, advice.days),
      source: 'synthetic_test',
      data_source: 'synthetic_test',
      dataset_version: DATASET_VERSION
    })
  }
}

const events = [...addEvents, ...consumedEvents].sort((a, b) =>
  a.event_time < b.event_time ? -1 : 1
)

/* ---------- 写出 ---------- */
fs.mkdirSync(OUT, { recursive: true })
const meta = {
  dataset_version: DATASET_VERSION,
  generated_at: new Date().toISOString(),
  base_date: BASE_DATE,
  seed: SEED,
  data_source: 'synthetic_test',
  note: '全部为程序生成的虚构测试数据，不代表真实用户行为。'
}
fs.writeFileSync(path.join(OUT, 'synthetic_users.json'), JSON.stringify(users, null, 2))
fs.writeFileSync(path.join(OUT, 'synthetic_inventory_batches.json'), JSON.stringify(activeBatches, null, 2))
fs.writeFileSync(path.join(OUT, 'synthetic_events.json'), JSON.stringify(events, null, 2))
fs.writeFileSync(
  path.join(OUT, 'synthetic_meta.json'),
  JSON.stringify({ ...meta, user_count: users.length, batch_count: activeBatches.length, event_count: events.length, consumed_count: consumedEvents.length }, null, 2)
)

console.log(`\n=== 模拟数据生成完成 ===`)
console.log(`基准日期: ${BASE_DATE}  种子: ${SEED}`)
console.log(`用户数: ${users.length}`)
console.log(`有效库存批次数: ${activeBatches.length}`)
console.log(`事件数: ${events.length}（其中已消耗事件: ${consumedEvents.length}）`)
console.log(`已写出: data/synthetic_users.json / synthetic_inventory_batches.json / synthetic_events.json`)
console.log('SYNTHETIC DATA GENERATED ✅')
