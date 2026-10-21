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

/** 调用百度菜品识别 → 候选食材数组（多候选，非 Top-1） */
async function baiduRecognize(
  tempPath: string,
  creds: { apiKey: string; secretKey: string }
): Promise<RecognitionResult> {
  const start = Date.now()
  const tokenRes: any = await new Promise((resolve, reject) => {
    wx.request({
      url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${creds.apiKey}&client_secret=${creds.secretKey}`,
      method: 'GET',
      success: resolve,
      fail: reject
    })
  })
  const token = tokenRes && tokenRes.data && tokenRes.data.access_token
  if (!token) throw new Error('BAIDU_TOKEN_FAILED')

  const base64 = wx.getFileSystemManager().readFileSync(tempPath, 'base64') as string
  const detectRes: any = await new Promise((resolve, reject) => {
    wx.request({
      url: `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${token}`,
      method: 'POST',
      header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: { image: base64, top_num: BAIDU_TOP_NUM },
      success: resolve,
      fail: reject
    })
  })

  const resultArr =
    detectRes && detectRes.data && Array.isArray(detectRes.data.result)
      ? detectRes.data.result
      : []
  const items: RecognizedItem[] = buildCandidatesFromBaidu(resultArr)
  if (!items.length) {
    return {
      success: false,
      items: [],
      error: '未能识别出菜品，换张更清晰的照片试试',
      cost: Date.now() - start,
      provider: 'Baidu 菜品识别'
    }
  }
  return {
    success: true,
    items,
    cost: Date.now() - start,
    provider: 'Baidu 菜品识别',
    raw: detectRes.data
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
        track('recognition_image_uploaded', { from: 'scan' })

        // 图片大小守卫
        const fs = wx.getFileSystemManager()
        const base64 = fs.readFileSync(tempPath, 'base64') as string
        if (typeof base64 === 'string' && base64.length > MAX_BASE64_LEN) {
          wx.showToast({ title: '图片过大，请选择更小或压缩后的图片', icon: 'none' })
          return
        }

        const creds = getBaiduCreds()
        track('recognition_started', {
          hasBaiduKey: !!(creds.apiKey && creds.secretKey)
        })

        wx.showLoading({ title: '识别中...' })
        let result: RecognitionResult
        try {
          if (creds.apiKey && creds.secretKey) {
            // 通道 1：百度优先
            try {
              result = await baiduRecognize(tempPath, creds)
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
          track('recognition_succeeded', {
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
    track('recognition_failed', { reason: msg })
    track('photo_recognition_failed', { reason: msg })
    wx.showToast({ title: msg, icon: 'none' })
    this.setData({ showManual: true })
  },

  /** 手动输入（场景 C / E 的兜底出口） */
  goManual() {
    track('recognition_manual_entry', { from: 'scan_fail' })
    wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=manual' })
  },

  goBack() {
    wx.navigateBack()
  }
})
