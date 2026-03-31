import type { EngineConfig } from "./engine"
import type { ThemeId } from "@/styles/themes"
export type { ThemeId }

export interface ReviewProfile {
  id: string
  name: string
  languages: string[]
  extensions: string[]
  systemPrompt: string
  isBuiltIn: boolean
}

export type AutoAction = "none" | "approve" | "request_changes"

export interface RepoConfig {
  owner: string
  repo: string
  profileId: string
  enabled: boolean
  autoPostComments: boolean
  autoAction: AutoAction
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
  theme: ThemeId
}
