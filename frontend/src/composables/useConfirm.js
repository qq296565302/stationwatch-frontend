import { reactive } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const state = reactive({
  visible: false,
  title: '确认',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'default', // default | danger
  resolve: null
})

export const useConfirm = () => {
  const open = (options) => {
    return new Promise((resolve) => {
      Object.assign(state, {
        visible: true,
        title: options.title || '确认',
        message: options.message || '',
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '取消',
        type: options.type || 'default',
        resolve
      })
    })
  }

  const close = (result) => {
    state.visible = false
    if (state.resolve) {
      state.resolve(result)
      state.resolve = null
    }
  }

  return { state, open, close }
}
