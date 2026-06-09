import { useState, useEffect } from 'react'
import type { Profile, GitConfig } from '../types'

interface Props {
  initial?: Profile | null
  onSave: (data: Omit<Profile, 'id'> & { id?: string }) => void
  onCancel: () => void
}

export function ProfileForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<'personal' | 'company'>(initial?.type ?? 'personal')
  const [name, setName] = useState(initial?.name ?? '')
  const [apiKey, setApiKey] = useState(initial?.type === 'company' ? initial.apiKey : '')
  const [showKey, setShowKey] = useState(false)
  const [gitName, setGitName] = useState(initial?.git?.gitName ?? '')
  const [gitEmail, setGitEmail] = useState(initial?.git?.gitEmail ?? '')

  useEffect(() => {
    if (initial) {
      setType(initial.type)
      setName(initial.name)
      setApiKey(initial.type === 'company' ? initial.apiKey : '')
      setGitName(initial.git?.gitName ?? '')
      setGitEmail(initial.git?.gitEmail ?? '')
    }
  }, [initial])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (type === 'company' && !apiKey.trim()) return

    const git: GitConfig | undefined =
      gitName.trim() || gitEmail.trim()
        ? { gitName: gitName.trim() || undefined, gitEmail: gitEmail.trim() || undefined }
        : undefined

    const data =
      type === 'personal'
        ? { type: 'personal' as const, name: name.trim(), git, ...(initial?.id ? { id: initial.id } : {}) }
        : { type: 'company' as const, name: name.trim(), apiKey: apiKey.trim(), git, ...(initial?.id ? { id: initial.id } : {}) }

    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
          {initial ? 'Edit Profile' : 'Add New Profile'}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          {/* Type selector */}
          {!initial && (
            <div className="grid grid-cols-2 gap-2">
              {(['personal', 'company'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl border-2 py-3 text-sm font-medium capitalize transition ${
                    type === t
                      ? 'border-claude-500 bg-claude-50 text-claude-700 dark:bg-claude-950/30 dark:text-claude-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t === 'personal' ? '👤 Personal' : '🏢 Company'}
                </button>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Profile Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'personal' ? 'e.g. My Account' : 'e.g. Acme Corp'}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-claude-400 focus:ring-2 focus:ring-claude-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-claude-900/30"
              required
            />
          </div>

          {/* API Key (company only) */}
          {type === 'company' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Anthropic API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 font-mono text-sm outline-none transition focus:border-claude-400 focus:ring-2 focus:ring-claude-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-claude-900/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Stored locally in ~/.claude-switcher/profiles.json
              </p>
            </div>
          )}

          {type === 'personal' && (
            <div className="rounded-xl bg-violet-50 p-3 text-sm text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
              Sẽ dùng OAuth credentials từ <code className="font-mono">~/.claude/</code> (đăng nhập bằng <code className="font-mono">claude auth login</code>)
            </div>
          )}

          {/* Git Config */}
          <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              Git Config <span className="font-normal">(optional — ghi vào ~/.gitconfig khi switch)</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={gitName}
                  onChange={(e) => setGitName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-claude-400 focus:ring-2 focus:ring-claude-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-claude-900/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={gitEmail}
                  onChange={(e) => setGitEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-claude-400 focus:ring-2 focus:ring-claude-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-claude-900/30"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {initial ? 'Save Changes' : 'Add Profile'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
