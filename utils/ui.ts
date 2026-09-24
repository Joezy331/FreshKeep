/** UI 通用能力：Toast / 触感 / 分享文案 */

export function toast(title: string, icon: 'success' | 'error' | 'none' | 'loading' = 'none') {
  wx.showToast({ title, icon, duration: 1800, mask: false })
}

export function loading(title = '处理中', mask = true) {
  wx.showLoading({ title, mask })
}

export function hideLoading() {
  wx.hideLoading()
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    if (wx.vibrateShort) wx.vibrateShort({ type, fail: () => {} })
  } catch (e) {
    /* ignore */
  }
}

export function confirm(content: string, title = '确认操作'): Promise<boolean> {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText: '确定',
      cancelText: '取消',
      confirmColor: '#5C8A6B',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false)
    })
  })
}

export function setNavTitle(title: string) {
  wx.setNavigationBarTitle({ title })
}
