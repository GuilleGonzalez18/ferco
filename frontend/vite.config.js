/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function getGitTag() {
  try {
    return execSync('git describe --tags --abbrev=0')
      .toString()
      .trim()
      .replace(/^v/, '')
  } catch {
    return ''
  }
}

function getSha() {
  try {
    return execSync('git rev-parse --short HEAD')
      .toString()
      .trim()
  } catch {
    return ''
  }
}

const version =
  process.env.VITE_APP_VERSION ||
  getGitTag() ||
  getSha() ||
  '0.0.0'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})