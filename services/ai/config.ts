import { get, set, KEYS } from '../../utils/storage'

/**
 * AI 引擎配置
 * ---------------------------------------------------------------
 * - mock：本地模拟识别，离线可演示
 * - opencode：OpenCode Zen 网关（OpenAI 兼容），支持免费模型
 *
 * ⚠️ 安全提示：API Key 明文存在小程序本地存储，仅适合 Demo。
 *    正式上线必须改由自建服务端 / 云函数中转，密钥不下发到客户端。
 */

export type AiProviderType = 'mock' | 'opencode'

export interface AiConfig {
  provider: AiProviderType
  /** OpenAI 兼容地址，默认 OpenCode Zen */
  baseUrl: string
  apiKey: string
  model: string
  /** 调用失败自动降级到 Mock，保证演示不中断 */
  fallbackToMock: boolean
  /** 请求超时（ms） */
  timeout: number
  /**
   * 配置版本：改动默认网关/Key/模型时 +1。
   * 本地已存的配置版本不一致时会被新默认值覆盖，避免旧配置把新接入的 Key 顶掉。
   */
  version: number
}

/**
 * 默认配置：接入本地 Cline 网关（OpenAI 兼容，http://localhost:8787/v1）。
 * ⚠️ 安全：apiKey 默认留空，真实 Key 由管理员在「我的 → AI 引擎」界面填写（存本地），
 *    绝不写死在客户端代码里。正式上线请改为自建服务端 / 云函数中转。
 * ⚠️ 本地网关：localhost 仅在开发者工具 / 真机调试生效，且开发者工具需勾选
 *    「不校验合法域名、TLS 版本以及 HTTPS 证书」才能请求。
 */
export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'opencode',
  baseUrl: 'http://localhost:8787/v1',
  apiKey: '',
  model: 'cline-free/muse-spark-1.3-contributor',
  fallbackToMock: true,
  timeout: 25000,
  version: 3
}

/** 网关地址预设（都是 OpenAI 兼容协议，可互相切换） */
export const BASE_PRESETS = [
  { url: 'http://localhost:8787/v1', label: 'Local Cline（本地）' },
  { url: 'https://opencode.ai/zen/v1', label: 'OpenCode Zen' },
  { url: 'https://openrouter.ai/api/v1', label: 'OpenRouter' }
]

/**
 * 常用模型速查（实测于 2026-09，价格与可用性以网关为准）
 * - cline-free/* 为本地 Cline 网关提供的免费模型命名空间
 */
export const PRESET_MODELS = [
  { id: 'cline-free/minimax-m3.1-flash', label: 'MiniMax M3.1 Flash · 免费', free: true },
  { id: 'cline-free/nemotron-3.5-super-vl', label: 'Nemotron 3.5 Super VL · 免费 · 支持图片', free: true },
  { id: 'cline-free/mimo-v2.6-flash', label: 'MiMo V2.6 Flash · 免费', free: true },
  { id: 'cline-free/muse-spark-1.3-contributor', label: 'Muse Spark 1.3 Contributor · 免费 · 支持图片', free: true },
  { id: 'cline-free/solar-mini4', label: 'Solar Mini 4 · 免费', free: true },
  { id: 'meta/muse-spark-1.3-contributor', label: 'Muse Spark 1.3 Contributor · 支持图片', free: false },
  { id: 'meta/muse-spark-1.3', label: 'Muse Spark 1.3 · 支持图片', free: false },
  { id: 'inclusionai/ling-3.0-flash-vl:free', label: 'Ling 3.0 Flash VL · 免费 · 支持图片', free: true },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra · 免费', free: true },
  { id: 'mimo-v2.5-free', label: 'MiMo-V2.5 · 免费', free: true },
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash · 免费', free: true },
  { id: 'muse-spark-1.3-contributor-free', label: 'Muse Spark 1.3 · 免费', free: true },
  { id: 'big-pickle', label: 'Big Pickle · 免费（隐藏模型）', free: true },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano · 付费 · 支持视觉', free: false },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash · 付费 · 支持视觉', free: false }
]

export function isFreeModel(id: string): boolean {
  const hit = PRESET_MODELS.find((m) => m.id === id)
  if (hit) return hit.free
  return /free$/i.test(id) || id === 'big-pickle'
}

export function getAiConfig(): AiConfig {
  const cfg = get<AiConfig>(KEYS.AI, DEFAULT_AI_CONFIG)
  return { ...DEFAULT_AI_CONFIG, ...(cfg || {}) }
}

export function saveAiConfig(patch: Partial<AiConfig>): AiConfig {
  const next = { ...getAiConfig(), ...patch }
  set(KEYS.AI, next)
  return next
}

/** 是否可以发起真实请求 */
export function isAiReady(): boolean {
  const cfg = getAiConfig()
  return cfg.provider === 'opencode' && !!cfg.apiKey && !!cfg.model
}

/** 拉取网关可用模型列表（公开接口，无需鉴权） */
export function fetchModelList(): Promise<string[]> {
  const cfg = getAiConfig()
  const url = cfg.baseUrl.replace(/\/+$/, '') + '/models'
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      success: (res: any) => {
        const data = res && res.data && res.data.data
        if (Array.isArray(data)) resolve(data.map((m: any) => m.id).filter(Boolean))
        else reject(new Error('返回格式异常'))
      },
      fail: (err: any) => reject(new Error((err && err.errMsg) || '请求失败'))
    })
  })
}
