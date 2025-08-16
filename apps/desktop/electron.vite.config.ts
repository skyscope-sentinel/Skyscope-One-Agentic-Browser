import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@skyscope/agent-core': resolve(__dirname, '../../packages/agent-core/src'),
        '@skyscope/models': resolve(__dirname, '../../packages/models/src'),
        '@skyscope/automation': resolve(__dirname, '../../packages/automation/src'),
        '@skyscope/oauth': resolve(__dirname, '../../packages/oauth/src')
      }
    },
    build: {
      outDir: 'out/main',
      rollupOptions: { input: resolve(__dirname, 'src/main/index.ts') }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@skyscope/agent-core': resolve(__dirname, '../../packages/agent-core/src'),
        '@skyscope/models': resolve(__dirname, '../../packages/models/src'),
        '@skyscope/automation': resolve(__dirname, '../../packages/automation/src'),
        '@skyscope/oauth': resolve(__dirname, '../../packages/oauth/src')
      }
    },
    build: {
      outDir: 'out/preload',
      rollupOptions: { input: resolve(__dirname, 'src/preload/index.ts') }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: { outDir: '../../out/renderer' },
    resolve: {
      alias: {
        '@skyscope/agent-core': resolve(__dirname, '../../packages/agent-core/src'),
        '@skyscope/models': resolve(__dirname, '../../packages/models/src'),
        '@skyscope/automation': resolve(__dirname, '../../packages/automation/src'),
        '@skyscope/oauth': resolve(__dirname, '../../packages/oauth/src')
      }
    },
    plugins: [react()]
  }
})
