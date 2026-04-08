import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function resolveAppVersion() {
  const envVersion = process.env.VITE_APP_VERSION?.trim()
  if (envVersion) return envVersion

  try {
    const tag = execSync('git describe --tags --abbrev=0', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    if (tag) return tag
  } catch {
    // fallback below
  }
  return '0.0.0'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
})
