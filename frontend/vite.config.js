/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from '../package.json'
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

function getLatestTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    return normalizeTag(tag)
  } catch {
    return ''
  }
}

function getLatestRemoteTag() {
  try {
    const out = execSync('git ls-remote --tags origin', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const tags = out
      .split('\n')
      .map((line) => (line || '').trim().split(/\s+/)[1])
      .filter(Boolean)
      .map((t) => t.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, ''));
    const semverTags = tags
      .map(normalizeTag)
      .filter(Boolean)
      .filter((t) => /^\d+\.\d+\.\d+([.-].+)?$/.test(t));
    if (!semverTags.length) return '';
    semverTags.sort((a, b) => {
      const pa = a.split(/[.-]/)[0].split('.').map(Number);
      const pb = b.split(/[.-]/)[0].split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return -1;
        if ((pa[i] || 0) < (pb[i] || 0)) return 1;
      }
      return 0;
    });
    return semverTags[0];
  } catch {
    return '';
  }
}

function resolveVersion() {
  const forced = process.env.VITE_APP_VERSION?.trim()
  if (forced) return forced

  const vercelRef = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim()
  const vercelRefAsTag = /^v?\d+\.\d+\.\d+([.-].+)?$/.test(vercelRef) ? normalizeTag(vercelRef) : ''
  const envTag = normalizeTag(
    process.env.VERCEL_GIT_COMMIT_TAG
      || vercelRefAsTag
      || (process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : '')
      || process.env.CI_COMMIT_TAG
  )
  if (envTag) return envTag

  // Ensure tags are available in CI shallow checkouts (Vercel/Actions)
  try {
    execSync('git fetch --tags --prune --quiet', { stdio: ['ignore', 'ignore', 'ignore'] })
  } catch {
    // ignore fetch errors
  }

  const headTag = getHeadTag()
  if (headTag) return headTag

  const latestTag = getLatestTag()
  if (latestTag) return latestTag

  const latestRemoteTag = getLatestRemoteTag()
  // Only use the latest remote tag when explicitly allowed or when the build was triggered by a tag
  const useLatestRemote = String(process.env.VITE_USE_LATEST_REMOTE_TAG || '').toLowerCase() === 'true' || Boolean(
    process.env.VERCEL_GIT_COMMIT_TAG ||
    process.env.CI_COMMIT_TAG ||
    process.env.GITHUB_REF_TYPE === 'tag'
  );
  if (latestRemoteTag && useLatestRemote) return latestRemoteTag

  const base = String(pkg.version || '0.0.0')
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || ''
  if (branch === 'main') return base

  const sha = getShortSha()
  return sha ? `${base}-${sha}` : base
}

// https://vite.dev/config/
const resolvedAppVersion = resolveVersion();
console.log(`[build] APP_VERSION=${resolvedAppVersion}`);
export default defineConfig({
  plugins: [react()],
define: {
  __APP_VERSION__: JSON.stringify(resolvedAppVersion)
},
})
