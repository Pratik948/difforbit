import type { EngineConfig } from "./engine"

export interface ReviewProfile {
  id: string
  name: string
  languages: string[]
  extensions: string[]
  systemPrompt: string
  isBuiltIn: boolean
}

export interface RepoConfig {
  owner: string
  repo: string
  profileId: string
  enabled: boolean
}

export interface ScheduleConfig {
  enabled: boolean
  hour: number
  minute: number
  catchUpOnWake: boolean
}

export interface AppConfig {
  githubUsername: string
  repos: RepoConfig[]
  schedule: ScheduleConfig
  engine: EngineConfig
  profiles: ReviewProfile[]
  showDiff: boolean
  diffContext: number
  onboardingComplete: boolean
}
