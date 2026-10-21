/**
 * FreshKeep · 模拟数据安全导入工具（dry-run / 幂等 / 仅 synthetic_test / 备份回滚）
 * 运行：
 *   node scripts/import_synthetic_data.mjs            # 默认 dry-run（不写）
 *   node scripts/import_synthetic_data.mjs --apply     # 真正导入
 *   node scripts/import_synthetic_data.mjs --rollback  # 回滚到最近备份
 *   node scripts/import_synthetic_data.mjs --verify    # 仅校验当前存储
 *
 * 安全约束（严格遵循迭代 Prompt §5）：
 *  - 仅接受 data_source === 'synthetic_test' 的记录；任何真实数据一律拒绝。
 *  - 默认 dry-run，必须显式 --apply 才写。
 *  - 幂等：按 user_id / batch_id / event_id 去重，重复导入不重复写入、不覆盖真实数据。
 *  - 写前自动备份到 data/.import_backup_<ts>.json；--rollback 可一键还原。
 *  - 不触碰真实单用户键 KEYS.USER；模拟用户独立存于 synthetic_users 键。
 *
 * 说明：本脚本在 Node 下用「文件后端 wx mock」模拟本地存储，与小程序内
 * utils/storage 的 get/set 调用完全一致；在真实小程序中同一逻辑直接作用于 wx 存储。
 */

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('data')
const STORE_PATH = path.join(OUT, '.fk_storage.json')
const SYNTH_USERS_KEY = 'synthetic_users' // 独立于真实单用户 USER
const PREFIX = 'fk:'

/* ---------- 文件后端 wx mock（先于任何 storage import 注入） ---------- */
function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) } catch { return {} }
}
function saveStore(s) { fs.writeFileSync(STORE_PATH, JSON.stringify(s, null, 2)) }
const _store = loadStore()
globalThis.wx = {
  getStorageSync: (k) => _store[k],
  setStorageSync: (k, v) => { _store[k] = v; saveStore(_store) },
  removeStorageSync: (k) => { delete _store[k]; saveStore(_store) },
  showToast: () => {}
}

const { get, set, KEYS } = await import('../utils/storage.ts')
const { computeStatus, computeStats, withStatus } = await import('../services/food/expiration.ts')

const APPLY = process.argv.includes('--apply')
const ROLLBACK = process.argv.includes('--rollback')
const VERIFY = process.argv.includes('--verify')

/* ---------- 备份 / 回滚 ---------- */
function latestBackup() {
  const files = fs.readdirSync(OUT).filter((f) => f.startsWith('.import_backup_')).sort()
  return files.length ? path.join(OUT, files[files.length - 1]) : null
}
function backup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const bp = path.join(OUT, `.import_backup_${ts}.json`)
  if (!fs.existsSync(STORE_PATH)) saveStore(_store) // 首次运行先落盘，避免 ENOENT
  fs.copyFileSync(STORE_PATH, bp)
  return bp
}

/* ---------- 校验：仅 synthetic_test ---------- */
function loadJson(name) {
  const p = path.join(OUT, name)
  if (!fs.existsSync(p)) { console.error(`缺少 ${name}`); process.exit(1) }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}
const users = loadJson('synthetic_users.json')
const batches = loadJson('synthetic_inventory_batches.json')
const events = loadJson('synthetic_events.json')

let bad = 0
for (const u of users) if (u.data_source !== 'synthetic_test') bad++
for (const b of batches) if (b.data_source !== 'synthetic_test') bad++
for (const e of events) if (e.data_source !== 'synthetic_test') bad++
if (bad > 0) {
  console.error(`安全拦截：发现 ${bad} 条非 synthetic_test 数据，已拒绝导入（绝不混入真实数据）`)
  process.exit(1)
}

/* ---------- 回滚 ---------- */
if (ROLLBACK) {
  const bp = latestBackup()
  if (!bp) { console.error('无可用备份'); process.exit(1) }
  fs.copyFileSync(bp, STORE_PATH)
  console.log(`已回滚到备份: ${bp}`)
  process.exit(0)
}

/* ---------- 计算导入计划（幂等） ---------- */
function plan() {
  const existingUsers = get(SYNTH_USERS_KEY, [])
  const existingIngredients = get(KEYS.INGREDIENTS, [])
  const existingEvents = get(KEYS.EVENTS, [])
  const userIds = new Set(existingUsers.map((u) => u.user_id))
  const ingIds = new Set(existingIngredients.map((i) => i.id))
  const evtIds = new Set((existingEvents || []).map((e) => e.event_id))

  const newUsers = users.filter((u) => !userIds.has(u.user_id))
  const newBatches = batches.filter((b) => !ingIds.has(b.batch_id))
  const newEvents = events.filter((e) => !evtIds.has(e.event_id))

  const toIngredients = newBatches.map((b) => ({
    id: b.batch_id,
    name: b.name,
    emoji: b.emoji,
    category: b.category,
    quantity: b.quantity,
    unit: b.unit,
    purchaseDate: b.purchaseDate,
    storageMethod: b.storageMethod,
    storageArea: b.storageArea,
    bestBeforeDate: b.bestBeforeDate,
    source: 'manual',
    confidence: undefined,
    batch_id: b.batch_id,
    data_source: 'synthetic_test',
    createdAt: Date.now()
  }))

  return { newUsers, toIngredients, newEvents, existingUsers, existingIngredients, existingEvents }
}

const p = plan()
console.log(`\n=== 导入计划（幂等） ===`)
console.log(`用户：已有 ${p.existingUsers.length} · 新增 ${p.newUsers.length} / 共 ${users.length}`)
console.log(`库存批次：已有 ${p.existingIngredients.length} · 新增 ${p.toIngredients.length} / 共 ${batches.length}`)
console.log(`事件：已有 ${p.existingEvents.length} · 新增 ${p.newEvents.length} / 共 ${events.length}`)

if (!APPLY) {
  if (VERIFY) {
    const cur = get(KEYS.INGREDIENTS, [])
    const stats = computeStats(withStatus(cur))
    console.log(`\n=== 当前存储校验（不写入） ===`)
    console.log(`synthetic_users=${get(SYNTH_USERS_KEY, []).length} · ingredients=${cur.length} · events=${(get(KEYS.EVENTS, []) || []).length}`)
    console.log(`状态统计: 新鲜 ${stats.fresh} · 临期 ${stats.soon} · 紧急 ${stats.urgent} · 过期 ${stats.expired}`)
  } else {
    console.log('\n[dry-run] 未写入。加 --apply 执行真实导入；--rollback 可回滚。')
  }
  process.exit(0)
}

/* ---------- 真实导入 ---------- */
const bp = backup()
const mergedUsers = [...p.existingUsers, ...p.newUsers]
const mergedIng = [...p.existingIngredients, ...p.toIngredients]
const mergedEvt = [...(p.existingEvents || []), ...p.newEvents]
set(SYNTH_USERS_KEY, mergedUsers)
set(KEYS.INGREDIENTS, mergedIng)
set(KEYS.EVENTS, mergedEvt)
console.log(`\n备份: ${bp}`)
console.log(`已写入 synthetic_users=${mergedUsers.length} · ingredients=${mergedIng.length} · events=${mergedEvt.length}`)

/* ---------- 校验 ---------- */
const afterUsers = get(SYNTH_USERS_KEY, [])
const afterIng = get(KEYS.INGREDIENTS, [])
const afterEvt = get(KEYS.EVENTS, [])
const okU = afterUsers.length === mergedUsers.length
const okI = afterIng.length === mergedIng.length
const okE = afterEvt.length === mergedEvt.length
// 批次独立性：同名食材应有不同 id
const names = afterIng.map((i) => i.name)
const dupNameDiffId = names.filter((n, i) => names.indexOf(n) !== i)
const stats = computeStats(withStatus(afterIng))
console.log(`\n=== 校验 ===`)
console.log(`用户数一致: ${okU} · 库存数一致: ${okI} · 事件数一致: ${okE}`)
console.log(`同名独立批次数（期望>0 证明不合并）: ${dupNameDiffId.length}`)
console.log(`库存状态统计: 新鲜 ${stats.fresh} · 临期 ${stats.soon} · 紧急 ${stats.urgent} · 过期 ${stats.expired}`)
console.log(okU && okI && okE ? 'IMPORT VERIFIED ✅' : 'IMPORT VERIFY FAILED ❌')
process.exit(okU && okI && okE ? 0 : 1)
