import { track } from '../../utils/analytics'

/** 开屏停留时长（ms）：进度条走完即进入首页 */
const HOLD = 2300
const FADE = 420
const TICK = 60

let progTimer: any = null
let holdTimer: any = null
let goTimer: any = null

Page({
  data: {
    leaving: false,
    progress: 0,
    motto: '买菜 → 保存 → 管理 → 提醒 → 消耗',
    ready: false,
    navError: ''
  },

  onLoad() {
    try {
      track('app_launch', { from: 'splash' })
    } catch (e) {
      console.warn('[splash] track failed', e)
    }
    this.runProgress()
    setTimeout(() => this.setData({ ready: true }), 1200)
    holdTimer = setTimeout(() => this.enter(), HOLD)
  },

  onUnload() {
    if (progTimer) clearInterval(progTimer)
    if (holdTimer) clearTimeout(holdTimer)
    if (goTimer) clearTimeout(goTimer)
  },

  /** 进度条驱动：每 TICK 推进一次，小番茄跟着进度条一起走 */
  runProgress() {
    const step = (100 * TICK) / HOLD
    if (progTimer) clearInterval(progTimer)
    progTimer = setInterval(() => {
      const progress = Math.min(100, this.data.progress + step)
      this.setData({ progress })
      if (progress >= 100 && progTimer) {
        clearInterval(progTimer)
        progTimer = null
      }
    }, TICK)
  },

  /** 进入首页：reLaunch 优先，失败回退 switchTab，再失败显示错误让用户手动点 */
  enter() {
    if (this.data.leaving) return
    if (holdTimer) clearTimeout(holdTimer)
    if (progTimer) {
      clearInterval(progTimer)
      progTimer = null
    }
    this.setData({ leaving: true, progress: 100 })

    goTimer = setTimeout(() => {
      wx.reLaunch({
        url: '/pages/home/home',
        success: () => {},
        fail: (err: any) => {
          console.warn('[splash] reLaunch failed, try switchTab', err)
          wx.switchTab({
            url: '/pages/home/home',
            fail: (err2: any) => {
              console.error('[splash] switchTab failed', err2)
              this.setData({
                leaving: false,
                navError: `跳转失败：${(err2 && err2.errMsg) || '未知错误'}`
              })
            }
          })
        }
      })
    }, FADE)
  },

  skip() {
    try {
      track('app_launch', { from: 'splash_skip' })
    } catch (e) {
      /* ignore */
    }
    this.enter()
  },

  /** 兜底：手动重进 */
  retry() {
    this.setData({ leaving: false, navError: '' })
    wx.reLaunch({
      url: '/pages/home/home',
      fail: () => {
        wx.switchTab({ url: '/pages/home/home' })
      }
    })
  },

  noop() {
    /* 阻止滚动穿透 */
  }
})
