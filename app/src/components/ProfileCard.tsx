import { useState } from 'react'
import type { Profile } from '../types'

interface Props {
  profile: Profile
  isActive: boolean
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (profile: Profile) => void
}

export function ProfileCard({ profile, isActive, onSwitch, onDelete, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isPersonal = profile.type === 'personal'
  const accentClass = isPersonal
    ? 'from-violet-500 to-purple-600'
    : 'from-blue-500 to-indigo-600'

  const hasGit = !!(profile.git?.gitName || profile.git?.gitEmail)

  return (
    <div
      className={`relative rounded-2xl border-2 p-5 transition-all ${
        isActive
          ? 'border-claude-500 bg-claude-50 shadow-lg shadow-claude-100 dark:bg-claude-950/20 dark:border-claude-400 dark:shadow-claude-900/20'
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'
      }`}
    >
      {isActive && (
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-claude-500 px-2.5 py-0.5 text-xs font-medium text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Active
        </span>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white text-lg`}>
          {isPersonal ? '👤' : '🏢'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{profile.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {isPersonal ? 'Personal · OAuth' : 'Company · API Key'}
          </p>
        </div>
      </div>

      {!isPersonal && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">API Key</p>
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {profile.apiKey ? `${profile.apiKey.slice(0, 12)}${'•'.repeat(12)}` : '(not set)'}
          </p>
        </div>
      )}

      {hasGit && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Git</p>
          {profile.git?.gitName && (
            <p className="text-sm text-gray-700 dark:text-gray-300">{profile.git.gitName}</p>
          )}
          {profile.git?.gitEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{profile.git.gitEmail}</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={() => onSwitch(profile.id)}
            className={`flex-1 rounded-xl bg-gradient-to-r ${accentClass} py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-95`}
          >
            Switch to this
          </button>
        )}
        <button
          onClick={() => onEdit(profile)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Edit
        </button>
        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={() => onDelete(profile.id)}
              className="rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400 transition hover:border-red-200 hover:text-red-500 dark:border-gray-600 dark:hover:border-red-800 dark:hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
