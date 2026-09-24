import { findFood } from '../../data/food-database'
import { getAiConfig } from './config'
import type { RecognitionResult, RecognizedItem, VisionProvider } from './types'
import type { IngredientCategory, StorageArea, StorageMethod } from '../../types/ingredient'

/**
 * OpenAI 兼容网关 Provider（OpenRouter / OpenCode Zen / 自建服务 通用）
 * ---------------------------------------------------------------
 * 当前默认：OpenRouter + Muse Spark 1.3
 *   端点：https://openrouter.ai/api/v1/chat/completions
 *   模型：meta/muse-spark-1.3-contributor（支持图片输入，上下文 1M）
 *   鉴权：Authorization: Bearer <OpenRouter Key>
 *
 * 换网关只需改 config.ts 的 baseUrl + apiKey + model，本文件不用动：
 *   - OpenRouter   https://openrouter.ai/api/v1
 *   - OpenCode Zen https://opencode.ai/zen/v1
 *
 * 注意：OpenRouter 部分模型（含 Muse Spark）要求账号先完成 18+ 年龄确认
 *   （https://openrouter.ai/settings/preferences），否则返回 403，本文件会给出中文提示。
 */

const SYSTEM_PROMPT =
  '你是家庭食材识别助手。用户会发来一张食材照片，请识别图中所有可见食材。' +
  '只输出 JSON，不要任何解释文字，格式：{"items":[{"name":"西红柿","confidence":0.98}]}。' +
  'name 使用中文常用食材名（如 西红柿、鸡蛋、菠菜、葱、牛肉、土豆、豆腐），' +
  'confidence 为 0~1 的置信度；识别不到时输出 {"items":[]}。'

function endpoint(path: string): string {
  return getAiConfig().baseUrl.replace(/\/+$/, '') + path
}

/** 读取本地图片为 base64（小程序临时路径可用） */
function readBase64(filePath: string): string {
  const fs = wx.getFileSystemManager()
  const data = fs.readFileSync(filePath, 'base64') as string
  return `data:image/jpeg;base64,${data}`
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: any
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  /** 图片本地路径（可选） */
  imagePath?: string
  /** 纯文本提示 */
  text?: string
  system?: string
}

/** 统一的多模态/文本请求入口 */
export function chat(opts: ChatOptions): Promise<string> {
  const cfg = getAiConfig()
  if (!cfg.apiKey) return Promise.reject(new Error('NO_API_KEY'))

  const content: any[] = []
  if (opts.text) content.push({ type: 'text', text: opts.text })
  if (opts.imagePath) {
    content.push({
      type: 'image_url',
      image_url: { url: readBase64(opts.imagePath) }
    })
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: opts.system || SYSTEM_PROMPT },
    { role: 'user', content }
  ]

  return new Promise((resolve, reject) => {
    wx.request({
      url: endpoint('/chat/completions'),
      method: 'POST',
      timeout: cfg.timeout,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        // OpenRouter 推荐带上来源标识（其他网关会忽略这两个头）
        'HTTP-Referer': 'https://freshkeep.miniapp',
        'X-Title': 'FreshKeep'
      },
      data: {
        model: opts.model || cfg.model,
        messages,
        temperature: opts.temperature === undefined ? 0.2 : opts.temperature,
        max_tokens: opts.maxTokens || 800
      },
      success: (res: any) => {
        const body = res && res.data
        if (res.statusCode >= 400 || !body) {
          reject(new Error(`HTTP_${res.statusCode}:${JSON.stringify(body).slice(0, 200)}`))
          return
        }
        const text =
          body.choices &&
          body.choices[0] &&
          (body.choices[0].message ? body.choices[0].message.content : body.choices[0].text)
        if (!text) {
          reject(new Error('EMPTY_RESPONSE'))
          return
        }
        resolve(String(text).trim())
      },
      fail: (err: any) => reject(new Error((err && err.errMsg) || 'REQUEST_FAILED'))
    })
  })
}

/** 从模型输出里稳健地抠出 JSON */
export function extractJson(text: string): any {
  if (!text) return null
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch (e2) {
        return null
      }
    }
    return null
  }
}

function toRecognizedItem(raw: any): RecognizedItem {
  const name = String((raw && raw.name) || '').trim()
  const food = findFood(name)
  let confidence = Number(raw && raw.confidence)
  if (isNaN(confidence) || confidence <= 0 || confidence > 1) confidence = 0.88
  const method: StorageMethod = food ? food.options[0].method : '冷藏'
  const area: StorageArea = food ? food.options[0].area : '冷藏区'
  return {
    name: name || '未知食材',
    confidence: Number(confidence.toFixed(2)),
    category: (food ? food.category : '其他') as IngredientCategory,
    storageMethod: method,
    storageArea: area,
    recommendedDays: food ? food.options[0].days : 5,
    emoji: food ? food.emoji : '🥗',
    tips: food ? food.tips : '未收录该食材，已按冷藏 5 天记录，请结合实际情况判断。'
  }
}

/** 把网关错误翻译成人话 */
function friendlyError(err: any): string {
  const msg = String((err && err.message) || err || '')
  if (msg.indexOf('NO_API_KEY') >= 0) return '还没有填 API Key，请在「我的 → AI 引擎」里配置。'
  if (msg.indexOf('age_18plus') >= 0 || msg.indexOf('18+ age') >= 0)
    return 'OpenRouter 要求先完成 18+ 年龄确认：openrouter.ai/settings/preferences（确认一次即可）。'
  if (msg.indexOf('not a valid model ID') >= 0 || msg.indexOf('404') >= 0)
    return '模型 ID 在这个网关上不存在，换一个模型 ID 试试。'
  if (msg.indexOf('unavailable for free') >= 0)
    return '该模型的免费额度暂不可用，换一个带 :free 后缀的模型。'
  if (msg.indexOf('401') >= 0 || msg.indexOf('403') >= 0) return 'API Key 无效或没有权限，请检查后重试。'
  if (msg.indexOf('429') >= 0) return '请求太频繁了，稍等几秒再试。'
  if (msg.indexOf('url not allow') >= 0 || msg.indexOf('不在以下 request') >= 0)
    return '域名未加入小程序 request 合法域名，开发阶段请勾选「不校验合法域名」。'
  if (
    msg.indexOf('image') >= 0 ||
    msg.indexOf('vision') >= 0 ||
    msg.indexOf('multimodal') >= 0 ||
    msg.indexOf('modality') >= 0
  )
    return '当前模型不支持图片输入，请在 AI 引擎里换一个支持视觉的模型（如 gpt-5.4-nano / gemini-3.5-flash）。'
  if (msg.indexOf('time') >= 0 || msg.indexOf('timeout') >= 0) return '请求超时了，换个更快的模型或稍后重试。'
  return '真实模型调用失败，已降级为本地演示识别。'
}

export const OpenCodeZenProvider: VisionProvider = {
  name: 'OpenCode Zen',

  recognize(filePath: string): Promise<RecognitionResult> {
    const start = Date.now()
    const cfg = getAiConfig()

    if (!cfg.apiKey) {
      return Promise.resolve({
        success: false,
        items: [],
        error: friendlyError(new Error('NO_API_KEY')),
        provider: this.name
      })
    }

    if (!filePath || filePath.indexOf('demo://') === 0) {
      return Promise.resolve({
        success: false,
        items: [],
        error: '演示模式没有真实图片，真实模型需要拍照或从相册选图；也可以切回 Mock 引擎。',
        provider: this.name
      })
    }

    return chat({ imagePath: filePath, text: '请识别这张图片中的所有食材。' })
      .then((text) => {
        const json = extractJson(text)
        const rawItems =
          json && Array.isArray(json.items)
            ? json.items
            : Array.isArray(json)
            ? json
            : []
        if (!rawItems.length) {
          return {
            success: false,
            items: [] as RecognizedItem[],
            error: '暂时没认出来，可以换一张更清晰的照片。',
            cost: Date.now() - start,
            provider: this.name,
            raw: text
          } as RecognitionResult
        }
        const items = rawItems.slice(0, 6).map(toRecognizedItem)
        return {
          success: true,
          items,
          cost: Date.now() - start,
          provider: this.name,
          raw: text
        } as RecognitionResult
      })
      .catch((err) => {
        console.error('[opencode-zen] recognize failed', err)
        return {
          success: false,
          items: [] as RecognizedItem[],
          error: friendlyError(err),
          cost: Date.now() - start,
          provider: this.name
        } as RecognitionResult
      })
  }
}

/** 连通性自检（纯文本，不消耗图片额度） */
export function testConnection(): Promise<string> {
  return chat({
    text: '请只回复两个字：正常',
    maxTokens: 16,
    system: '你是连通性测试助手，严格按用户要求输出。'
  })
}
