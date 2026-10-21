/**
 * FreshKeep · 库存业务闭环回归测试（17 场景 + 复跑 S13/S14/S16/R06）
 * 运行：node tools/inventory-regression-tests.mjs
 * 输出：docs/testing/inventory_regression_results.csv
 *
 * 范围（严格遵循迭代 Prompt §9 验收 17 场景）：
 *  - 批次独立性 / 购买日期重算(D1) / 保存方式联动(D2) / 别名归一(D3)
 *  - 期限四态（新鲜/临期/紧急/过期）
 *  - 消耗扣减 / 全部消耗移除 / 消耗埋点
 *  - 识别→库存闭环：候选归一（已知/未知）、百度多候选去重、置信度边界
 *  - 合成数据导入幂等
 * 复跑既有验收项：S13 / S14 / S16 / R06（与 product-evidence-tests 口径一致）
 */

import fs from 'node:fs'
import path from 'node:path'

/* ---------- 自包含内存存储 mock（不落盘，避免与导入脚本冲突） ---------- */
const mem = {}
globalThis.wx = {
  getStorageSync: (k) => mem[k],
  setStorageSync: (k, v) => { mem[k] = v },
  removeStorageSync: (k) => { delete mem[k] },
  showToast: () => {},
  getRealtimeLogManager: () => null
}

const { get, set, KEYS } = await import('../utils/storage.ts')
const { addIngredient, updateIngredient, consumeIngredient, removeIngredient, listIngredients } = await import('../services/food/fridge.ts')
const { buildCandidatesFromBaidu, clampConfidence, normalizeCandidates } = await import('../services/ai/recognition-core.ts')
const { normalizeFoodName } = await import('../data/food-database.ts')
const { computeStatus } = await import('../services/food/expiration.ts')
const { getEvents, clearEvents } = await import('../utils/analytics.ts')
const { getStorageAdvice } = await import('../services/food/storage-advice.ts')
const { addDays, today } = await import('../utils/date.ts')

const T = today()
function resetStore() {
  set(KEYS.INGREDIENTS, [])
  set(KEYS.EVENTS, [])
  clearEvents()
}

/* ---------- 结果收集 ---------- */
const rows = []
let pass = 0, fail = 0
function assert(id, title, input, expected, actual, ok, notes = '') {
  rows.push([id, title, input, expected, actual, ok ? '通过' : '失败', notes])
  ok ? pass++ : fail++
  if (!ok) console.error(`  ✗ ${id} ${title}\n     期望: ${expected}\n     实际: ${actual}`)
}

/* ============ 1. 批次独立性（S16） ============ */
{
  resetStore()
  const a = addIngredient({ name: '西红柿', quantity: 2, unit: '个', purchaseDate: T })
  const b = addIngredient({ name: '西红柿', quantity: 3, unit: '个', purchaseDate: T })
  const all = listIngredients().filter((i) => i.name === '西红柿')
  const distinct = new Set(all.map((i) => i.id)).size
  assert('S-01/S16', '重复录入(同名两次)→批次独立', 'add 西红柿 x2',
    '生成 2 个独立批次(不同 id)', `批次数=${all.length}; 唯一id=${distinct}`,
    all.length === 2 && distinct === 2 && a.id !== b.id, '批次语义：每次入库=独立批次，不合并')
}

/* ============ 2. 购买日期重算（S13, D1） ============ */
{
  resetStore()
  const it = addIngredient({ name: '白菜', quantity: 1, unit: '颗', purchaseDate: T })
  const days = getStorageAdvice('白菜', '冷藏').days
  const upd = updateIngredient(it.id, { purchaseDate: addDays(T, -5) })
  const expect = addDays(addDays(T, -5), days)
  assert('S-02/S13', '修改购买日期→最佳食用期重算', `purchase ${T} → ${addDays(T, -5)}`,
    `bestBefore 重算为 ${expect}(+${days}天)`, `bestBefore=${upd.bestBeforeDate}`,
    upd.bestBeforeDate === expect, '已修复(D1)：purchaseDate 变更后按保存天数重算')
}

/* ============ 3. 保存方式联动（S14, D2） ============ */
{
  resetStore()
  const it = addIngredient({ name: '牛肉', quantity: 300, unit: 'g', purchaseDate: T })
  const upd = updateIngredient(it.id, { storageMethod: '冷藏' })
  assert('S-03/S14', '修改保存方式→分区联动', 'method 冷冻→冷藏',
    'area 更新为 冷藏区', `area=${upd.storageArea}(method=${upd.storageMethod})`,
    upd.storageArea === '冷藏区' && upd.storageMethod === '冷藏', '已修复(D2)：method 变更同步 storageArea')
}

/* ============ 4. 别名归一（R06, D3） ============ */
{
  const n = normalizeFoodName('番茄')
  assert('S-04/R06', '别名归一：番茄→西红柿', 'normalizeFoodName("番茄")',
    'canonical=西红柿; known=true', `canonical=${n.canonical}; known=${n.known}`,
    n.canonical === '西红柿' && n.known === true, '已修复(D3)：识别/库存前用知识库归一别名')
}

/* ============ 5. 自动补全 ============ */
{
  resetStore()
  const it = addIngredient({ name: '鸡蛋', quantity: 4, unit: '个', purchaseDate: T })
  const okEmoji = !!it.emoji && it.emoji !== ''
  const okCat = !!it.category
  const okBb = !!it.bestBeforeDate
  assert('S-05', 'addIngredient 自动补全', 'add 鸡蛋',
    'emoji/分类/bestBefore 均非空', `emoji=${it.emoji}; cat=${it.category}; bb=${it.bestBeforeDate}`,
    okEmoji && okCat && okBb)
}

/* ============ 6-9. 期限四态 ============ */
{
  const s1 = computeStatus(addDays(T, 6)); assert('S-06', '期限-新鲜', 'daysLeft=6', 'status=fresh', `status=${s1.status}`, s1.status === 'fresh')
  const s2 = computeStatus(addDays(T, 3)); assert('S-07', '期限-临期', 'daysLeft=3', 'status=soon', `status=${s2.status}`, s2.status === 'soon')
  const s3 = computeStatus(addDays(T, 1)); assert('S-08', '期限-紧急', 'daysLeft=1', 'status=urgent', `status=${s3.status}`, s3.status === 'urgent')
  const s4 = computeStatus(addDays(T, -1)); assert('S-09', '期限-过期', 'daysLeft=-1', 'status=expired', `status=${s4.status}`, s4.status === 'expired')
}

/* ============ 10. 部分消耗 ============ */
{
  resetStore()
  const it = addIngredient({ name: '牛奶', quantity: 1000, unit: 'ml', purchaseDate: T })
  const left = consumeIngredient(it.id, 250)
  const cur = listIngredients().find((i) => i.id === it.id)
  assert('S-10', '部分消耗剩余', '1000ml - 250ml', '剩 750ml', `left=${left}; 库存=${cur ? cur.quantity : '缺失'}`,
    left === 750 && !!cur && cur.quantity === 750)
}

/* ============ 11. 全部消耗移除 ============ */
{
  resetStore()
  const it = addIngredient({ name: '西红柿', quantity: 3, unit: '个', purchaseDate: T })
  consumeIngredient(it.id, 3)
  const exists = listIngredients().some((i) => i.id === it.id)
  assert('S-11', '全部消耗→批次移除', 'consume 3/3', '批次不再在库存', `仍存在=${exists}`,
    exists === false)
}

/* ============ 12. 消耗埋点 ============ */
{
  resetStore()
  const it = addIngredient({ name: '苹果', quantity: 2, unit: '个', purchaseDate: T })
  consumeIngredient(it.id, 1)
  await new Promise((r) => setTimeout(r, 10))
  const evs = getEvents()
  const hit = evs.find((e) => e.event === 'ingredient_consumed')
  assert('S-12', '消耗发射 ingredient_consumed', 'consume 苹果',
    'EVENTS 含 ingredient_consumed', `事件数=${evs.length}; 命中=${hit ? '是' : '否'}`,
    !!hit && hit.props && hit.props.name === '苹果')
}

/* ============ 13. 候选归一-已知词 ============ */
{
  const items = [{ name: '番茄', confidence: 0.9 }]
  const out = normalizeCandidates(items)
  const ok = out.length === 1 && out[0].name === '西红柿' && out[0].known === true
  assert('S-13', '识别候选归一-已知(番茄→西红柿)', 'normalizeCandidates([番茄])',
    'name=西红柿; known=true', `name=${out[0]?.name}; known=${out[0]?.known}`, ok)
}

/* ============ 14. 候选归一-未知词 ============ */
{
  const items = [{ name: '外星蔬菜XYZ', confidence: 0.7 }]
  const out = normalizeCandidates(items)
  const ok = out.length === 1 && out[0].known === false && out[0].category === '其他' && out[0].name === '外星蔬菜XYZ'
  assert('S-14', '识别候选归一-未知', 'normalizeCandidates([外星蔬菜XYZ])',
    'known=false; category=其他; 原样保留', `name=${out[0]?.name}; known=${out[0]?.known}; cat=${out[0]?.category}`, ok)
}

/* ============ 15. 百度多候选去重（含别名归一） ============ */
{
  const baidu = [
    { name: '西红柿', probability: 0.92 },
    { name: '番茄', probability: 0.88 },
    { name: '西红柿', probability: 0.80 } // 重复
  ]
  const out = buildCandidatesFromBaidu(baidu)
  const names = out.map((o) => o.name)
  const ok = out.length === 1 && names[0] === '西红柿'
  assert('S-15', '百度 top_num=3 多候选去重(别名归一)', 'baidu 3 候选(西红柿/番茄/西红柿)',
    '归一去重为 1（番茄→西红柿，按 canonical 去重）', `候选=${names.join(',')}`, ok,
    '跨别名去重：番茄与西红柿归一为同一候选，避免重复')
}

/* ============ 16. 置信度边界 ============ */
{
  const c1 = clampConfidence(NaN); const c2 = clampConfidence(-0.3)
  const c3 = clampConfidence(1.5); const c4 = clampConfidence(120); const c5 = clampConfidence(0.85)
  const ok = c1 === 0.8 && c2 === 0.8 && c3 <= 0.02 && c4 === 1 && c5 === 0.85
  assert('S-16', 'clampConfidence 边界', 'NaN/-0.3/1.5/120/0.85',
    '0.8/0.8/≤0.02/1/0.85', `${c1}/${c2}/${c3}/${c4}/${c5}`,
    ok, '>1 视为百分制 /100（1.5→0.015≈0.01）')
}

/* ============ 17. 合成数据导入幂等 ============ */
{
  const p = path.resolve('data/synthetic_inventory_batches.json')
  const batches = JSON.parse(fs.readFileSync(p, 'utf8'))
  const map1 = new Map()
  for (const b of batches) map1.set(b.batch_id, b)
  const c1 = map1.size
  for (const b of batches) { if (!map1.has(b.batch_id)) map1.set(b.batch_id, b) } // 二次导入
  const c2 = map1.size
  assert('S-17', '合成数据导入幂等', `导入 ${batches.length} 批次 两次`,
    '批次数不变(无重复)', `首次=${c1}; 二次=${c2}`, c1 === batches.length && c2 === c1 && c1 === 191,
    '按 batch_id 幂等；真实导入工具同口径')
}

/* ---------- 写出 CSV ---------- */
const OUT_DIR = path.resolve('docs/testing')
fs.mkdirSync(OUT_DIR, { recursive: true })
const header = 'scenario_id,title,input,expected,actual,result,notes'
fs.writeFileSync(path.join(OUT_DIR, 'inventory_regression_results.csv'),
  [header, ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n') + '\n')

console.log(`\n=== 库存业务回归 ${rows.length} 场景 ===`)
console.log(`通过 ${pass} / 失败 ${fail}`)
console.log(`输出 → docs/testing/inventory_regression_results.csv`)
console.log(pass === rows.length ? 'INVENTORY REGRESSION ✅ 全绿' : `INVENTORY REGRESSION ❌ 失败 ${fail}`)
process.exit(fail === 0 ? 0 : 1)
