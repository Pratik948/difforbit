import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock Tauri's invoke so stores/IPC can be imported without a real Tauri context
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

// localStorage is available in jsdom but starts clean each test
beforeEach(() => {
  localStorage.clear()
})
