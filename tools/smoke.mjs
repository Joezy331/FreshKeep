/**
 * 核心逻辑冒烟测试（不依赖微信开发者工具）
 * 运行：把 data/services/utils/types 复制到一个带 {"type":"module"} 的临时目录后
 *      node --experimental-strip-types tools/smoke.mjs
 * 也可以直接在项目根目录执行：node --experimental-strip-types tools/smoke.mjs
 * （需要根目录 package.json 声明 "type": "module"，否则视为 CommonJS）
 */

// 1. 模拟微信运行时
const store = {}
globalThis.wx = {
  getStorageSync: (k) => (k in store ? store[k] : ''),
  setStorageSync: (k, v) => {
    store[k] = v
  },
  removeStorageSync: (k) => {
    delete store[k]
  },
  showToast: () => {},
  getRealtimeLogManager: () => ({ info: () => {} }),
  // 模拟 OpenCode Zen 网关返回（含 ```json 包裹，验证解析健壮性）
  request: (opt) => {
    if (String(opt.url).indexOf('/models') >= 0) {
      opt.success({ statusCode: 200, data: { data: [{ id: 'nemotron-3-ultra-free' }, { id: 'gpt-5.4-nano' }] } })
      return
    }
    opt.success({
      statusCode: 200,
      data: {
        choices: [
          {
            message: {
              content: '```json\n{"items":[{"name":"西红柿","confidence":0.97},{"name":"鸡蛋","confidence":0.9}]}\n```'
            }
          }
        ]
      }
    })
  },
  getFileSystemManager: () => ({
    readFileSync: () => 'FAKE_BASE64'
  })
}

const { buildDemoIngredients } = await import('../data/demo.ts')
const { listIngredients, groupByZone, filterIngredients, addIngredient, consumeIngredient } =
  await import('../services/food/fridge.ts')
const { computeStats } = await import('../services/food/expiration.ts')
const { recommendRecipes, parseIntent } = await import('../services/recipe/recommend.ts')
const { recognizeImage } = await import('../services/ai/index.ts')
const { getStorageAdvice, describeDays } = await import('../services/food/storage-advice.ts')
const { buildReminders, todaySuggestion } = await import('../services/notification/reminder.ts')
const { set, KEYS } = await import('../utils/storage.ts')

const log = (...a) => console.log(...a)

// 1. 初始化 demo
set(KEYS.INGREDIENTS, buildDemoIngredients())
const list = listIngredients()
log('1) 冰箱食材:', list.length, '种')
log('   ', list.map((i) => i.emoji + i.name + '(' + i.status + ',' + i.daysLeft + '天)').join(' '))

// 2. 统计
log('2) 统计:', JSON.stringify(computeStats(list)))

// 3. 分区
log('3) 分区:', groupByZone(list).map((z) => z.area + ':' + z.items.length).join(' | '))

// 4. 保存建议
const a = getStorageAdvice('西红柿')
log('4) 西红柿建议:', a.method, a.area, a.days, '天 →', describeDays(a.days))
log('   牛肉建议:', JSON.stringify(getStorageAdvice('牛肉')))

// 5. 推荐
const recs = recommendRecipes(list, { useExpiring: true, limit: 5 })
log('5) 推荐 TOP5:')
recs.forEach((r) => {
  const uf = r.useFirst.map((u) => u.name).join('/') || '-'
  log('   -', r.recipe.name, r.matchScore + '%', '优先:', uf, '|', r.reason)
})

// 6. 意图解析
const intent = parseIntent('我今天不想吃辣的，15分钟以内，只想用冰箱里的东西', list)
log('6) 意图 chips:', JSON.stringify(intent.chips))
log('   AI 回复:', intent.reply)

// 7. 提醒
log('7) 提醒:')
buildReminders().forEach((n) => log('   -', n.title, '｜', n.body))
log('   今日建议:', todaySuggestion())

// 8. AI 识别
const r = await recognizeImage('/tmp/tomato.jpg')
log('8) 识别成功:', r.success, r.items.map((i) => i.name + '(' + i.confidence + ')').join(','), r.cost + 'ms')

// 9. 搜索 & 消耗闭环
log('9) 搜索「西红柿」命中:', filterIngredients(list, '西红柿', '全部').length)
const t = list.find((i) => i.name === '西红柿')
log('   消耗 1 个西红柿后剩余:', consumeIngredient(t.id, 1), '｜当前种类:', listIngredients().length)

// 10. 新增食材（自动补全保存建议）
const ni = addIngredient({ name: '菠菜', quantity: 1, unit: '把', purchaseDate: '2026-09-07' })
log('10) 新增:', ni.name, ni.storageMethod, ni.storageArea, ni.bestBeforeDate, ni.status)

// 11. OpenCode Zen Provider（用 mock 的 wx.request 验证解析链路）
const { saveAiConfig, getAiConfig } = await import('../services/ai/config.ts')
const { fetchModelList } = await import('../services/ai/config.ts')
saveAiConfig({ provider: 'opencode', apiKey: 'sk-test', model: 'nemotron-3-ultra-free' })
log('11) 引擎配置:', JSON.stringify(getAiConfig()))
log('    模型列表:', (await fetchModelList()).join(', '))
const zen = await recognizeImage('/tmp/tomato.jpg')
log('    Zen 识别:', zen.success, zen.items.map((i) => i.name + '(' + i.confidence + '→' + i.storageArea + '/' + i.recommendedDays + '天)').join(','))
log('    provider:', zen.provider, '| cost:', zen.cost + 'ms')
// 切回 Mock，确认降级与默认行为正常
saveAiConfig({ provider: 'mock' })
log('    切回 Mock:', (await recognizeImage('/tmp/x.jpg')).provider)

log('\nSMOKE OK ✅')
