import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'
import { execSync } from 'node:child_process'

function normalizeTag(tag) {
  const clean = String(tag || '').trim()
  if (!clean) return ''
  return clean.startsWith('v') ? clean.slice(1) : clean
}

function getShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

function getHeadTag() {
  try {
    const tags = execSync('git tag --points-at HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
    if (!tags.length) return ''
    const semverTag = tags.find((t) => /^v?\d+\.\d+\.\d+([.-].+)?$/.test(t))
    return normalizeTag(semverTag || tags[0])
  } catch {
    return ''
  }
}

function resolveVersion() {
  const forced = process.env.VITE_APP_VERSION?.trim()
  if (forced) return forced

  const envTag = normalizeTag(
    process.env.VERCEL_GIT_COMMIT_TAG
      || (process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : '')
      || process.env.CI_COMMIT_TAG
  )
  if (envTag) return envTag

  const headTag = getHeadTag()
  if (headTag) return headTag

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
