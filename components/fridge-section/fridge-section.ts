import { STATUS_TEXT } from '../../services/food/expiration'
import type { Ingredient } from '../../types/ingredient'

Component({
  properties: {
    zone: { type: Object, value: null },
    /** 是否默认展开 */
    open: { type: Boolean, value: true }
  },
  data: {
    list: [] as any[],
    slots: [1, 2, 3]
  },
  observers: {
    zone: function (zone: any) {
      if (!zone) return
      this.setData({
        list: (zone.items || []).map((i: Ingredient) => ({
          ...i,
          statusText: STATUS_TEXT[i.status || 'fresh']
        }))
      })
    }
  },
  methods: {
    toggle() {
      this.setData({ open: !(this as any).data.open })
      this.triggerEvent('toggle', { area: (this as any).data.zone.area })
    },
    onItem(e: any) {
      this.triggerEvent('itemtap', { id: e.currentTarget.dataset.id })
    }
  }
})
