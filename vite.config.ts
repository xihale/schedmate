import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // 稳定 vendor 分包：应用代码改动时不作废框架缓存。
        // 注意别把 element-plus 列进来——对象形式会强制收整包、破坏按需 tree-shaking
        manualChunks: {
          vue: ['vue', 'pinia'],
        },
      },
    },
  },
})
