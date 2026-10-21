import { MockVisionProvider } from './mock-vision'
import { OpenCodeZenProvider, chat, testConnection as zenTestConnection } from './opencode-zen'
import { getAiConfig } from './config'
// 注意：本文件**不要再转发类型声明**（曾经因此整页白屏）。
// 小程序按单文件编译，把类型再导出的写法可能被当成运行时具名导出，
// 导致模块初始化报错、引入本文件的页面整页白屏。需要类型请直接从 './types' 引入。
import type { RecognitionResult, VisionProvider } from './types'

/**
 * AI 识别统一入口（业务层只调 recognizeImage）
 * ---------------------------------------------------------------
 * 引擎由配置决定：
 *   - mock     → 本地模拟，离线可演示
 *   - opencode → OpenCode Zen 网关（OpenAI 兼容，含免费模型）
 * 在「我的 → AI 引擎」里实时切换，无需重启小程序。
 *
 * 替换/新增其他模型（自建后端、GPT-4o、Gemini、通义千问…）：
 *   1. 新建 xxx-vision.ts，实现 VisionProvider 接口
 *   2. 在 resolveProvider() 里加一个分支
 *   3. 业务代码零改动
 */

let pinned: VisionProvider | null = null

/** 手动指定 provider（调试用，优先级高于配置） */
export function setProvider(p: VisionProvider) {
  pinned = p
}

/** 按当前配置解析 provider（没填 Key 时直接用 Mock，不白跑一次失败请求） */
export function resolveProvider(): VisionProvider {
  if (pinned) return pinned
  const cfg = getAiConfig()
  return cfg.provider === 'opencode' && cfg.apiKey ? OpenCodeZenProvider : MockVisionProvider
}

export function currentProviderName(): string {
  const cfg = getAiConfig()
  const p = resolveProvider()
  if (p === OpenCodeZenProvider) return `${p.name} · ${cfg.model}`
  return cfg.provider === 'opencode' && !cfg.apiKey ? '本地演示（未填 Key）' : p.name
}

/** 是否正在使用真实模型 */
export function isRealModel(): boolean {
  return resolveProvider() !== MockVisionProvider
}

/** 给任意 Promise 套一层硬超时，避免真实模型卡住导致页面一直转圈 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('TIMEOUT'))
      }
    }, ms)
    p.then(
      (v) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(v)
        }
      },
      (e) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          reject(e)
        }
      }
    )
  })
}

/** 真实模型最长等待时间（ms），超时即降级，不让用户干等 */
const HARD_TIMEOUT = 12000

/**
 * 识别图片中的食材（失败/超时按配置自动降级到 Mock，保证演示链路不断）
 */
export async function recognizeImage(filePath: string): Promise<RecognitionResult> {
  if (!filePath) {
    return { success: false, items: [], error: '没有获取到图片，请重新拍摄。' }
  }

  const cfg = getAiConfig()
  const provider = resolveProvider()

  try {
    const res = await withTimeout(provider.recognize(filePath), HARD_TIMEOUT)
    if (!res.success && cfg.fallbackToMock && provider !== MockVisionProvider) {
      const fallback = await MockVisionProvider.recognize(filePath)
      return {
        ...fallback,
        provider: `${provider.name}(失败) → Mock`,
        fallback: true,
        error: res.error
      }
    }
    return res
  } catch (err: any) {
    const timedOut = !!(err && String(err.message).indexOf('TIMEOUT') >= 0)
    console.error('[ai] recognize exception', err)
    if (cfg.fallbackToMock && provider !== MockVisionProvider) {
      const fallback = await MockVisionProvider.recognize(filePath)
      return {
        ...fallback,
        provider: `${provider.name}(${timedOut ? '超时' : '异常'}) → Mock`,
        fallback: true,
        error: timedOut ? '模型响应超时，已改用本地演示识别。' : undefined
      }
    }
    return {
      success: false,
      items: [],
      error: timedOut ? '模型响应超时，请换个更快的模型。' : '网络开小差了，请稍后重试。'
    }
  }
}

/**
 * 文本对话（供连通性测试、AI 菜谱文案等使用）
 * 注意：这里用静态 import，小程序环境对动态 import() 支持不稳定，
 * 动态导入会导致模块解析失败，进而让引入 services/ai 的页面整页白屏。
 */
export function aiChat(prompt: string, system?: string): Promise<string> {
  return chat({ text: prompt, system })
}

export { getAiConfig } from './config'
export { saveAiConfig } from './config'
export { isAiReady } from './config'
export { fetchModelList } from './config'
export { isFreeModel, PRESET_MODELS } from './config'
export function testConnection(): Promise<string> {
  return zenTestConnection()
}
export { recognizeImage, MockVisionProvider, OpenCodeZenProvider }
