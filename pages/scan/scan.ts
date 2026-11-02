import { getBaiduCreds } from '../../services/baidu/config'
import { recognizeImage } from '../../services/ai'
import { buildCandidatesFromBaidu } from '../../services/ai/recognition-core'
import { set, KEYS } from '../../utils/storage'
import { track } from '../../utils/analytics'
import type { RecognizedItem, RecognitionResult } from '../../services/ai/types'

/**
 * AI 拍照识菜（重构版）
 * ---------------------------------------------------------------
 * 处理流程：图片输入 → 模型调用 → 结果解析（候选数组）→ 名称归一化
 *          → 候选结果展示（确认页）→ 用户确认/修改 → 正式入库。
 *
 * 双通道识别（解决「scan 绕过可插拔引擎」的架构不一致）：
 *   1) 管理员已配百度智能云密钥 → 优先调用百度菜品识别（请求 top_num 候选）；
 *   2) 无百度密钥 / 百度异常 / 百度无结果 → 降级到可插拔引擎（Mock 演示 或 已配置的
 *      本地 Cline 网关 / OpenCode Zen 等真实视觉模型），保证演示链路不断。
 *
 * 识别与入库解耦：本页只把「候选数组 + 图片」写入 KEYS.PENDING，由确认页负责入库。
 * ⚠️ 安全红线：百度 / AI 密钥均来自本地存储，不在代码里硬编码。
 */

/** 百度要求图片 base64 后 < 4MB */
const MAX_BASE64_LEN = 4 * 1024 * 1024
/** 百度菜品识别一次返回的候选数量 */
const BAIDU_TOP_NUM = 3
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token'
const BAIDU_DISH_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish'

/** 把响应体统一成对象（wx.request 有时返回字符串，有时返回对象） */
function safeJson(body: any): any {
  if (body && typeof body === 'object') return body
  if (typeof body === 'string') {
    try { return JSON.parse(body) } catch { return null }
  }
  return null
}

/** 从百度返回里抽取可读错误原因，避免把鉴权/配额失败误判成「没认出来」 */
function baiduErrorMessage(data: any, stage: 'token' | 'detect'): string {
  if (!data) return stage === 'token' ? '百度鉴权无响应' : '百度识别无响应'
  if (data.error_code || data.error_msg) {
    return `百度${stage === 'token' ? '鉴权' : '识别'}失败：${data.error_msg || ''}（code ${data.error_code ?? '?'}，详见 aip.baidubce.com 错误码）`
  }
  if (data.error || data.error_description) {
    return `百度鉴权失败：${data.error_description || data.error}`
  }
  return stage === 'token' ? '百度返回的令牌为空' : '百度返回格式异常'
}

/**
 * 调用百度菜品识别 → 候选食材数组（多候选，非 Top-1）
 * 关键点（修复「识别崩了」）：
 *  - 整体 try/catch 兜底，任何异常都返回 RecognitionResult，绝不向上抛导致整页崩溃；
 *  - 显式识别百度 error_code/error_msg，把「密钥失效 / 未开通 / 额度不足 / 格式异常」
 *    如实回传，而不是静默降级成「没认出来」；
 *  - 兼容 wx.request 返回字符串或对象两种 body；creds 做 URL 编码防特殊字符截断。
 */
async function baiduRecognize(
  tempPath: string,
  base64: string,
  creds: { apiKey: string; secretKey: string }
): Promise<RecognitionResult> {
  const start = Date.now()
  const fail = (error: string): RecognitionResult => ({
    success: false,
    items: [],
    error,
    cost: Date.now() - start,
    provider: 'Baidu 菜品识别'
  })

  try {
    // 1) 换取 access_token
    const tokenRes: any = await new Promise((resolve, reject) => {
      wx.request({
        url: `${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(creds.apiKey)}&client_secret=${encodeURIComponent(creds.secretKey)}`,
        method: 'GET',
        success: resolve,
        fail: reject
      })
    })
    const tokenData = safeJson(tokenRes && tokenRes.data)
    const token = tokenData && tokenData.access_token
    if (!token) return fail(baiduErrorMessage(tokenData, 'token'))

    // 2) 菜品识别
    const detectRes: any = await new Promise((resolve, reject) => {
      wx.request({
        url: `${BAIDU_DISH_URL}?access_token=${token}`,
        method: 'POST',
        header: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: { image: base64, top_num: BAIDU_TOP_NUM },
        success: resolve,
        fail: reject
      })
    })
    const detectData = safeJson(detectRes && detectRes.data)
    if (!detectData || detectData.error_code || detectData.error) {
      return fail(baiduErrorMessage(detectData, 'detect'))
    }

    const resultArr = Array.isArray(detectData.result) ? detectData.result : []
    const items: RecognizedItem[] = buildCandidatesFromBaidu(resultArr)
    if (!items.length) {
      return fail('未能识别出菜品，换张更清晰的照片试试')
    }
    return {
      success: true,
      items,
      cost: Date.now() - start,
      provider: 'Baidu 菜品识别',
      raw: detectData
    }
  } catch (e: any) {
    return fail(`百度接口异常：${e && e.message ? e.message : '网络错误'}`)
  }
}

Page({
  data: {
    imgSrc: '',
    showManual: false
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: async (res: any) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ imgSrc: tempPath, showManual: false })
        track('ingredient_image_uploaded', { from: 'scan' })

        // 图片大小守卫（这里读一次 base64，后续百度识别复用，避免重复读取大文件）
        const fs = wx.getFileSystemManager()
        const base64 = fs.readFileSync(tempPath, 'base64') as string
        if (typeof base64 === 'string' && base64.length > MAX_BASE64_LEN) {
          wx.showToast({ title: '图片过大，请选择更小或压缩后的图片', icon: 'none' })
          return
        }

        const creds = getBaiduCreds()
        track('ingredient_recognition_started', {
          hasBaiduKey: !!(creds.apiKey && creds.secretKey)
        })

        wx.showLoading({ title: '识别中...' })
        let result: RecognitionResult
        try {
          if (creds.apiKey && creds.secretKey) {
            // 通道 1：百度优先
            try {
              result = await baiduRecognize(tempPath, base64, creds)
            } catch (e: any) {
              result = { success: false, items: [], error: '百度接口异常', provider: 'Baidu 菜品识别' }
            }
            // 百度失败/无结果 → 降级到可插拔引擎（最多一次，避免无限重试）
            if (!result.success) {
              const fb = await recognizeImage(tempPath)
              result = {
                ...fb,
                fallback: true,
                provider: `Baidu → ${fb.provider || 'Mock'}`
              }
            }
          } else {
            // 通道 2：无百度密钥，直接走可插拔引擎（Mock 演示 / 已配真实模型）
            result = await recognizeImage(tempPath)
          }
        } catch (e: any) {
          wx.hideLoading()
          this.handleFail('识别服务异常，请稍后重试或手动输入。')
          return
        }
        wx.hideLoading()

        if (result.success && result.items.length) {
          const knownCount = result.items.filter((i) => i.known).length
          track('ingredient_recognition_succeeded', {
            count: result.items.length,
            knownCount,
            provider: result.provider,
            fallback: !!result.fallback
          })
          // 兼容旧指标（个人中心识别成功率）
          track('photo_recognition_success', {
            from: 'scan',
            count: result.items.length,
            knownCount
          })
          set(KEYS.PENDING, {
            items: result.items,
            image: tempPath,
            provider: result.provider,
            fallback: !!result.fallback
          })
          wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=confirm' })
          return
        }

        // 场景 C / E：最终失败，给出手动输入出口（不卡死用户）
        this.handleFail(result.error || '暂时没认出来，可以手动输入。')
      },
      fail: () => {
        // 用户取消拍照，不做任何处理
      }
    })
  },

  /** 识别失败处理：埋点 + 提示 + 暴露手动输入入口 */
  handleFail(msg: string) {
    track('ingredient_recognition_failed', { reason: msg })
    track('photo_recognition_failed', { reason: msg })
    wx.showToast({ title: msg, icon: 'none' })
    this.setData({ showManual: true })
  },

  /** 手动输入（场景 C / E 的兜底出口） */
  goManual() {
    track('ingredient_manual_entry', { from: 'scan_fail' })
    wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=manual' })
  },

  goBack() {
    wx.navigateBack()
  }
})
