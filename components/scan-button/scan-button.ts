Component({
  properties: {
    title: { type: String, value: '拍照识别食材' },
    sub: { type: String, value: '买菜回来，拍一下就知道怎么放' },
    compact: { type: Boolean, value: false }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
