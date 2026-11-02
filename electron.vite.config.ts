import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const external = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`)
]

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: resolve('src/main/index.ts'),
        external,
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
        external,
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    base: './',
    plugins: [react()],
    build: {
      outDir: resolve('out/renderer'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    }
  }
})
