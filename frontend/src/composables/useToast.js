import { reactive } from 'vue'
import Toast from '@/components/Toast.vue'

const state = reactive({
  toasts: []
})

let nextId = 0

const show = ({ type = 'info', title = '', message, duration = 3000 }) => {
  const id = ++nextId
  state.toasts.push({ id, type, title, message, duration })
  return id
}

const remove = (id) => {
  const idx = state.toasts.findIndex(t => t.id === id)
  if (idx > -1) state.toasts.splice(idx, 1)
}

export const useToast = () => {
  return {
    toasts: state.toasts,
    show,
    remove,
    success: (message, title = '成功') => show({ type: 'success', title, message }),
    error:   (message, title = '出错了') => show({ type: 'error', title, message }),
    info:    (message, title = '') => show({ type: 'info', title, message }),
    warning: (message, title = '注意') => show({ type: 'warning', title, message }),
    alert:   (message, title = '告警') => show({ type: 'alert', title, message, duration: 8000 })
  }
}
