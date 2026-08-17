import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'es2018',
    // CSS 按 Chrome 86 兼容处理：避免 esbuild 将 top/right/bottom/left
    // 合并为 inset（Chrome 86 不支持 inset，会导致弹窗 position:fixed 定位失效）
    cssTarget: 'chrome86'
  },
  server: {
    port: 5199,
    open: true,
    headers: {
      'Cache-Control': 'no-store'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  }
})
