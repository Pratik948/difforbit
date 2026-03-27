export type EngineType = "anthropic" | "openai_compatible" | "claude_code"

export interface EngineConfig {
  type: EngineType
  model: string
  baseUrl?: string
  apiKeyRef?: string
  maxTokens: number
  temperature: number
}
