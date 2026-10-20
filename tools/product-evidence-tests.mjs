/**
 * FreshKeep 产品证据测试（真实执行核心业务逻辑，不依赖微信开发者工具）
 * 运行：node --experimental-strip-types --import ./tools/hooks.mjs tools/product-evidence-tests.mjs
 *
 * 说明：
 * - 本脚本直接 import 项目内真实模块（expiration / fridge / storage-advice / recommend），
 *   在 Node + wx mock 环境下执行真实计算，输出可复现的测试结果（类别 B：实际测试结果）。
 * - 百度智能云菜品识别属于「需真实密钥的联网调用」，本机无可用 Key（密钥已移除待轮换），
 *   故 recognition 测试不在本脚本执行，仅在 recognition_test_results.csv 留模板并标记「未执行」。
 * - 所有日期均相对“今天”推算，保证 daysLeft 计算可复现。
 */

const fs = await import('node:fs')
const path = await import('node:path')

/* ---------- 1. 微信运行时 mock ---------- */
const store = {}
globalThis.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: (k) => { delete store[k] },
  showToast: () => {},
  getRealtimeLogManager: () => ({ info: () => {} }),
  request: () => {},
  getFileSystemManager: () => ({ readFileSync: () => 'FAKE' })
}

/* ---------- 2. 引入真实模块 ---------- */
const { today, addDays } = await import('../utils/date.ts')
const { computeStatus, calcBestBefore, computeStats, URGENT_DAYS, SOON_DAYS } =
  await import('../services/food/expiration.ts')
const { addIngredient, consumeIngredient, removeIngredient, updateIngredient, listIngredients } =
  await import('../services/food/fridge.ts')
const { getStorageAdvice, defaultAreaForMethod } = await import('../services/food/storage-advice.ts')
const { recommendRecipes } = await import('../services/recipe/recommend.ts')
const { buildReminders, unreadCount, markAllRead } = await import('../services/notification/reminder.ts')

const T = today()
const TODAY_STR = T
const OUT = path.resolve('docs/product-evidence')

/* ---------- 工具：构造食材 ---------- */
function mk(name, status = 'fresh', daysLeft = 6) {
  const bb = addDays(T, daysLeft)
  return {
    id: 't_' + name, name, emoji: '', category: '', quantity: 1, unit: '份',
    purchaseDate: T, storageMethod: '冷藏', storageArea: '',
    bestBeforeDate: bb, source: 'manual', createdAt: 0, status, daysLeft
  }
}

/* ===================================================================== */
/* 测试一：保鲜 / 临期规则（≥20 条）                                       */
/* ===================================================================== */
const storageRows = []
let sPass = 0, sFail = 0
function sAssert(id, scenario, input, expected, actual, ok, notes = '') {
  storageRows.push([id, scenario, input, expected, actual, ok ? '通过' : '失败', notes])
  ok ? sPass++ : sFail++
}

// 辅助：取 KEYS.INGREDIENTS
const { KEYS } = await import('../utils/storage.ts')
const ING = KEYS.INGREDIENTS
// 每个用例前清空共享库存，避免跨用例状态污染
// 注意：utils/storage 以 PREFIX='fk:' 前缀写键，真实键为 'fk:'+KEYS.INGREDIENTS
function resetStore() { store['fk:' + ING] = [] }
resetStore()

// T01 新录入食材 → 状态 fresh
{
  resetStore()
  const it = addIngredient({ name: '西红柿', quantity: 2, unit: '个', purchaseDate: T })
  const st = computeStatus(it.bestBeforeDate)
  sAssert('S01', '新录入食材(西红柿/冷藏)', `purchase=${T}`,
    `bestBefore=${addDays(T, 6)}; status=fresh; daysLeft≈6`,
    `bestBefore=${it.bestBeforeDate}; status=${st.status}; daysLeft=${st.daysLeft}`,
    it.bestBeforeDate === addDays(T, 6) && st.status === 'fresh' && st.daysLeft === 6)
}
// T02 未填写购买日期 → 默认今天
{
  resetStore()
  const it = addIngredient({ name: '鸡蛋', quantity: 6, unit: '个', purchaseDate: '' })
  sAssert('S02', '未填购买日期(鸡蛋)', 'purchaseDate=""',
    `purchaseDate 回退为今天(${T}); bestBefore=${addDays(T, 30)}`,
    `purchase=${it.purchaseDate}; bestBefore=${it.bestBeforeDate}`,
    it.purchaseDate === T && it.bestBeforeDate === addDays(T, 30))
}
// T03 冷藏 西红柿 6 天
{
  const a = getStorageAdvice('西红柿', '冷藏')
  sAssert('S03', '保存建议-冷藏(西红柿)', 'method=冷藏',
    'area=蔬果保鲜区; days=6', `area=${a.area}; days=${a.days}`,
    a.area === '蔬果保鲜区' && a.days === 6)
}
// T04 常温 西红柿 3 天（切换保存方式）
{
  const a = getStorageAdvice('西红柿', '常温')
  sAssert('S04', '保存建议-常温(西红柿)', 'method=常温',
    'area=常温区; days=3', `area=${a.area}; days=${a.days}`,
    a.area === '常温区' && a.days === 3)
}
// T05 鸡蛋 冷藏 30 天 门架区
{
  const a = getStorageAdvice('鸡蛋', '冷藏')
  sAssert('S05', '保存建议-冷藏(鸡蛋)', 'method=冷藏',
    'area=门架区; days=30', `area=${a.area}; days=${a.days}`,
    a.area === '门架区' && a.days === 30)
}
// T06 鸡蛋 切换常温 → 10 天 常温区
{
  const a = getStorageAdvice('鸡蛋', '常温')
  const area = defaultAreaForMethod('鸡蛋', '常温')
  sAssert('S06', '保存方式切换(鸡蛋 冷藏→常温)', 'method=常温',
    'area=常温区; days=10', `area=${a.area}; days=${a.days}; defaultArea=${area}`,
    a.area === '常温区' && a.days === 10 && area === '常温区')
}
// T07 临期边界 daysLeft=3 → soon
{
  const st = computeStatus(addDays(T, 3))
  sAssert('S07', '临期阈值边界(剩3天)', `bestBefore=${addDays(T, 3)}`,
    `status=soon (SOON_DAYS=${SOON_DAYS})`, `status=${st.status}; daysLeft=${st.daysLeft}`,
    st.status === 'soon' && st.daysLeft === 3)
}
// T08 临期边界 daysLeft=2 → soon
{
  const st = computeStatus(addDays(T, 2))
  sAssert('S08', '临期阈值边界(剩2天)', `bestBefore=${addDays(T, 2)}`,
    'status=soon', `status=${st.status}`, st.status === 'soon')
}
// T09 紧急边界 daysLeft=1 → urgent
{
  const st = computeStatus(addDays(T, 1))
  sAssert('S09', '紧急阈值边界(剩1天)', `bestBefore=${addDays(T, 1)}`,
    `status=urgent (URGENT_DAYS=${URGENT_DAYS})`, `status=${st.status}; daysLeft=${st.daysLeft}`,
    st.status === 'urgent' && st.daysLeft === 1)
}
// T10 紧急边界 daysLeft=0 → urgent（今天到期）
{
  const st = computeStatus(T)
  sAssert('S10', '边界(今天到期 daysLeft=0)', `bestBefore=${T}`,
    'status=urgent', `status=${st.status}; daysLeft=${st.daysLeft}`,
    st.status === 'urgent' && st.daysLeft === 0)
}
// T11 过期 daysLeft=-1 → expired
{
  const st = computeStatus(addDays(T, -1))
  sAssert('S11', '过期(已过1天)', `bestBefore=${addDays(T, -1)}`,
    'status=expired; daysLeft=-1', `status=${st.status}; daysLeft=${st.daysLeft}`,
    st.status === 'expired' && st.daysLeft === -1)
}
// T12 跨天推算 calcBestBefore
{
  const bb = calcBestBefore(addDays(T, -5), 10)
  sAssert('S12', '最佳食用期推算(购于5天前+10天)', `purchase=${addDays(T, -5)}; +10d`,
    `bestBefore=${addDays(T, 5)}`, `bestBefore=${bb}`, bb === addDays(T, 5))
}
// S13 修改购买日期 → 最佳食用期重算（D1：已修复，回归）
{
  resetStore()
  const it = addIngredient({ name: '白菜', quantity: 1, unit: '颗', purchaseDate: T })
  const days = getStorageAdvice('白菜', '冷藏').days
  const upd = updateIngredient(it.id, { purchaseDate: addDays(T, -5) })
  const after = upd.bestBeforeDate
  const expect = addDays(addDays(T, -5), days)
  sAssert('S13', '修改购买日期→最佳食用期重算', `purchase ${T} → ${addDays(T, -5)}`,
    `bestBefore 应重算为 ${expect}（+${days}天）`, `bestBefore=${after}`,
    after === expect, '已修复(D1)：purchaseDate 变更后按保存天数重算 bestBefore（回归通过）')
}
// S14 修改保存方式 → 分区联动（D2：已修复，回归）
{
  resetStore()
  const it = addIngredient({ name: '牛肉', quantity: 300, unit: 'g', purchaseDate: T }) // 默认 冷冻/冷冻区
  const upd = updateIngredient(it.id, { storageMethod: '冷藏' })
  sAssert('S14', '修改保存方式→分区联动', 'method 冷冻→冷藏',
    'area 应随 method 更新为 冷藏区', `area=${upd.storageArea}（method=${upd.storageMethod}）`,
    upd.storageArea === '冷藏区' && upd.storageMethod === '冷藏',
    '已修复(D2)：storageMethod 变更后同步 storageArea（回归通过）')
}
// T15 删除食材
{
  resetStore()
  const it = addIngredient({ name: '生菜', quantity: 1, unit: '颗', purchaseDate: T })
  const ok = removeIngredient(it.id)
  const left = listIngredients().length
  sAssert('S15', '删除食材', `remove id=${it.id}`, '删除成功; 列表=0',
    `ok=${ok}; 列表=${left}`, ok === true && left === 0)
}
// S16 同一食材两次录入 → 两个独立批次（批次模型，不做合并）
{
  resetStore()
  const a = addIngredient({ name: '西红柿', quantity: 2, unit: '个', purchaseDate: T })
  const b = addIngredient({ name: '西红柿', quantity: 3, unit: '个', purchaseDate: T })
  const all = listIngredients().filter((i) => i.name === '西红柿')
  const distinct = new Set(all.map((i) => i.id)).size
  sAssert('S16', '重复录入(同名两次)→批次独立', 'add 西红柿 x2',
    '应生成 2 个独立批次（不同 id），不合并', `批次数=${all.length}; 唯一 id 数=${distinct}`,
    all.length === 2 && distinct === 2 && a.id !== b.id,
    '批次语义：每次入库=独立批次；不做同名合并（见 optimization_audit.md）')
}
// T17 消耗后库存更新
{
  resetStore()
  const it = addIngredient({ name: '西红柿', quantity: 3, unit: '个', purchaseDate: T })
  const left1 = consumeIngredient(it.id, 1)
  const left2 = consumeIngredient(it.id, 3) // 剩余 2，再吃 3 → 归零移除
  const exists = listIngredients().some((i) => i.id === it.id)
  sAssert('S17', '消耗扣减(3→吃1→吃3)', `consume 1 then 3`,
    '第一次剩2; 第二次归零移除', `left1=${left1}; left2=${left2}; 仍存在=${exists}`,
    left1 === 2 && left2 === 0 && exists === false)
}
// T18 提醒触发-统计(urgent+expired)
{
  const list = [mk('a', 'urgent', 1), mk('b', 'expired', -2), mk('c', 'fresh', 6), mk('d', 'soon', 3)]
  const stats = computeStats(list)
  sAssert('S18', '提醒统计(attention=urgent+expired)', '1 urgent + 1 expired + 1 fresh + 1 soon',
    'attention=2; urgent=1; expired=1', `attention=${stats.attention}; urgent=${stats.urgent}; expired=${stats.expired}`,
    stats.attention === 2 && stats.urgent === 1 && stats.expired === 1)
}
// T19 提醒阈值: <=1 紧急, <=3 临期
{
  const u = computeStatus(addDays(T, 1)).status
  const s = computeStatus(addDays(T, 3)).status
  sAssert('S19', '提醒阈值(紧急<=1天 / 临期<=3天)', 'daysLeft=1 与 3',
    'urgent / soon', `${u} / ${s}`, u === 'urgent' && s === 'soon')
}
// T20 未收录食材 → 兜底建议
{
  const a = getStorageAdvice('不存在的食材XYZ')
  sAssert('S20', '未收录食材兜底', 'name=不存在的食材XYZ',
    'method=冷藏; area=冷藏区; days=5 (FALLBACK)', `method=${a.method}; area=${a.area}; days=${a.days}`,
    a.method === '冷藏' && a.area === '冷藏区' && a.days === 5)
}

/* ---------- 批次独立性与日期边界（P0 数据正确性） ---------- */
// S21 批次独立性：编辑 A 不影响 B
{
  resetStore()
  const a = addIngredient({ name: '西红柿', quantity: 2, unit: '个', purchaseDate: T })
  const b = addIngredient({ name: '西红柿', quantity: 3, unit: '个', purchaseDate: addDays(T, -2) })
  const bBefore = listIngredients().find((i) => i.id === b.id)
  updateIngredient(a.id, { purchaseDate: addDays(T, -5) })
  const A = listIngredients().find((i) => i.id === a.id)
  const B = listIngredients().find((i) => i.id === b.id)
  sAssert('S21', '批次独立性：编辑 A 不影响 B', '两批西红柿，只改 A 购买日期',
    'A 重算；B 的数量/购买日期/到期日不变',
    `A.q=${A ? A.quantity : '缺失'} A.bb=${A ? A.bestBeforeDate : '缺失'}; B.q=${B ? B.quantity : '缺失'} B.purchase=${B ? B.purchaseDate : '缺失'}`,
    !!A && !!B && B.quantity === 3 && B.purchaseDate === addDays(T, -2) &&
      bBefore && B.bestBeforeDate === bBefore.bestBeforeDate,
    '批次按 id 独立存储与更新')
}
// S22 批次独立性：消耗 A 不影响 B
{
  resetStore()
  const a = addIngredient({ name: '鸡蛋', quantity: 3, unit: '个', purchaseDate: T })
  const b = addIngredient({ name: '鸡蛋', quantity: 5, unit: '个', purchaseDate: T })
  consumeIngredient(a.id, 3) // A 归零移除
  const after = listIngredients().filter((i) => i.name === '鸡蛋')
  const B = after.find((i) => i.id === b.id)
  sAssert('S22', '批次独立性：消耗 A 不影响 B', '两批鸡蛋，吃光 A',
    'A 移除；B 仍剩 5', `剩余批次=${after.length}; B.q=${B ? B.quantity : '缺失'}`,
    after.length === 1 && !!B && B.quantity === 5,
    '消耗按指定批次 id 扣减，不误伤同名批次')
}
// S23 日期边界：跨年
{
  const r = addDays('2026-12-30', 5)
  sAssert('S23', '日期边界：跨年', '2026-12-30 + 5 天', '2027-01-04', r, r === '2027-01-04')
}
// S24 日期边界：闰年 2 月
{
  const r = addDays('2028-02-28', 2)
  sAssert('S24', '日期边界：闰年2月', '2028-02-28 + 2 天（2028 闰年）', '2028-03-01', r, r === '2028-03-01')
}
// S25 日期边界：跨月
{
  const r = addDays('2026-10-31', 1)
  sAssert('S25', '日期边界：跨月', '2026-10-31 + 1 天', '2026-11-01', r, r === '2026-11-01')
}
// S26 部分消耗剩余数量
{
  resetStore()
  const it = addIngredient({ name: '牛奶', quantity: 1000, unit: 'ml', purchaseDate: T })
  const left = consumeIngredient(it.id, 250)
  const cur = listIngredients().find((i) => i.id === it.id)
  sAssert('S26', '部分消耗剩余', '1000ml 消耗 250ml', '剩 750ml',
    `left=${left}; 库存=${cur ? cur.quantity : '缺失'}`,
    left === 750 && !!cur && cur.quantity === 750)
}

/* ===================================================================== */
/* 测试二：菜谱推荐（≥20 组库存组合）                                       */
/* ===================================================================== */
const recipeRows = []
let rPass = 0, rFail = 0
function rAssert(id, inv, expected, actual, ok, notes = '') {
  recipeRows.push([id, inv, expected, actual, ok ? '通过' : '失败', notes])
  ok ? rPass++ : rFail++
}

// R01 全齐 西红柿+鸡蛋 → 西红柿炒鸡蛋 满匹配
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R01', '西红柿+鸡蛋(全齐)', '西红柿炒鸡蛋 满匹配, 无需额外购买',
    hit ? `matched=${hit.matchedIngredients}; missing=${hit.missingIngredients}; extra=${hit.noExtraBuy}` : '未推荐',
    !!hit && hit.matchedIngredients.length === 2 && hit.missingIngredients.length === 0 && hit.noExtraBuy === true)
}
// R02 仅西红柿 → 缺鸡蛋
{
  const f = [mk('西红柿', 'fresh', 6)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R02', '仅西红柿', '西红柿炒鸡蛋 缺鸡蛋',
    hit ? `missing=${hit.missingIngredients}` : '未推荐',
    !!hit && hit.missingIngredients.includes('鸡蛋'))
}
// R03 仅鸡蛋 → 缺西红柿
{
  const f = [mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R03', '仅鸡蛋', '西红柿炒鸡蛋 缺西红柿',
    hit ? `missing=${hit.missingIngredients}` : '未推荐',
    !!hit && hit.missingIngredients.includes('西红柿'))
}
// R04 菠菜(soon)+鸡蛋 → 菠菜系菜 优先消耗
{
  const f = [mk('菠菜', 'soon', 2), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { useExpiring: true, limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_spinach_egg_soup')
  rAssert('R04', '菠菜(临期)+鸡蛋', '菠菜鸡蛋汤 命中且 useFirst 含菠菜',
    hit ? `useFirst=${hit.useFirst.map((u) => u.name)}` : '未推荐',
    !!hit && hit.useFirst.some((u) => u.name === '菠菜'))
}
// R05 空冰箱 → 无推荐
{
  const recs = recommendRecipes([], {})
  rAssert('R05', '空库存', '推荐数=0', `推荐数=${recs.length}`, recs.length === 0)
}
// R06 别名 番茄 → 应归一为西红柿并推荐（D3 修复验证）
{
  const f = [mk('番茄', 'fresh', 6), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R06', '别名库存(番茄)', '番茄应归一为西红柿并推荐西红柿炒鸡蛋',
    hit ? `已推荐(matched=${hit.matchedIngredients})` : '未推荐(缺西红柿)',
    !!hit, '已修复(D3): 菜谱匹配前用 findFood 归一别名')
}
// R07 onlyFridge 仅西红柿 → 排除需鸡蛋的菜
{
  const f = [mk('西红柿', 'fresh', 6)]
  const recs = recommendRecipes(f, { onlyFridge: true, limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R07', 'onlyFridge=真 仅西红柿', '西红柿炒鸡蛋 应被排除',
    hit ? '仍推荐' : '已排除', !hit)
}
// R08 noSpicy 过滤
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30), mk('牛肉', 'fresh', 2), mk('葱', 'fresh', 5)]
  const all = recommendRecipes(f, {})
  const noSpicy = recommendRecipes(f, { noSpicy: true })
  const allSpicy = all.filter((r) => r.recipe.spicy).length
  rAssert('R08', 'noSpicy 过滤', `返回菜均无 spicy（库内 spicy 菜=${allSpicy}）`,
    `all=${all.length}; noSpicy=${noSpicy.length}`,
    noSpicy.every((r) => !r.recipe.spicy) && noSpicy.length >= 0)
}
// R09 maxTime=10
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30), mk('菠菜', 'fresh', 6)]
  const recs = recommendRecipes(f, { maxTime: 10 })
  rAssert('R09', 'maxTime=10', '返回菜 time<=10',
    `time=[${recs.map((r) => r.recipe.time)}]`, recs.every((r) => r.recipe.time <= 10))
}
// R10 useExpiring 排序（菠菜 soon 排前）
{
  const f = [mk('西红柿', 'fresh', 6), mk('菠菜', 'soon', 2), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { useExpiring: true, limit: 3 })
  const top = recs[0]
  rAssert('R10', 'useExpiring 排序', 'Top1 应优先消耗临期(菠菜)菜',
    `top=${top ? top.recipe.name + ' useFirst=' + top.useFirst.map((u) => u.name) : '无'}`,
    !!top && top.useFirst.length > 0 && top.useFirst[0].name === '菠菜')
}
// R11 牛肉+葱 → 葱爆牛肉 满匹配
{
  const f = [mk('牛肉', 'fresh', 2), mk('葱', 'fresh', 5)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_scallion_beef')
  rAssert('R11', '牛肉+葱', '葱爆牛肉 满匹配(姜/生抽/油为可选或常备)',
    hit ? `matched=${hit.matchedIngredients}; missing=${hit.missingIngredients}` : '未推荐',
    !!hit && hit.matchedIngredients.length >= 2 && hit.missingIngredients.length === 0)
}
// R12 仅牛肉 → 缺葱
{
  const f = [mk('牛肉', 'fresh', 2)]
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_scallion_beef')
  rAssert('R12', '仅牛肉', '葱爆牛肉 缺葱',
    hit ? `missing=${hit.missingIngredients}` : '未推荐',
    !!hit && hit.missingIngredients.includes('葱'))
}
// R13 消耗后库存更新 → 仅鸡蛋
{
  resetStore()
  const tom = addIngredient({ name: '西红柿', quantity: 1, unit: '个', purchaseDate: T })
  addIngredient({ name: '鸡蛋', quantity: 3, unit: '个', purchaseDate: T })
  consumeIngredient(tom.id, 1) // 西红柿归零移除
  const f = listIngredients().map((i) => mk(i.name, 'fresh', 6))
  const recs = recommendRecipes(f, { limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg')
  rAssert('R13', '消耗西红柿后库存', '西红柿炒鸡蛋 应缺西红柿',
    hit ? `missing=${hit.missingIngredients}; 库存=[${f.map((i) => i.name)}]` : '未推荐',
    !!hit && hit.missingIngredients.includes('西红柿') && !f.some((i) => i.name === '西红柿'))
}
// R14 多食材组合
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30), mk('菠菜', 'fresh', 6), mk('葱', 'fresh', 5)]
  const recs = recommendRecipes(f, { limit: 10 })
  rAssert('R14', '多食材(西红柿/鸡蛋/菠菜/葱)', '推荐数>=3',
    `推荐数=${recs.length}`, recs.length >= 3)
}
// R15 临期优先(菠菜 urgent)
{
  const f = [mk('西红柿', 'fresh', 6), mk('菠菜', 'urgent', -1)]
  const recs = recommendRecipes(f, { useExpiring: true, limit: 3 })
  rAssert('R15', '菠菜已紧急(-1天)', 'Top 含菠菜菜且 useFirst 含菠菜',
    `top=${recs[0] ? recs[0].recipe.name : '无'}`,
    !!recs[0] && recs[0].useFirst.some((u) => u.name === '菠菜'))
}
// R16 推荐食材均来自库存
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { limit: 10 })
  const names = new Set(f.map((i) => i.name))
  const allFromFridge = recs.every((r) => r.matchedIngredients.every((m) => names.has(m)))
  rAssert('R16', '推荐仅用库存已有食材', 'matched ⊆ 库存',
    `全部来自库存=${allFromFridge}`, allFromFridge)
}
// R17 keyword='面'
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { keyword: '面', limit: 5 })
  const hit = recs.find((r) => r.recipe.id === 'r_tomato_egg_noodle')
  rAssert('R17', 'keyword=面', '番茄鸡蛋面 命中',
    hit ? `命中 ${hit.recipe.name}` : '未命中', !!hit)
}
// R18 仅常备/可选食材 → 无推荐
{
  const f = [mk('面条', 'fresh', 30)]
  const recs = recommendRecipes(f, { limit: 5 })
  rAssert('R18', '仅面条(optional)库存', '推荐数=0',
    `推荐数=${recs.length}`, recs.length === 0)
}
// R19 西红柿+葱(无鸡蛋) → 两蛋菜均缺鸡蛋
{
  const f = [mk('西红柿', 'fresh', 6), mk('葱', 'fresh', 5)]
  const recs = recommendRecipes(f, { limit: 5 })
  const eggDishes = ['r_tomato_egg', 'r_tomato_egg_noodle', 'r_spinach_egg_soup'].filter((id) =>
    recs.some((r) => r.recipe.id === id))
  const allMissingEgg = recs
    .filter((r) => ['r_tomato_egg', 'r_tomato_egg_noodle', 'r_spinach_egg_soup'].includes(r.recipe.id))
    .every((r) => r.missingIngredients.includes('鸡蛋'))
  rAssert('R19', '西红柿+葱(无鸡蛋)', '相关蛋菜均缺鸡蛋',
    `命中蛋菜=${eggDishes.length}; 均缺鸡蛋=${allMissingEgg}`,
    eggDishes.length > 0 && allMissingEgg)
}
// R20 useExpiring 无临期 → 按 matchScore
{
  const f = [mk('西红柿', 'fresh', 6), mk('鸡蛋', 'fresh', 30)]
  const recs = recommendRecipes(f, { useExpiring: true, limit: 5 })
  const sorted = recs.every((r, i) => i === 0 || recs[i - 1].matchScore >= r.matchScore)
  rAssert('R20', 'useExpiring 无临期→按分数', '结果按 matchScore 降序',
    `scores=[${recs.map((r) => r.matchScore)}]`, sorted)
}

/* ===================================================================== */
/* 测试三：临期提醒（逻辑层，非微信订阅消息推送）                             */
/* ===================================================================== */
const reminderRows = []
let nPass = 0, nFail = 0
function nAssert(id, scenario, input, expected, actual, ok, notes = '') {
  reminderRows.push([id, scenario, input, expected, actual, ok ? '通过' : '失败', notes])
  ok ? nPass++ : nFail++
}
function seedReminders() {
  resetStore()
  store['fk:' + KEYS.NOTIFICATIONS] = {}
  addIngredient({ name: '菠菜', quantity: 1, unit: '把', purchaseDate: T, bestBeforeDate: addDays(T, 1) }) // urgent
  addIngredient({ name: '牛奶', quantity: 1, unit: '盒', purchaseDate: T, bestBeforeDate: addDays(T, 3) }) // soon
  addIngredient({ name: '牛肉', quantity: 200, unit: 'g', purchaseDate: T, bestBeforeDate: addDays(T, -1) }) // expired
  addIngredient({ name: '苹果', quantity: 3, unit: '个', purchaseDate: T, bestBeforeDate: addDays(T, 10) }) // fresh
}

// N01 只对 <=3 天生成提醒，fresh 不计入
{
  seedReminders()
  const list = buildReminders()
  nAssert('N01', '提醒生成范围(<=3天)', 'urgent1/soon3/expired-1/fresh10',
    '提醒数=3，不含 fresh', `提醒数=${list.length}; 名称=[${list.map((n) => n.title)}]`,
    list.length === 3 && !list.some((n) => n.ingredientId && n.title.indexOf('苹果') >= 0),
    '逻辑层提醒：仅生成数据，未接入微信订阅消息')
}
// N02 级别与排序：expired → urgent → soon
{
  seedReminders()
  const levels = buildReminders().map((n) => n.level)
  nAssert('N02', '提醒级别与排序', '同上',
    '按 expired,urgent,soon 排序', `levels=[${levels}]`,
    levels.length === 3 && levels[0] === 'expired' && levels[1] === 'urgent' && levels[2] === 'soon')
}
// N03 过期文案
{
  seedReminders()
  const exp = buildReminders().find((n) => n.level === 'expired')
  nAssert('N03', '过期提醒文案', '牛肉已过期1天',
    '标题含「已超过…最佳食用期限」', `title=${exp ? exp.title : '无'}`,
    !!exp && exp.title.indexOf('已超过') >= 0)
}
// N04 未读数与一键已读
{
  seedReminders()
  const before = unreadCount()
  markAllRead()
  const after = unreadCount()
  nAssert('N04', '未读数→一键已读', '先读未读，再全部已读',
    '未读=3 → 0', `before=${before}; after=${after}`,
    before === 3 && after === 0)
}
// N05 全部新鲜 → 无提醒
{
  resetStore()
  store['fk:' + KEYS.NOTIFICATIONS] = {}
  addIngredient({ name: '苹果', quantity: 3, unit: '个', purchaseDate: T, bestBeforeDate: addDays(T, 10) })
  const list = buildReminders()
  nAssert('N05', '无临期→无提醒', '仅 fresh(10天)',
    '提醒数=0', `提醒数=${list.length}`, list.length === 0)
}

/* ===================================================================== */
/* 写出 CSV                                                                */
/* ===================================================================== */
const BOM = '﻿'
function toCsv(header, rows) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  return BOM + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n') + '\n'
}

fs.writeFileSync(
  path.join(OUT, 'storage_rule_test_results.csv'),
  toCsv(['用例ID', '测试场景', '输入', '预期', '实际', '结果', '备注/缺陷'], storageRows),
  'utf8'
)
fs.writeFileSync(
  path.join(OUT, 'recipe_test_results.csv'),
  toCsv(['用例ID', '库存组合', '预期', '实际', '结果', '备注/缺陷'], recipeRows),
  'utf8'
)
fs.writeFileSync(
  path.join(OUT, 'reminder_test_results.csv'),
  toCsv(['用例ID', '测试场景', '输入', '预期', '实际', '结果', '备注/缺陷'], reminderRows),
  'utf8'
)

// recognition 测试：无 Key，留模板并标记未执行（独立于单元测试，不冒充真实 API）
const recHeader = ['图片编号', '真实标签', '预测标签', '是否正确', '调用状态', '响应时间(ms)', '错误原因', '状态', '测试类型']
const recRows = [
  ['—', '—', '—', '—', '—', '—', '无可用百度 API Key/Secret（密钥已移除待轮换）；未执行真实调用', '未执行', 'real-api']
]
fs.writeFileSync(
  path.join(OUT, 'recognition_test_results.csv'),
  toCsv(recHeader, recRows),
  'utf8'
)

// 运行元数据：记录命令/时间/环境，便于审计与复现（区分单元测试 / 接口真实调用 / 真实用户）
const meta = {
  generatedAt: new Date().toISOString(),
  command: 'node --experimental-strip-types --import ./tools/hooks.mjs tools/product-evidence-tests.mjs',
  environment: { node: process.version, platform: process.platform, arch: process.arch, cwd: process.cwd() },
  suites: {
    storage: { type: 'unit', pass: sPass, fail: sFail, total: storageRows.length },
    recipe: { type: 'unit', pass: rPass, fail: rFail, total: recipeRows.length },
    reminder: { type: 'unit', pass: nPass, fail: nFail, total: reminderRows.length },
    recognition: { type: 'real-api', pass: 0, fail: 0, total: 0, executed: false, reason: 'no-baidu-key' }
  },
  note: '保鲜/菜谱/提醒为真实执行项目模块的逻辑层单元测试；百度识别为真实 API 调用，因缺密钥未执行。'
}
fs.writeFileSync(path.join(OUT, 'test_run_meta.json'), JSON.stringify(meta, null, 2), 'utf8')

console.log(`\n=== 测试结果 ===`)
console.log(`保鲜/临期规则: 通过 ${sPass} / 失败 ${sFail} / 共 ${storageRows.length}（单元测试，真实模块）`)
console.log(`菜谱推荐:     通过 ${rPass} / 失败 ${rFail} / 共 ${recipeRows.length}（单元测试，真实模块）`)
console.log(`临期提醒:     通过 ${nPass} / 失败 ${nFail} / 共 ${reminderRows.length}（逻辑层，未接入订阅消息）`)
console.log(`识别测试:     未执行（缺密钥，真实 API 未验证）`)
console.log(`CSV + test_run_meta.json 已写出至 ${OUT}`)
console.log('EVIDENCE TESTS DONE ✅')
