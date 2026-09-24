let timer: any = null

Component({
  properties: {
    visible: { type: Boolean, value: false },
    text: { type: String, value: 'AI 正在识别食材' },
    sub: { type: String, value: '分析图片特征 · 匹配食材知识库' }
  },
  data: {
    steps: [
      { key: 1, label: '上传图片' },
      { key: 2, label: '视觉识别' },
      { key: 3, label: '匹配保存建议' },
      { key: 4, label: '计算最佳食用期' }
    ],
    active: 1
  },
  observers: {
    visible: function (v: boolean) {
      if (v) {
        this.runSteps()
      } else {
        if (timer) clearInterval(timer)
        this.setData({ active: 1 })
      }
    }
  },
  lifetimes: {
    detached() {
      if (timer) clearInterval(timer)
    }
  },
  methods: {
    runSteps() {
      if (timer) clearInterval(timer)
      this.setData({ active: 1 })
      timer = setInterval(() => {
        const cur = (this as any).data.active
        if (cur >= 4) {
          clearInterval(timer)
          return
        }
        this.setData({ active: cur + 1 })
      }, 420)
    }
  }
})
