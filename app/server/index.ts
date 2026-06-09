import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const app = express()
app.use(cors())
app.use(express.json())

const SWITCHER_DIR = path.join(os.homedir(), '.claude-switcher')
const PROFILES_FILE = path.join(SWITCHER_DIR, 'profiles.json')
const ACTIVE_ENV_FILE = path.join(SWITCHER_DIR, 'active.env')
const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const BACKUPS_DIR = path.join(SWITCHER_DIR, 'backups')
const PERSONAL_OAUTH_BACKUP_DIR = path.join(SWITCHER_DIR, 'credentials-backup', 'personal')
const PERSONAL_KEYCHAIN_BACKUP = path.join(PERSONAL_OAUTH_BACKUP_DIR, 'keychain-credentials.b64')
const PERSONAL_OAUTH_JSON_BACKUP = path.join(PERSONAL_OAUTH_BACKUP_DIR, 'claude-oauth.json')
const KEYCHAIN_SERVICE = 'Claude Code-credentials'
const KEYCHAIN_ACCOUNT = 'user'
const GITCONFIG_FILE = path.join(os.homedir(), '.gitconfig')

interface GitConfig {
  gitName?: string
  gitEmail?: string
}

interface PersonalProfile {
  id: string
  type: 'personal'
  name: string
  git?: GitConfig
}

interface CompanyProfile {
  id: string
  type: 'company'
  name: string
  apiKey: string
  git?: GitConfig
}

type Profile = PersonalProfile | CompanyProfile

interface Store {
  activeId: string | null
  profiles: Profile[]
}

function ensureDirs() {
  if (!fs.existsSync(SWITCHER_DIR)) fs.mkdirSync(SWITCHER_DIR, { recursive: true })
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true })
}

function readStore(): Store {
  ensureDirs()
  if (!fs.existsSync(PROFILES_FILE)) {
    return { activeId: null, profiles: [] }
  }
  return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'))
}

function writeStore(store: Store) {
  ensureDirs()
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(store, null, 2))
}

function detectCurrentProfile(): { type: 'personal' | 'company' | 'none'; hasKey: boolean } {
  const hasEnvKey = !!process.env.ANTHROPIC_API_KEY
  if (fs.existsSync(ACTIVE_ENV_FILE)) {
    const content = fs.readFileSync(ACTIVE_ENV_FILE, 'utf-8')
    if (content.includes('ANTHROPIC_API_KEY=')) return { type: 'company', hasKey: true }
    if (content.includes('# personal')) return { type: 'personal', hasKey: false }
  }
  if (hasEnvKey) return { type: 'company', hasKey: true }
  const credFile = path.join(CLAUDE_DIR, '.credentials.json')
  if (fs.existsSync(credFile)) return { type: 'personal', hasKey: false }
  return { type: 'none', hasKey: false }
}

// Update only the [user] section in ~/.gitconfig, preserving all other sections
function updateGitUserSection(name: string, email: string) {
  let content = ''
  if (fs.existsSync(GITCONFIG_FILE)) {
    // Backup before modifying
    fs.copyFileSync(GITCONFIG_FILE, path.join(BACKUPS_DIR, 'gitconfig.bak'))
    content = fs.readFileSync(GITCONFIG_FILE, 'utf-8')
  }

  const userSection = `[user]\n\tname = ${name}\n\temail = ${email}\n`

  // Remove existing [user] section (everything until the next section header)
  const withoutUser = content.replace(/^\[user\][^\[]*(\n(?!\[)|$)*/m, '')
  const cleaned = withoutUser.replace(/\n{3,}/g, '\n\n').trimStart()

  const newContent = cleaned.length > 0
    ? `${userSection}\n${cleaned}`
    : userSection

  fs.writeFileSync(GITCONFIG_FILE, newContent)
}

// GET /api/profiles
app.get('/api/profiles', (_req, res) => {
  const store = readStore()
  const current = detectCurrentProfile()
  res.json({ profiles: store.profiles, activeId: store.activeId, current })
})

// POST /api/profiles — create or update
app.post('/api/profiles', (req, res) => {
  const { id, type, name, apiKey, git } = req.body as Profile & { apiKey?: string; git?: GitConfig }
  if (!type || !name) return res.status(400).json({ error: 'Missing type or name' })

  const store = readStore()
  const existingIdx = store.profiles.findIndex((p) => p.id === id)

  const profile: Profile =
    type === 'personal'
      ? { id: id || crypto.randomUUID(), type: 'personal', name, ...(git ? { git } : {}) }
      : { id: id || crypto.randomUUID(), type: 'company', name, apiKey: apiKey || '', ...(git ? { git } : {}) }

  if (existingIdx >= 0) {
    store.profiles[existingIdx] = profile
  } else {
    store.profiles.push(profile)
  }

  writeStore(store)
  res.json({ profile })
})

// DELETE /api/profiles/:id
app.delete('/api/profiles/:id', (req, res) => {
  const store = readStore()
  store.profiles = store.profiles.filter((p) => p.id !== req.params.id)
  if (store.activeId === req.params.id) store.activeId = null
  writeStore(store)
  res.json({ ok: true })
})

const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')
const CLAUDE_APP_CONFIG = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'config.json')

function patchJsonFile(filePath: string, patch: (data: Record<string, unknown>) => void) {
  if (!fs.existsSync(filePath)) return
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>
    patch(data)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch {
    // ignore parse/write errors — non-critical
  }
}

function clearClaudeOauthSession() {
  patchJsonFile(CLAUDE_JSON, (d) => {
    delete d['oauthAccount']
    for (const k of Object.keys(d)) {
      if (k.toLowerCase().includes('oauth') || k.toLowerCase().includes('account')) {
        delete d[k]
      }
    }
  })
  patchJsonFile(CLAUDE_APP_CONFIG, (d) => {
    for (const k of Object.keys(d)) {
      if (k.toLowerCase().includes('oauth')) delete d[k]
    }
  })
}

function approveApiKey(apiKey: string) {
  const suffix = apiKey.replace(/^sk-[a-z]+-/, '')
  patchJsonFile(CLAUDE_JSON, (d) => {
    d['customApiKeyResponses'] = { approved: [suffix], rejected: [] }
  })
}

async function claudeLogout(): Promise<boolean> {
  try {
    await execAsync('claude auth logout 2>/dev/null', { timeout: 15000 })
    return true
  } catch {
    return false
  }
}

async function hasKeychainCredentials(): Promise<boolean> {
  try {
    await execAsync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" >/dev/null 2>&1`,
      { timeout: 5000 },
    )
    return true
  } catch {
    return false
  }
}

function readClaudeJsonOauthFields(): Record<string, unknown> {
  if (!fs.existsSync(CLAUDE_JSON)) return {}
  try {
    const data = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8')) as Record<string, unknown>
    const oauth: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'oauthAccount' || key.toLowerCase().includes('oauth') || key.toLowerCase().includes('account')) {
        oauth[key] = value
      }
    }
    return oauth
  } catch {
    return {}
  }
}

async function backupPersonalOAuth(): Promise<boolean> {
  ensureDirs()
  if (!fs.existsSync(PERSONAL_OAUTH_BACKUP_DIR)) {
    fs.mkdirSync(PERSONAL_OAUTH_BACKUP_DIR, { recursive: true })
  }

  let backedUp = false

  if (await hasKeychainCredentials()) {
    try {
      const { stdout } = await execAsync(
        `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w 2>/dev/null`,
        { timeout: 5000 },
      )
      const token = stdout.replace(/\n$/, '')
      if (token) {
        fs.writeFileSync(PERSONAL_KEYCHAIN_BACKUP, Buffer.from(token, 'utf-8').toString('base64'))
        backedUp = true
      }
    } catch {
      // no keychain backup
    }
  }

  const oauthFields = readClaudeJsonOauthFields()
  if (Object.keys(oauthFields).length > 0) {
    fs.writeFileSync(PERSONAL_OAUTH_JSON_BACKUP, JSON.stringify(oauthFields, null, 2))
    backedUp = true
  }

  return backedUp
}

function hasPersonalOAuthBackup(): boolean {
  return fs.existsSync(PERSONAL_KEYCHAIN_BACKUP) || fs.existsSync(PERSONAL_OAUTH_JSON_BACKUP)
}

async function restorePersonalOAuth(): Promise<boolean> {
  if (!hasPersonalOAuthBackup()) return false

  let restored = false

  if (fs.existsSync(PERSONAL_KEYCHAIN_BACKUP)) {
    try {
      const token = Buffer.from(fs.readFileSync(PERSONAL_KEYCHAIN_BACKUP, 'utf-8'), 'base64').toString('utf-8')
      await execAsync(
        `security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" >/dev/null 2>&1 || true`,
        { timeout: 5000 },
      )
      const escaped = token.replace(/'/g, `'\\''`)
      await execAsync(
        `security add-generic-password -U -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w '${escaped}' >/dev/null 2>&1`,
        { timeout: 5000 },
      )
      restored = true
    } catch {
      // keychain restore failed
    }
  }

  if (fs.existsSync(PERSONAL_OAUTH_JSON_BACKUP)) {
    try {
      const oauthFields = JSON.parse(fs.readFileSync(PERSONAL_OAUTH_JSON_BACKUP, 'utf-8')) as Record<string, unknown>
      patchJsonFile(CLAUDE_JSON, (d) => {
        Object.assign(d, oauthFields)
      })
      restored = true
    } catch {
      // oauth json restore failed
    }
  }

  return restored
}

function isValidApiKeyFormat(apiKey: string): { valid: boolean; reason?: string } {
  if (!/^sk-ant-(api03|oat01)-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
    return {
      valid: false,
      reason: 'Key phải bắt đầu bằng sk-ant-api03- (lấy tại console.anthropic.com)',
    }
  }
  return { valid: true }
}

async function checkApiKey(apiKey: string): Promise<{ valid: boolean; reason?: string }> {
  const format = isValidApiKeyFormat(apiKey)
  if (!format.valid) return format

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    })
    if (response.ok) return { valid: true }
    const body = await response.json().catch(() => ({}))
    return {
      valid: false,
      reason: (body as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`,
    }
  } catch {
    return { valid: false, reason: 'Network error' }
  }
}

// POST /api/switch — switch active profile
app.post('/api/switch', async (req, res) => {
  const { id } = req.body as { id: string }
  const store = readStore()
  const profile = store.profiles.find((p) => p.id === id)
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  ensureDirs()

  let didLogout = false
  let restoredOAuth = false

  if (profile.type === 'company') {
    if (!profile.apiKey) {
      return res.status(400).json({ error: 'API key chưa được điền' })
    }
    const keyCheck = await checkApiKey(profile.apiKey)
    if (!keyCheck.valid) {
      return res.status(400).json({
        error: 'API key không hợp lệ',
        reason: keyCheck.reason,
      })
    }
    await backupPersonalOAuth()
    didLogout = await claudeLogout()
    clearClaudeOauthSession()
    approveApiKey(profile.apiKey)
    fs.writeFileSync(ACTIVE_ENV_FILE, `export ANTHROPIC_API_KEY="${profile.apiKey}"\n`)
  } else {
    fs.writeFileSync(ACTIVE_ENV_FILE, '# personal\nunset ANTHROPIC_API_KEY 2>/dev/null || true\n')
    patchJsonFile(CLAUDE_JSON, (d) => {
      d['customApiKeyResponses'] = { approved: [], rejected: [] }
    })
    restoredOAuth = await restorePersonalOAuth()
  }

  // Write ~/.gitconfig [user] section if git config is set
  if (profile.git?.gitName && profile.git?.gitEmail) {
    updateGitUserSection(profile.git.gitName, profile.git.gitEmail)
  }

  store.activeId = id
  writeStore(store)

  res.json({ ok: true, profile, envFile: ACTIVE_ENV_FILE, didLogout, restoredOAuth, restartRequired: true })
})

// POST /api/verify — verify a company API key works
app.post('/api/verify', async (req, res) => {
  const { apiKey } = req.body as { apiKey: string }
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' })
  res.json(await checkApiKey(apiKey))
})

const PRECMD_MARKER = '# claude-switcher-precmd'
const PRECMD_SNIPPET = `
# claude-switcher-precmd
_csw_mtime=0
_csw_check() {
  local f="$HOME/.claude-switcher/active.env"
  if [[ -f "$f" ]]; then
    local m=$(stat -f %m "$f" 2>/dev/null)
    if [[ "$m" != "$_csw_mtime" ]]; then
      _csw_mtime="$m"
      source "$f"
    fi
  fi
}
precmd_functions+=(_csw_check)
`

// GET /api/setup — check if one-time shell setup is done
app.get('/api/setup', (_req, res) => {
  const zshRc = path.join(os.homedir(), '.zshrc')
  const done = fs.existsSync(zshRc) && fs.readFileSync(zshRc, 'utf-8').includes(PRECMD_MARKER)
  res.json({ done, snippet: PRECMD_SNIPPET.trim(), rcFile: zshRc })
})

// POST /api/setup — write precmd hook to .zshrc
app.post('/api/setup', (_req, res) => {
  const zshRc = path.join(os.homedir(), '.zshrc')
  const current = fs.existsSync(zshRc) ? fs.readFileSync(zshRc, 'utf-8') : ''
  if (current.includes(PRECMD_MARKER)) {
    return res.json({ ok: true, alreadyDone: true })
  }
  fs.appendFileSync(zshRc, '\n' + PRECMD_SNIPPET)
  res.json({ ok: true })
})

const PORT = 3001
app.listen(PORT, () => console.log(`Claude Switcher API running on http://localhost:${PORT}`))
