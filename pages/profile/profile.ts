import { get, set, KEYS, clearAll } from '../../utils/storage'
import { getStats } from '../../services/food/fridge'
import { buildDemoIngredients, DEFAULT_USER } from '../../data/demo'
import { buildReminders, markAllRead, requestSubscribe } from '../../services/notification/reminder'
import { getSummary, clearEvents } from '../../utils/analytics'
import { track } from '../../utils/analytics'
import { toast, confirm as uiConfirm, loading as showLoading, hideLoading } from '../../utils/ui'
// 直接依赖叶子模块，不走 services/ai 的 barrel，避免间接引入风险
import {
  getAiConfig,
  saveAiConfig,
  fetchModelList,
  isFreeModel,
  PRESET_MODELS,
  BASE_PRESETS
} from '../../services/ai/config'
import { getBaiduCreds, saveBaiduCreds } from '../../services/baidu/config'
import { testConnection } from '../../services/ai/opencode-zen'
import type { AiConfig } from '../../services/ai/config'
import type { UserProfile } from '../../types/user'

const DISLIKES = ['不吃辣', '不吃香菜', '少油少盐', '素食为主', '不吃内脏', '不吃海鲜']

Page({
  data: {
    user: null as UserProfile | null,
    stats: { kinds: 0, items: 0, fresh: 0, soon: 0, urgent: 0, expired: 0, attention: 0 },
    summary: null as any,
    settings: { mockRecognizeFail: false, mockNetworkError: false, enableScanAnimation: true },
    reminders: [] as any[],
    showNotify: false,
    showEvents: false,
    dislikes: DISLIKES,
    /** WXML 不支持在模板里调用 indexOf，这里预先算好选中态 */
    dislikeMap: {} as Record<string, boolean>,
    initial: '鲜',
    /** AI 引擎配置 */
    ai: null as AiConfig | null,
    modelLabels: PRESET_MODELS.map((m) => m.label),
    basePresets: BASE_PRESETS,
    fetchedModels: [] as string[],
    aiStatus: '尚未测试连接',
    version: '1.0.0',
    /** 管理员模式：仅管理员可见 AI 引擎 / 数据埋点 / 开发演示等内部选项 */
    isAdmin: false,
    /** 百度智能云凭证（仅管理员可见，存本地） */
    baidu: { apiKey: '', secretKey: '' }
  },

  onShow() {
    const user = get<UserProfile>(KEYS.USER, DEFAULT_USER as UserProfile)
    const settings = get<any>(KEYS.SETTINGS, {
      mockRecognizeFail: false,
      mockNetworkError: false,
      enableScanAnimation: true
    })
    // AI 配置只影响设置区，取不到也不能让整页挂掉
    let ai: AiConfig | null = null
    try {
      ai = getAiConfig()
    } catch (e) {
      console.warn('[profile] getAiConfig failed', e)
    }

    this.setData({
      user,
      settings,
      stats: getStats(),
      summary: getSummary(),
      dislikeMap: this.toMap(user.preferences.dislikes || []),
      initial: (user.nickname || '鲜').slice(0, 1),
      ai,
      isAdmin: get(KEYS.ADMIN, false),
      baidu: getBaiduCreds()
    })
  },

  /**
   * 切换管理员模式（隐藏入口）：长按页脚「鲜存 FreshKeep…」版本信息触发。
   * 普通用户看不到此入口；管理员开启后，AI 引擎 / 数据埋点 / 开发演示等
   * 内部选项才会在「我的」页显示，状态持久化到本地存储。
   */
  toggleAdmin() {
    const next = !get(KEYS.ADMIN, false)
    set(KEYS.ADMIN, next)
    this.setData({ isAdmin: next })
    toast(next ? '已开启管理员模式，内部选项已显示' : '已关闭管理员模式，内部选项已隐藏', 'none')
  },

  /** 百度智能云 API Key（管理员填写，存本地，不进仓库） */
  onBaiduApiKey(e: any) {
    const baidu = saveBaiduCreds({ apiKey: (e.detail.value || '').trim() })
    this.setData({ baidu })
  },

  /** 百度智能云 Secret Key（管理员填写，存本地，不进仓库） */
  onBaiduSecretKey(e: any) {
    const baidu = saveBaiduCreds({ secretKey: (e.detail.value || '').trim() })
    this.setData({ baidu })
  },

  /* ------------------------------------------------------------------ */
  /*  AI 引擎设置（Mock / OpenCode Zen）                                  */
  /* ------------------------------------------------------------------ */

  onAiProvider(e: any) {
    const p = e.currentTarget.dataset.p as 'mock' | 'opencode'
    const ai = saveAiConfig({ provider: p })
    this.setData({
      ai,
      aiStatus:
        p === 'opencode'
          ? '已切换到在线模型，填写 API Key 后点「测试连接」'
          : '已切换为本地 Mock 识别，离线可演示'
    })
    track('recipe_filter_applied', { ai_provider: p })
  },

  /** 复制当前网关地址，方便去浏览器打开 / 查看文档 */
  copyZenUrl() {
    const url = (getAiConfig().baseUrl || 'http://localhost:8787/v1')
    wx.setClipboardData({
      data: url,
      success: () => toast('已复制网关地址：' + url)
    })
  },

  onApiKey(e: any) {
    const ai = saveAiConfig({ apiKey: (e.detail.value || '').trim() })
    this.setData({ ai })
  },

  /** 一键切换网关（OpenRouter / OpenCode Zen） */
  onBaseUrlPreset(e: any) {
    const url = e.currentTarget.dataset.url
    const ai = saveAiConfig({ baseUrl: url })
    this.setData({
      ai,
      aiStatus: `已切换网关：${url}，记得确认模型 ID 属于该网关`
    })
  },

  onBaseUrl(e: any) {
    const ai = saveAiConfig({ baseUrl: (e.detail.value || '').trim() })
    this.setData({ ai })
  },

  onAiFallback(e: any) {
    const ai = saveAiConfig({ fallbackToMock: !!e.detail.value })
    this.setData({ ai })
  },

  onPickModel(e: any) {
    const idx = Number(e.detail.value)
    const hit = PRESET_MODELS[idx]
    if (!hit) return
    const ai = saveAiConfig({ model: hit.id })
    this.setData({
      ai,
      aiStatus: `已选择模型：${hit.id}${hit.free ? '（免费）' : '（付费）'}`
    })
  },

  onPickFetchedModel(e: any) {
    const idx = Number(e.detail.value)
    const id = (this as any).data.fetchedModels[idx]
    if (!id) return
    const ai = saveAiConfig({ model: id })
    this.setData({
      ai,
      aiStatus: `已选择模型：${id}${isFreeModel(id) ? '（免费）' : ''}`
    })
  },

  onFetchModels() {
    showLoading('拉取模型中')
    fetchModelList()
      .then((ids: string[]) => {
        hideLoading()
        // 免费模型排前面
        const sorted = [...ids].sort((a, b) => (isFreeModel(a) === isFreeModel(b) ? 0 : isFreeModel(a) ? -1 : 1))
        this.setData({
          fetchedModels: sorted.slice(0, 60),
          aiStatus: `已拉取 ${ids.length} 个模型，免费 ${ids.filter(isFreeModel).length} 个`
        })
        toast(`共 ${ids.length} 个模型`)
      })
      .catch((err: any) => {
        hideLoading()
        this.setData({ aiStatus: `拉取失败：${(err && err.message) || '未知错误'}` })
        toast('拉取失败，检查网络/地址')
      })
  },

  onCustomModel() {
    wx.showModal({
      title: '手动输入模型 ID',
      content: (this as any).data.ai ? (this as any).data.ai.model : '',
      editable: true,
      placeholderText: '例如 deepseek-v4-flash-free',
      success: (res: any) => {
        if (res.confirm && res.content) {
          const ai = saveAiConfig({ model: res.content.trim() })
          this.setData({ ai, aiStatus: `已设置模型：${ai.model}` })
        }
      }
    })
  },

  onTestAi() {
    const ai = (this as any).data.ai as AiConfig
    if (!ai || !ai.apiKey) {
      toast('请先填写 API Key')
      this.setData({ aiStatus: '未填写 API Key' })
      return
    }
    showLoading('请求模型中')
    testConnection()
      .then((text: string) => {
        hideLoading()
        this.setData({ aiStatus: `连接成功 · 回复：${text.slice(0, 20)}` })
        toast('连接成功', 'success')
      })
      .catch((err: any) => {
        hideLoading()
        const msg = String((err && err.message) || err || '')
        let tip = '连接失败'
        if (msg.indexOf('NO_API_KEY') >= 0) tip = '未填写 API Key'
        else if (msg.indexOf('401') >= 0 || msg.indexOf('403') >= 0) tip = 'API Key 无效'
        else if (msg.indexOf('404') >= 0) tip = '模型不存在'
        else if (msg.indexOf('url not allow') >= 0 || msg.indexOf('不在以下') >= 0)
          tip = '域名未加入合法域名白名单'
        else if (msg.indexOf('timeout') >= 0 || msg.indexOf('time') >= 0) tip = '请求超时'
        this.setData({ aiStatus: `${tip}：${msg.slice(0, 80)}` })
        toast(tip)
      })
  },

  toMap(arr: string[]): Record<string, boolean> {
    const map: Record<string, boolean> = {}
    arr.forEach((k) => {
      map[k] = true
    })
    return map
  },

  goFridge() {
    wx.switchTab({ url: '/pages/fridge/fridge' })
  },

  openNotify() {
    this.setData({ reminders: buildReminders(), showNotify: true })
  },

  closeNotify() {
    this.setData({ showNotify: false })
  },

  readAll() {
    markAllRead()
    this.setData({ reminders: buildReminders() })
    toast('已全部标记已读')
  },

  async editNickname() {
    const user = (this as any).data.user as UserProfile
    const res: any = await new Promise((resolve) => {
      wx.showModal({
        title: '修改昵称',
        content: user.nickname,
        editable: true,
        placeholderText: '请输入昵称',
        success: resolve,
        fail: () => resolve(null)
      })
    })
    if (res && res.confirm && res.content) {
      const next = { ...user, nickname: res.content.trim() }
      set(KEYS.USER, next)
      this.setData({ user: next })
      toast('已保存', 'success')
    }
  },

  onDislike(e: any) {
    const key = e.currentTarget.dataset.key
    const user = { ...((this as any).data.user as UserProfile) }
    const arr = user.preferences.dislikes || []
    const idx = arr.indexOf(key)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(key)
    user.preferences = { ...user.preferences, dislikes: arr }
    set(KEYS.USER, user)
    this.setData({ user, dislikeMap: this.toMap(arr) })
  },

  onSwitch(e: any) {
    const key = e.currentTarget.dataset.key
    const user = { ...((this as any).data.user as UserProfile) }
    ;(user.notificationSettings as any)[key] = !user.notificationSettings[key]
    set(KEYS.USER, user)
    this.setData({ user })
    if (key === 'expiration' && user.notificationSettings.expiration) {
      // 预留：真实环境替换为自己的模板 ID
      requestSubscribe('TEMPLATE_ID_EXPIRATION')
    }
  },

  async onSettingSwitch(e: any) {
    const key = e.currentTarget.dataset.key
    const settings = { ...(this as any).data.settings }
    ;(settings as any)[key] = !(settings as any)[key]
    set(KEYS.SETTINGS, settings)
    this.setData({ settings })
    toast(`已${(settings as any)[key] ? '开启' : '关闭'}`)
  },

  async resetData() {
    const ok = await uiConfirm('将清空冰箱数据并恢复演示数据，确定继续？', '重置数据')
    if (!ok) return
    set(KEYS.INGREDIENTS, buildDemoIngredients())
    set(KEYS.USER, DEFAULT_USER)
    set(KEYS.NOTIFICATIONS, {})
    this.setData({ stats: getStats() })
    toast('已恢复演示数据', 'success')
    track('app_launch', { action: 'reset_demo' })
  },

  async clearCache() {
    const ok = await uiConfirm('将清空所有本地数据（冰箱、偏好、埋点），确定继续？', '清空数据')
    if (!ok) return
    clearAll()
    set(KEYS.SETTINGS, {
      mockRecognizeFail: false,
      mockNetworkError: false,
      enableScanAnimation: true
    })
    toast('已清空，重启小程序后重新初始化')
  },

  toggleEvents() {
    this.setData({ showEvents: !(this as any).data.showEvents })
  },

  async clearTrack() {
    const ok = await uiConfirm('清空本地埋点日志？', '清空埋点')
    if (!ok) return
    clearEvents()
    this.setData({ summary: getSummary() })
    toast('已清空埋点')
  },

  comingSoon() {
    toast('功能开发中，敬请期待')
  },

  noop() {
    /* noop */
  }
})
