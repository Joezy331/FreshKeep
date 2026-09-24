import { findFood } from '../../data/food-database'
import { getBaiduCreds } from '../../services/baidu/config'
import { set, KEYS } from '../../utils/storage'
import { track } from '../../utils/analytics'
import type { RecognizedItem, IngredientCategory, StorageArea, StorageMethod } from '../../services/ai/types'

/**
 * AI 拍照识菜（真实百度智能云「菜品识别」）
 * ---------------------------------------------------------------
 * 调用链：拍照/选图 → 图片转 base64 → 百度 OAuth 换取 access_token
 *        → 调用 /rest/2.0/image-classify/v2/dish → 解析 Top-1 结果
 *        → 写入待确认 → 跳转「确认食材」页加入冰箱。
 *
 * 凭证来自本地存储（管理员在「我的」页配置），不在代码里硬编码。
 * 百度返回结构（实际）：{ result: [ { name, calorie, probability }, ... ] }
 */

/** 百度要求图片 base64 后 < 4MB */
const MAX_BASE64_LEN = 4 * 1024 * 1024

/** 把百度返回映射成统一的 RecognizedItem（用本地食材库补全保存建议） */
function toRecognizedItem(name: string, probability: number): RecognizedItem {
  const food = findFood(name)
  const method: StorageMethod = food ? food.options[0].method : '冷藏'
  const area: StorageArea = food ? food.options[0].area : '冷藏区'
  let confidence = Number(probability)
  if (isNaN(confidence) || confidence <= 0) confidence = 0.8
  // 百度概率可能是 0~1，也可能是 0~100，归一化到 0~1
  if (confidence > 1) confidence = confidence / 100
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

Page({
  data: {
    imgSrc: '',
    result: '',
    tip: '',
    probability: 0
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: async (res: any) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ imgSrc: tempPath, result: '', tip: '', probability: 0 })

        // 1) 读取凭证（管理员在「我的」页配置，不写死在代码）
        const creds = getBaiduCreds()
        if (!creds.apiKey || !creds.secretKey) {
          wx.showToast({ title: '请先在「我的」(管理员) 配置百度智能云密钥', icon: 'none' })
          return
        }

        // 2) 图片转 base64，并做大小守卫
        const fs = wx.getFileSystemManager()
        const base64 = fs.readFileSync(tempPath, 'base64') as string
        if (typeof base64 === 'string' && base64.length > MAX_BASE64_LEN) {
          wx.showToast({ title: '图片过大，请选择更小或压缩后的图片', icon: 'none' })
          return
        }

        wx.showLoading({ title: '识别中...' })
        try {
          // 3) 换取 access_token
          const tokenRes: any = await new Promise((resolve, reject) => {
            wx.request({
              url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${creds.apiKey}&client_secret=${creds.secretKey}`,
              method: 'GET',
              success: resolve,
              fail: reject
            })
          })
          const token = tokenRes && tokenRes.data && tokenRes.data.access_token
          if (!token) {
            wx.hideLoading()
            wx.showToast({ title: '获取百度令牌失败，请检查密钥', icon: 'none' })
            return
          }

          // 4) 调用菜品识别
          const detectRes: any = await new Promise((resolve, reject) => {
            wx.request({
              url: `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${token}`,
              method: 'POST',
              header: { 'Content-Type': 'application/x-www-form-urlencoded' },
              data: { image: base64 },
              success: resolve,
              fail: reject
            })
          })
          wx.hideLoading()

          const resultArr =
            detectRes && detectRes.data && Array.isArray(detectRes.data.result)
              ? detectRes.data.result
              : []
          if (!resultArr.length) {
            wx.showToast({ title: '未能识别出菜品，换张更清晰的照片试试', icon: 'none' })
            return
          }

          const top = resultArr[0]
          const name = String(top.name || '').trim()
          const probability = parseFloat(top.probability)
          const item = toRecognizedItem(name, probability)

          // 低置信度提示用户确认
          let tip = this.getTip(name)
          if (!isNaN(probability) && probability < 0.5) {
            tip = 'AI 识别结果可能存在误差，请确认食材名称。' + tip
          }

          this.setData({
            result: name,
            tip,
            probability: isNaN(probability) ? 0 : probability
          })

          // 5) 写入待确认，跳转确认页（打通 识别 → 确认 → 加入冰箱 闭环）
          set(KEYS.PENDING, { items: [item], image: tempPath })
          track('photo_recognition_success', {
            from: 'scan',
            name,
            probability: isNaN(probability) ? null : probability
          })
          wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=confirm' })
        } catch (e: any) {
          wx.hideLoading()
          wx.showToast({ title: '识别失败，请检查网络后重试', icon: 'none' })
        }
      },
      fail: () => {
        // 用户取消拍照，不做任何处理
      }
    })
  },

  getTip(name: string) {
    if (name.includes('青菜') || name.includes('蔬菜')) {
      return '冰箱冷藏，2~3天吃完'
    } else if (name.includes('肉') || name.includes('猪肉') || name.includes('牛肉')) {
      return '冷藏1-2天，长期保存建议冷冻'
    } else if (name.includes('水果')) {
      return '冷藏可放3~5天'
    } else {
      return '尽快放入冰箱冷藏保存'
    }
  }
})
