import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'
import { execSync } from 'node:child_process'

function getShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

function resolveVersion() {
  const forced = process.env.VITE_APP_VERSION?.trim()
  if (forced) return forced

  const base = String(pkg.version || '0.0.0')
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || ''
  if (branch === 'main') return base

  const sha = getShortSha()
  return sha ? `${base}-${sha}` : base
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveVersion()),
  },
})
