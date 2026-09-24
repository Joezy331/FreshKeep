import { STATUS_TEXT } from '../../services/food/expiration'
import { daysLeftText } from '../../utils/date'
import type { Ingredient } from '../../types/ingredient'

Component({
  properties: {
    item: { type: Object, value: null },
    /** AI 给出的建议文案 */
    suggestion: { type: String, value: '' }
  },
  data: {
    statusText: '',
    leftText: '',
    isExpired: false
  },
  observers: {
    item: function (item: Ingredient) {
      if (!item) return
      const expired = item.status === 'expired'
      this.setData({
        statusText: STATUS_TEXT[item.status || 'fresh'],
        leftText: daysLeftText(item.daysLeft || 0),
        isExpired: expired
      })
    }
  },
  methods: {
    onCook() {
      const item = (this as any).data.item as Ingredient
      this.triggerEvent('cook', { id: item && item.id, name: item && item.name })
    },
    onTap() {
      const item = (this as any).data.item as Ingredient
      this.triggerEvent('tap', { id: item && item.id })
    }
  }
})
