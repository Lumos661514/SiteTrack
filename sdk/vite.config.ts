import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'SiteTrackSDK',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'umd' ? 'index.umd.js' : 'index.js'),
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
})
