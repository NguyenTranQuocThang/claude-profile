export interface GitConfig {
  gitName?: string
  gitEmail?: string
}

export interface PersonalProfile {
  id: string
  type: 'personal'
  name: string
  git?: GitConfig
}

export interface CompanyProfile {
  id: string
  type: 'company'
  name: string
  apiKey: string
  git?: GitConfig
}

export type Profile = PersonalProfile | CompanyProfile

export interface StoreState {
  profiles: Profile[]
  activeId: string | null
  current: { type: 'personal' | 'company' | 'none'; hasKey: boolean }
}
