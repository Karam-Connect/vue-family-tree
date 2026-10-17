import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? './' : '/',
  // Devtools only for the demo dev server; Vitest runs in `test` mode and doesn't need it
  plugins: [vue(), mode !== 'test' && vueDevTools()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // `--mode demo` builds the demo app (src/app.ts) instead of the library
  build: mode === 'demo'
    ? { outDir: 'demo' }
    : {
        copyPublicDir: false,
        lib: {
          entry: path.resolve(import.meta.dirname, 'src/index.ts'),
          formats: ['es'],
          fileName: 'vue-family-tree',
          cssFileName: 'style',
        },
        rolldownOptions: {
          external: ['vue'],
        },
      },
}))
