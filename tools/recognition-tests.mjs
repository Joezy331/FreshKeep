/**
 * FreshKeep 拍照识别 · 识别逻辑层真实单元测试
 * 运行：node --experimental-strip-types --import ./tools/hooks.mjs tools/recognition-tests.mjs
 *
 * 说明（诚实区分）：
 * - 本脚本只测试「识别逻辑层」（归一化 normalizeFoodName、候选数组构建、
 *   置信度归一、降级判定），全部为真实执行项目内纯函数，可复现。
 * - 真实模型/百度 API 调用需要密钥与联网，本机无可用 Key（密钥已移除待轮换），
 *   故 recognition_test_results.csv 中真实 API 行明确标记「未执行」，
 *   绝不冒充真实模型测试结果。
 */

const fs = await import('node:fs')
const path = await import('node:path')

/* ---------- 1. 微信运行时 mock（纯函数层实际不依赖，仅防御性） ---------- */
globalThis.wx = {
  getStorageSync: () => '',
  setStorageSync: () => {},
  getFileSystemManager: () => ({ readFileSync: () => 'FAKE' })
}

/* ---------- 2. 引入真实模块 ---------- */
const { normalizeFoodName, findFood, FOOD_DATABASE, INGREDIENT_CATEGORIES } =
  await import('../data/food-database.ts')
const { buildCandidatesFromBaidu, normalizeCandidates, clampConfidence } =
  await import('../services/ai/recognition-core.ts')

const OUT = path.resolve('docs/recognition')

/* ---------- 工具 ---------- */
const rows = []
let pass = 0,
  fail = 0
function assert(id, scenario, input, expected, actual, ok, notes = '', type = 'unit-logic') {
  rows.push([id, scenario, input, expected, actual, ok ? '通过' : '失败', notes, type])
  ok ? pass++ : fail++
}

/* ===================================================================== */
/* 一、集中式归一化 normalizeFoodName                                       */
/* ===================================================================== */
{
  const r = normalizeFoodName('番茄')
  assert(
    'R-01',
    '别名归一',
    '番茄',
    'canonical=西红柿; known=true',
    `canonical=${r.canonical}; known=${r.known}`,
    r.canonical === '西红柿' && r.known === true
  )
}
{
  const r = normalizeFoodName('圣女果')
  assert('R-02', '别名归一(圣女果)', '圣女果', 'canonical=西红柿; known=true', `canonical=${r.canonical}; known=${r.known}`, r.canonical === '西红柿' && r.known === true)
}
{
  const r = normalizeFoodName('西红杮') // 错别字，非别名
  assert('R-03', '未命中不强制映射', '西红杮', 'canonical=西红杮(原样); known=false; category=其他', `canonical=${r.canonical}; known=${r.known}; category=${r.category}`, r.canonical === '西红杮' && r.known === false && r.category === '其他', '未静默归为已知食材，交由用户确认')
}
{
  const r = normalizeFoodName('螺蛳粉')
  assert('R-04', '完全未知食材', '螺蛳粉', 'canonical=螺蛳粉; known=false; category=其他', `canonical=${r.canonical}; known=${r.known}; category=${r.category}`, r.canonical === '螺蛳粉' && r.known === false && r.category === '其他')
}
{
  const r = normalizeFoodName('   ') // 纯空白
  assert('R-05', '空输入兜底', '空白串', 'canonical 为空; known=false', `canonical="${r.canonical}"; known=${r.known}`, r.canonical === '' && r.known === false)
}
{
  const r = normalizeFoodName('鸡蛋')
  assert('R-06', '已知食材直出', '鸡蛋', 'canonical=鸡蛋; known=true; category=蛋类', `canonical=${r.canonical}; known=${r.known}; category=${r.category}`, r.canonical === '鸡蛋' && r.known === true && r.category === '蛋类')
}

/* ===================================================================== */
/* 二、候选数组构建 buildCandidatesFromBaidu（多候选 + 去重 + 未命中标记）  */
/* ===================================================================== */
{
  const items = buildCandidatesFromBaidu([
    { name: '番茄', probability: 0.9 },
    { name: '西红柿', probability: 0.8 },
    { name: '西红柿炒鸡蛋', probability: 0.7 }
  ])
  // 番茄→西红柿、西红柿→西红柿（去重）、西红柿炒鸡蛋→未知
  const ok =
    items.length === 2 &&
    items[0].name === '西红柿' &&
    items[0].known === true &&
    items[1].name === '西红柿炒鸡蛋' &&
    items[1].known === false
  assert(
    'R-07',
    '百度多候选→候选数组(去重)',
    '番茄/西红柿/西红柿炒鸡蛋',
    '长度=2；[0]西红柿(known); [1]西红柿炒鸡蛋(unknown)',
    `长度=${items.length}; [0]=${items[0].name}(${items[0].known}); [1]=${items[1].name}(${items[1].known})`,
    ok
  )
}
{
  const items = buildCandidatesFromBaidu([])
  assert('R-08', '空结果→空候选', '[]', '长度=0', `长度=${items.length}`, items.length === 0)
}
{
  const items = buildCandidatesFromBaidu([{ name: '', probability: 0.9 }])
  assert('R-09', '脏数据(空名)过滤', 'name 为空', '长度=0', `长度=${items.length}`, items.length === 0)
}
{
  // 未命中候选应叠加负偏置：0.9 + (-0.2) = 0.7
  const items = buildCandidatesFromBaidu([{ name: '螺蛳粉', probability: 0.9 }])
  assert('R-10', '未命中置信度偏置', '螺蛳粉 prob=0.9', 'confidence≈0.7(=0.9-0.2)', `confidence=${items[0] && items[0].confidence}`, !!items[0] && items[0].confidence === 0.7)
}

/* ===================================================================== */
/* 三、置信度归一 clampConfidence                                          */
/* ===================================================================== */
{
  assert('R-11', '百分制→0~1', '95', '0.95', `${clampConfidence(95)}`, clampConfidence(95) === 0.95)
  assert('R-12', '非法值兜底', '-1', '0.8', `${clampConfidence(-1)}`, clampConfidence(-1) === 0.8)
  assert('R-13', '正常 0~1 不变', '0.5', '0.5', `${clampConfidence(0.5)}`, clampConfidence(0.5) === 0.5)
  assert('R-14', '异常大值封顶', '120(百分制→1.2→封顶)', '1', `${clampConfidence(120)}`, clampConfidence(120) === 1)
}

/* ===================================================================== */
/* 四、Provider 候选二次归一化 normalizeCandidates                          */
/* ===================================================================== */
{
  const items = normalizeCandidates([{ name: '番茄', confidence: 0.9, category: '其他', storageMethod: '冷藏', storageArea: '冷藏区', recommendedDays: 5, emoji: '🥗', tips: '', known: false }])
  assert('R-15', 'Provider 候选再归一', '番茄', 'name=西红柿; known=true; category=蔬菜', `name=${items[0].name}; known=${items[0].known}; category=${items[0].category}`, items[0].name === '西红柿' && items[0].known === true && items[0].category === '蔬菜')
}
{
  const items = normalizeCandidates([
    { name: '西红柿', confidence: 0.9, category: '蔬菜', storageMethod: '冷藏', storageArea: '蔬果保鲜区', recommendedDays: 6, emoji: '🍅', tips: '', known: true },
    { name: '西红柿', confidence: 0.8, category: '蔬菜', storageMethod: '冷藏', storageArea: '蔬果保鲜区', recommendedDays: 6, emoji: '🍅', tips: '', known: true }
  ])
  assert('R-16', 'Provider 候选去重', '两条相同西红柿', '长度=1', `长度=${items.length}`, items.length === 1)
}

/* ===================================================================== */
/* 五、知识库完整性（10 分类齐备 + 条目数）                                */
/* ===================================================================== */
{
  // 「其他」是未命中兜底分类，不要求出现在食材库中；其余 9 个真实分类必须齐备
  const required = INGREDIENT_CATEGORIES.filter((c) => c !== '其他')
  const dbCats = new Set(FOOD_DATABASE.map((f) => f.category))
  const missing = required.filter((c) => !dbCats.has(c))
  assert('R-17', '9 个真实分类齐备', `库内分类=${[...dbCats].join('/')}`, '除「其他」外的分类全部命中', `缺失=${missing.join(',') || '无'}`, missing.length === 0, `当前库条目数=${FOOD_DATABASE.length}`)
}

/* ===================================================================== */
/* 写出 CSV（unit-logic 已执行 + real-api 明确未执行）                      */
/* ===================================================================== */
const BOM = '﻿'
function toCsv(header, rs) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  return BOM + [header.map(esc).join(','), ...rs.map((r) => r.map(esc).join(','))].join('\n') + '\n'
}

// 真实 API 调用：本机无密钥，明确标记未执行（不冒充）
rows.push([
  '—',
  '百度/真实视觉模型调用',
  '—',
  '需密钥与联网',
  '—',
  '未执行',
  '无可用百度/AI Key（密钥已移除待轮换）；未执行真实调用，不冒充真实模型测试',
  'real-api'
])

fs.writeFileSync(
  path.join(OUT, 'recognition_test_results.csv'),
  toCsv(['用例ID', '测试场景', '输入', '预期', '实际', '结果', '备注/缺陷', '测试类型'], rows),
  'utf8'
)

const meta = {
  generatedAt: new Date().toISOString(),
  command: 'node --experimental-strip-types --import ./tools/hooks.mjs tools/recognition-tests.mjs',
  environment: { node: process.version, platform: process.platform, arch: process.arch, cwd: process.cwd() },
  suites: {
    recognition_logic: {
      type: 'unit-logic',
      pass,
      fail,
      total: rows.filter((r) => r[7] === 'unit-logic').length
    },
    recognition_api: { type: 'real-api', executed: false, reason: 'no-api-key' }
  },
  note: '归一化/候选构建/置信度/去重/降级判定为真实执行项目纯函数；真实模型调用因缺密钥未执行。'
}
fs.writeFileSync(path.join(OUT, 'recognition_test_meta.json'), JSON.stringify(meta, null, 2), 'utf8')

console.log(`\n=== 识别逻辑层测试 ===`)
console.log(`真实单测: 通过 ${pass} / 失败 ${fail} / 共 ${rows.filter((r) => r[7] === 'unit-logic').length}`)
console.log(`真实 API: 未执行（缺密钥，明确标记，不冒充）`)
console.log(`CSV + meta 已写出至 ${OUT}`)
console.log(pass === rows.filter((r) => r[7] === 'unit-logic').length ? 'RECOGNITION TESTS DONE ✅' : 'RECOGNITION TESTS HAS FAILURES ❌')
