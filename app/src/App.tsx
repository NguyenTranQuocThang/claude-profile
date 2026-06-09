import { useEffect, useState } from 'react'
import type { Profile, StoreState } from './types'
import { ProfileCard } from './components/ProfileCard'
import { ProfileForm } from './components/ProfileForm'
import { SetupBanner } from './components/SetupBanner'
import { ApplyBanner } from './components/ApplyBanner'

const API = '/api'

function App() {
  const [state, setState] = useState<StoreState>({ profiles: [], activeId: null, current: { type: 'none', hasKey: false } })
  const [setup, setSetup] = useState<{ done: boolean; snippet: string; rcFile: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverDown, setServerDown] = useState(false)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
  }

  async function fetchProfiles() {
    try {
      const [profilesRes, setupRes] = await Promise.all([
        fetch(`${API}/profiles`),
        fetch(`${API}/setup`),
      ])
      setState(await profilesRes.json())
      setSetup(await setupRes.json())
      setServerDown(false)
    } catch {
      setServerDown(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfiles() }, [])

  async function handleSwitch(id: string) {
    const profile = state.profiles.find((p) => p.id === id)

    const res = await fetch(`${API}/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      showToast('Failed to switch profile', false)
      return
    }

    fetchProfiles()

    // Verify API key in background (non-blocking) — only for direct Anthropic keys
    if (profile?.type === 'company' && profile.apiKey?.startsWith('sk-ant-')) {
      const verifyRes = await fetch(`${API}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: profile.apiKey }),
      })
      const { valid, reason } = await verifyRes.json()
      if (!valid) {
        showToast(`Switched, but key may be invalid: ${reason}`, false)
        return
      }
    }

    const msg =
      profile?.type === 'company'
        ? 'Switched! Run: source ~/.claude-switcher/active.env'
        : 'Switched to personal. Open a new terminal to apply.'
    showToast(msg)
  }

  async function handleSave(data: Omit<Profile, 'id'> & { id?: string }) {
    const res = await fetch(`${API}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      showToast(data.id ? 'Profile updated' : 'Profile added')
      setShowForm(false)
      setEditProfile(null)
      fetchProfiles()
    } else {
      showToast('Failed to save profile', false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`${API}/profiles/${id}`, { method: 'DELETE' })
    showToast('Profile deleted')
    fetchProfiles()
  }

  function handleEdit(profile: Profile) {
    setEditProfile(profile)
    setShowForm(true)
  }

  const personalProfiles = state.profiles.filter((p) => p.type === 'personal')
  const companyProfiles = state.profiles.filter((p) => p.type === 'company')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-3 text-4xl animate-spin">⚙️</div>
          <p className="text-gray-500">Connecting to server...</p>
        </div>
      </div>
    )
  }

  if (serverDown) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">🔌</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Server not running</h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Start the backend server để dùng app:
          </p>
          <code className="block rounded-xl bg-gray-100 p-4 text-left font-mono text-sm dark:bg-gray-800 dark:text-gray-300">
            npm run start
          </code>
          <button
            onClick={() => { setLoading(true); fetchProfiles() }}
            className="mt-4 rounded-xl bg-claude-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-claude-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm">
              C
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-none text-base">Claude Profile Switcher</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {state.activeId
                  ? `Active: ${state.profiles.find(p => p.id === state.activeId)?.name ?? 'Unknown'}`
                  : 'No active profile'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditProfile(null); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-claude-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-claude-600"
          >
            + Add Profile
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {setup && !setup.done && (
          <SetupBanner snippet={setup.snippet} rcFile={setup.rcFile} onDone={fetchProfiles} />
        )}

        {(() => {
          const active = state.profiles.find(p => p.id === state.activeId)
          return (setup && !setup.done && active?.type === 'company') ? <ApplyBanner /> : null
        })()}

        {state.profiles.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
            <div className="mb-4 text-5xl">🧑‍💻</div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No profiles yet</h2>
            <p className="mb-5 text-gray-500">Thêm profile personal hoặc company để bắt đầu switch</p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-claude-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-claude-600"
            >
              Add first profile
            </button>
          </div>
        )}

        {personalProfiles.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              Personal
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {personalProfiles.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  isActive={p.id === state.activeId}
                  onSwitch={handleSwitch}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </section>
        )}

        {companyProfiles.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              Company
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {companyProfiles.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  isActive={p.id === state.activeId}
                  onSwitch={handleSwitch}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {showForm && (
        <ProfileForm
          initial={editProfile}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditProfile(null) }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-xl ${
            toast.ok ? 'bg-gray-900 dark:bg-white dark:text-gray-900' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default App
