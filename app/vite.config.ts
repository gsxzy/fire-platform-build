import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    inspectAttr(),
    react(),
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ].filter(Boolean),
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            if (id.includes('react-router')) return 'react-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor';
            if (id.includes('konva') || id.includes('react-konva')) return 'canvas-vendor';
            if (id.includes('hls.js')) return 'hls-vendor';
            if (id.includes('@radix-ui')) return 'ui-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            if (id.includes('date-fns')) return 'date-vendor';
          }
        },
      },
    },
    sourcemap: mode === 'development',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}))
