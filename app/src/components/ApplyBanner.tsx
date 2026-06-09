import { useState } from 'react'

const CMD = 'source ~/.claude-switcher/active.env'

export function ApplyBanner() {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(CMD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
      <p className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">
        Apply profile trong terminal hiện tại
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-blue-100 px-3 py-2 font-mono text-sm text-blue-900 dark:bg-blue-900/50 dark:text-blue-200">
          {CMD}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
