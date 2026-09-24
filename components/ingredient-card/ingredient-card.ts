import { STATUS_TEXT } from '../../services/food/expiration'
import { daysLeftText } from '../../utils/date'
import type { Ingredient } from '../../types/ingredient'

Component({
  properties: {
    item: { type: Object, value: null },
    /** 是否显示「去做饭」按钮 */
    action: { type: Boolean, value: false }
  },
  data: {
    statusText: '',
    leftText: '',
    qtyText: ''
  },
  observers: {
    item: function (item: Ingredient) {
      if (!item) return
      this.setData({
        statusText: STATUS_TEXT[item.status || 'fresh'],
        leftText:
          item.status === 'expired' ? daysLeftText(item.daysLeft || 0) : daysLeftText(item.daysLeft || 0),
        qtyText: `${item.quantity}${item.unit}`
      })
    }
  },
  methods: {
    onTap() {
      const item = (this as any).data.item as Ingredient
      this.triggerEvent('tap', { id: item && item.id })
    },
    onAction(e: any) {
      wx.stopPropagation && wx.stopPropagation()
      const item = (this as any).data.item as Ingredient
      this.triggerEvent('cook', { id: item && item.id, name: item && item.name })
    }
  }
})
