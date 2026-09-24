import { get, set, KEYS } from './utils/storage'
import { buildDemoIngredients, DEFAULT_USER } from './data/demo'
import { track } from './utils/analytics'

App({
  globalData: {
    version: '1.0.0',
    /** 数据版本号：任何写操作后 +1，页面 onShow 时对比决定是否刷新 */
    dataVersion: 0
  },

  onLaunch() {
    const seeded = get<boolean>(KEYS.SETTINGS, null as any)
    if (!seeded) {
      set(KEYS.SETTINGS, {
        mockRecognizeFail: false,
        mockNetworkError: false,
        enableScanAnimation: true
      })
    }
    if (!get<boolean>(KEYS.SEEDED, false)) {
      set(KEYS.INGREDIENTS, buildDemoIngredients())
      set(KEYS.USER, DEFAULT_USER)
      set(KEYS.SEEDED, true)
    }

    // 兜底：食材数据被清成非数组时重新灌演示数据，避免首页空白
    // （注意：用户主动清空冰箱得到的是空数组 []，这里不会覆盖）
    const list = get<any>(KEYS.INGREDIENTS, null)
    if (!Array.isArray(list)) {
      set(KEYS.INGREDIENTS, buildDemoIngredients())
    }

    try {
      track('app_launch', { version: this.globalData.version })
    } catch (e) {
      console.warn('[FreshKeep] track failed', e)
    }

    // 全局错误兜底：任何未捕获异常都要能被看见（否则只会白屏，没有线索）
    if (wx.onError) {
      wx.onError((msg: string) => {
        console.error('[FreshKeep] 全局错误', msg)
        wx.showToast({
          title: `出错了：${String(msg || '').slice(0, 24)}`,
          icon: 'none',
          duration: 4000
        })
      })
    }

    // 页面不存在（分享/扫码路径异常）时安全落到首页
    if (wx.onPageNotFound) {
      wx.onPageNotFound(() => {
        wx.reLaunch({ url: '/pages/home/home' })
      })
    }
  },

  onShow() {
    // 预留：进入前台时刷新提醒
  }
})
