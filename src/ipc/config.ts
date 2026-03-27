import { invoke } from "@tauri-apps/api/core"
import type { AppConfig } from "@/types/config"

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config")
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke<void>("save_config", { config })
}
