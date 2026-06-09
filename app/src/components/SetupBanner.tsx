import { useState } from 'react'

const API = '/api'

interface Props {
  snippet: string
  rcFile: string
  onDone: () => void
}

export function SetupBanner({ snippet, rcFile, onDone }: Props) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('setup-dismissed') === '1'
  })

  if (dismissed) return null

  function copy() {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function autoSetup() {
    setLoading(true)
    await fetch(`${API}/setup`, { method: 'POST' })
    setLoading(false)
    localStorage.setItem('setup-dismissed', '1')
    setDismissed(true)
    onDone()
  }

  function dismiss() {
    localStorage.setItem('setup-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="mb-1 font-semibold text-amber-800 dark:text-amber-300">
            Setup một lần để tự động apply khi switch
          </p>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
            Thêm hook vào <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">{rcFile}</code> để mọi terminal tự apply profile khi switch — không cần chạy lệnh thủ công.
          </p>
          <div className="flex gap-2">
            <button
              onClick={autoSetup}
              disabled={loading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {loading ? 'Adding...' : 'Add to .zshrc automatically'}
            </button>
            <button
              onClick={copy}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            >
              {copied ? 'Copied!' : 'Copy snippet'}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            Sau khi add: mở terminal mới hoặc chạy <code>source ~/.zshrc</code> một lần duy nhất.
          </p>
        </div>
        <button onClick={dismiss} className="text-amber-500 hover:text-amber-700">✕</button>
      </div>
    </div>
  )
}
