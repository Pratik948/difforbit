import { create } from "zustand"
import type { AppConfig, ReviewProfile } from "@/types/config"
import { getConfig, saveConfig } from "@/ipc/config"

const BUILT_IN_PROFILES: ReviewProfile[] = [
  {
    id: "builtin-generic",
    name: "Generic",
    languages: ["any"],
    extensions: ["*"],
    isBuiltIn: true,
    systemPrompt: "You are a senior software engineer performing a thorough code review. Analyse the PR diff for correctness, readability, maintainability, and security. Return raw JSON only — no markdown, no preamble.",
  },
  {
    id: "builtin-react-ts",
    name: "React / TypeScript",
    languages: ["typescript", "javascript"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    isBuiltIn: true,
    systemPrompt: "You are a senior React/TypeScript engineer. Review for: correct hook usage, unnecessary re-renders, type safety, prop drilling, missing error boundaries, accessibility, and bundle-size concerns. Return raw JSON only.",
  },
  {
    id: "builtin-flutter",
    name: "Flutter / Dart",
    languages: ["dart"],
    extensions: [".dart"],
    isBuiltIn: true,
    systemPrompt: "You are a senior Flutter/Dart engineer. Review for: widget rebuild efficiency, const constructors, state management correctness, platform-channel safety, null safety, and pubspec dependency hygiene. Return raw JSON only.",
  },
  {
    id: "builtin-swift",
    name: "Swift",
    languages: ["swift"],
    extensions: [".swift"],
    isBuiltIn: true,
    systemPrompt: "You are a senior Swift/iOS engineer. Review for: memory management, retain cycles, concurrency (async/await, actors), optionals, protocol conformance, and SwiftUI lifecycle correctness. Return raw JSON only.",
  },
  {
    id: "builtin-kotlin",
    name: "Kotlin",
    languages: ["kotlin"],
    extensions: [".kt", ".kts"],
    isBuiltIn: true,
    systemPrompt: "You are a senior Kotlin/Android engineer. Review for: coroutine scope management, null safety, sealed class exhaustiveness, Jetpack Compose recomposition, and gradle dependency hygiene. Return raw JSON only.",
  },
  {
    id: "builtin-java",
    name: "Java",
    languages: ["java"],
    extensions: [".java"],
    isBuiltIn: true,
    systemPrompt: "You are a senior Java engineer. Review for: exception handling, resource leaks, thread safety, equals/hashCode contracts, generics correctness, and Spring/Jakarta EE lifecycle issues. Return raw JSON only.",
  },
  {
    id: "builtin-react-native",
    name: "React Native",
    languages: ["typescript", "javascript"],
    extensions: [".ts", ".tsx", ".js"],
    isBuiltIn: true,
    systemPrompt: "You are a senior React Native engineer. Review for: bridge calls, FlatList optimisation, gesture handler correctness, native module usage, and platform-specific code paths. Return raw JSON only.",
  },
  {
    id: "builtin-c-cpp",
    name: "C / C++",
    languages: ["c", "cpp"],
    extensions: [".c", ".cpp", ".h", ".hpp"],
    isBuiltIn: true,
    systemPrompt: "You are a senior C/C++ engineer. Review for: memory safety, buffer overflows, undefined behaviour, RAII, smart pointer usage, and thread-safety. Return raw JSON only.",
  },
]

const DEFAULT_CONFIG: AppConfig = {
  githubUsername: "",
  repos: [],
  schedule: { enabled: false, hour: 9, minute: 0, catchUpOnWake: true },
  engine: { type: "anthropic", model: "claude-opus-4-5-20251001", maxTokens: 4096, temperature: 0.2 },
  profiles: BUILT_IN_PROFILES,
  showDiff: true,
  diffContext: 5,
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
