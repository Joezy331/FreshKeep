/**
 * FreshKeep · 30 图片测试集拉取脚本（诚实缺口版）
 * 运行：node scripts/fetch_recognition_images.mjs [--no-download] [--regenerate]
 *
 * 设计约束（严格遵循迭代 Prompt §4.2）：
 *  - ground-truth（标准标签）来自真实知识库 data/food-database.ts，绝不编造。
 *  - 覆盖全部 9 个有食材的分类，每类均匀抽样，共 30 张。
 *  - 真实图片下载：在线环境会尝试从公开图源拉取；当前环境网络被屏蔽 →
 *    统一标记 real_api_status='未执行'，不写出任何伪造的二进制图片。
 *  - 不虚构候选识别结果、不把 Mock 当真实。
 */

import fs from 'node:fs'
import path from 'node:path'

globalThis.wx = { getStorageSync: () => '', setStorageSync: () => {} }

const { FOOD_DATABASE } = await import('../data/food-database.ts')

const OUT_DIR = path.resolve('data')
const IMG_DIR = path.join(OUT_DIR, 'recognition_images')
const CSV_PATH = path.join(OUT_DIR, 'recognition_samples.csv')
const MANIFEST_PATH = path.join(IMG_DIR, 'manifest.json')

const NO_DOWNLOAD = process.argv.includes('--no-download')
const REGENERATE = process.argv.includes('--regenerate')

fs.mkdirSync(IMG_DIR, { recursive: true })

/* ---------- 1. 构建 30 张 ground-truth（round-robin 均匀覆盖分类） ---------- */
function buildSamples() {
  const byCat = {}
  for (const f of FOOD_DATABASE) {
    ;(byCat[f.category] ||= []).push(f)
  }
  const cats = Object.keys(byCat)
  const samples = []
  let i = 0
  while (samples.length < 30) {
    const cat = cats[i % cats.length]
    const list = byCat[cat]
    const f = list[Math.floor(i / cats.length) % list.length]
    if (!samples.some((s) => s.expected_name === f.name)) {
      samples.push({
        sample_id: `S${String(samples.length + 1).padStart(2, '0')}`,
        category: f.category,
        expected_name: f.name,
        aliases: (f.aliases || []).join('|'),
        default_storage_method: (f.options && f.options[0] && f.options[0].method) || '',
        search_query: `${f.name} 食材 实物图`,
        image_url: '',
        image_local_path: '',
        real_api_status: '未执行',
        notes: 'ground-truth 来自知识库；真实图片/真实API待联网环境执行'
      })
    }
    i++
    if (i > 500) break // 安全阀
  }
  return samples
}

let samples
if (fs.existsSync(CSV_PATH) && !REGENERATE) {
  // 已存在则读取，避免重复生成（幂等）
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n')
  samples = lines.slice(1).map((l) => {
    const c = l.split(',')
    return {
      sample_id: c[0], category: c[1], expected_name: c[2], aliases: c[3],
      default_storage_method: c[4], search_query: c[5], image_url: c[6],
      image_local_path: c[7], real_api_status: c[8], notes: c[9] || ''
    }
  })
  console.log(`已读取现有 ${samples.length} 条 ground-truth（--regenerate 可重建）`)
} else {
  samples = buildSamples()
  const header = 'sample_id,category,expected_name,aliases,default_storage_method,search_query,image_url,image_local_path,real_api_status,notes'
  const rows = samples.map((s) =>
    [s.sample_id, s.category, s.expected_name, s.aliases, s.default_storage_method,
      s.search_query, s.image_url, s.image_local_path, s.real_api_status, s.notes].join(',')
  )
  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n') + '\n')
  console.log(`已写出 ${samples.length} 条 ground-truth → data/recognition_samples.csv`)
}

/* ---------- 2. 尝试下载真实图片（网络不可用则诚实标记未执行） ---------- */
async function tryDownload(s) {
  if (NO_DOWNLOAD) {
    return { status: '未执行', reason: '当前环境网络被屏蔽（--no-download），未发起下载' }
  }
  const query = encodeURIComponent(s.search_query)
  const url = `https://source.unsplash.com/featured/?${query}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) return { status: '未执行', reason: `HTTP ${res.status}` }
    const buf = Buffer.from(await res.arrayBuffer())
    const ext = res.headers.get('content-type')?.includes('png') ? 'png' : 'jpg'
    const file = path.join(IMG_DIR, `${s.sample_id}.${ext}`)
    fs.writeFileSync(file, buf)
    return { status: '已下载', path: file }
  } catch (e) {
    return { status: '未执行', reason: `网络不可用: ${e.name}` }
  } finally {
    clearTimeout(timer)
  }
}

const manifest = {
  generated_at: new Date().toISOString(),
  source: 'data/food-database.ts（真实知识库）',
  total: samples.length,
  network_available: !NO_DOWNLOAD,
  images: []
}

if (NO_DOWNLOAD) {
  for (const s of samples) {
    manifest.images.push({ sample_id: s.sample_id, expected_name: s.expected_name, status: '未执行', reason: '未发起下载' })
  }
  console.log('跳过下载（--no-download）：30 张全部标记 real_api_status=未执行')
} else {
  for (const s of samples) {
    const r = await tryDownload(s)
    s.real_api_status = r.status
    if (r.status === '已下载') s.image_local_path = path.basename(r.path)
    manifest.images.push({ sample_id: s.sample_id, expected_name: s.expected_name, status: r.status, reason: r.reason || '' })
  }
  // 回写 CSV 的 real_api_status
  const header = 'sample_id,category,expected_name,aliases,default_storage_method,search_query,image_url,image_local_path,real_api_status,notes'
  const rows = samples.map((s) =>
    [s.sample_id, s.category, s.expected_name, s.aliases, s.default_storage_method,
      s.search_query, s.image_url, s.image_local_path, s.real_api_status, s.notes].join(',')
  )
  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n') + '\n')
}

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
console.log(`manifest → data/recognition_images/manifest.json`)
console.log(`图片已下载: ${manifest.images.filter((i) => i.status === '已下载').length} / ${samples.length}`)
console.log(`图片标记未执行: ${manifest.images.filter((i) => i.status === '未执行').length} / ${samples.length}`)
console.log('RECOGNITION IMAGE SET ✅（诚实缺口已记录）')
