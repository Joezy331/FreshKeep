import { FOOD_DATABASE } from '../../data/food-database'
import { get } from '../../utils/storage'
import { KEYS } from '../../utils/storage'
import type { RecognitionResult, RecognizedItem, VisionProvider } from './types'

/**
 * Mock 视觉识别服务
 * ---------------------------------------------------------------
 * MVP 阶段没有真实视觉 API，这里用「图片路径哈希 + 轮转」模拟识别结果，
 * 保证每次演示都能跑通完整链路，且输出结构与真实模型（GPT-4o Vision /
 * Gemini Vision / 通义千问 VL / 豆包视觉）保持一致。
 */

function hash(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33 + h) ^ str.charCodeAt(i)
  }
  return Math.abs(h)
}

let round = 0

function buildItem(index: number, confidence: number): RecognizedItem {
  const food = FOOD_DATABASE[index % FOOD_DATABASE.length]
  const opt = food.options[0]
  return {
    name: food.name,
    confidence,
    category: food.category,
    storageMethod: opt.method,
    storageArea: opt.area,
    recommendedDays: opt.days,
    emoji: food.emoji,
    tips: food.tips
  }
}

export const MockVisionProvider: VisionProvider = {
  name: 'MockVision-v1',

  recognize(filePath: string): Promise<RecognitionResult> {
    const start = Date.now()
    const settings = get<any>(KEYS.SETTINGS, {}) || {}

    return new Promise((resolve) => {
      // 模拟网络 + 推理耗时
      const cost = 900 + Math.round(Math.random() * 900)
      setTimeout(() => {
        if (settings.mockNetworkError) {
          resolve({
            success: false,
            items: [],
            error: '网络开小差了，请稍后重试。',
            cost: Date.now() - start,
            provider: this.name
          })
          return
        }
        if (settings.mockRecognizeFail) {
          resolve({
            success: false,
            items: [],
            error: '暂时没认出来，可以换一张更清晰的照片。',
            cost: Date.now() - start,
            provider: this.name
          })
          return
        }

        const seed = hash(filePath || 'demo') + round * 7
        round += 1

        // 约 35% 概率识别到多种食材（模拟一袋菜的场景）
        const multi = seed % 100 < 35
        const count = multi ? 2 + (seed % 3 === 0 ? 1 : 0) : 1
        const items: RecognizedItem[] = []
        for (let i = 0; i < count; i++) {
          const idx = (seed + i * 5) % FOOD_DATABASE.length
          const confidence = Number((0.99 - i * 0.06 - (seed % 7) / 100).toFixed(2))
          const item = buildItem(idx, Math.max(0.72, confidence))
          if (!items.some((it) => it.name === item.name)) items.push(item)
        }

        resolve({
          success: true,
          items,
          cost: Date.now() - start,
          provider: this.name,
          raw: { model: 'mock-vision-v1', size: 'unknown', seed }
        })
      }, cost)
    })
  }
}
