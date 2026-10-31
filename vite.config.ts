import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** IndexNow proves site ownership with /{key}.txt containing the key; emit it next to the client assets. */
function indexNowKey(key: string | undefined): Plugin {
  return {
    name: 'indexnow-key',
    generateBundle() {
      if (key && this.environment.name === 'client') this.emitFile({ type: 'asset', fileName: `${key}.txt`, source: key })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [tanstackStart(), react(), tailwindcss(), indexNowKey(env.VITE_INDEXNOW_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8000',
        '/sanctum': 'http://localhost:8000',
      },
    },
  }
})
