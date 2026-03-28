import { create } from "zustand"
import type { AppConfig } from "@/types/config"
import { getConfig, saveConfig } from "@/ipc/config"

const DEFAULT_CONFIG: AppConfig = {
  githubUsername: "",
  repos: [],
  schedule: { enabled: false, hour: 9, minute: 0, catchUpOnWake: true },
  engine: { type: "anthropic", model: "claude-opus-4-5-20251001", maxTokens: 4096, temperature: 0.2 },
  profiles: [],
  showDiff: true,
  diffContext: 5,
  onboardingComplete: false,
  theme: "matrix" as const,
}

interface ConfigStore {
  config: AppConfig
  loading: boolean
  loadConfig: () => Promise<void>
  saveConfig: (config: AppConfig) => Promise<void>
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: DEFAULT_CONFIG,
  loading: false,
  loadConfig: async () => {
    set({ loading: true })
    try {
      const config = await getConfig()
      set({ config })
    } catch {
      // use defaults if no config yet
    } finally {
      set({ loading: false })
    }
  },
  saveConfig: async (config) => {
    await saveConfig(config)
    set({ config })
  },
}))
