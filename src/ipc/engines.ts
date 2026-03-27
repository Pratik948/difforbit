import { invoke } from "@tauri-apps/api/core"

export async function saveApiKey(service: string, key: string): Promise<void> {
  return invoke<void>("save_api_key", { service, key })
}

export async function hasApiKey(service: string): Promise<boolean> {
  return invoke<boolean>("has_api_key", { service })
}

export async function deleteApiKey(service: string): Promise<void> {
  return invoke<void>("delete_api_key", { service })
}
