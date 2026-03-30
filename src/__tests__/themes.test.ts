import { describe, it, expect, beforeEach } from "vitest"
import {
  applyTheme,
  loadCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  getBuiltInVars,
  THEME_META,
} from "@/styles/themes"
import type { CustomThemeMeta } from "@/styles/themes"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCustomTheme(id = "custom-1", label = "My Theme"): CustomThemeMeta {
  const base = getBuiltInVars("shadcn-light")
  return {
    id,
    label,
    description: "Test theme",
    preview: { bg: "#fff", surface: "#f0f0f0", text: "#000", accent: "#0070f3" },
    vars: { ...base, "--do-accent": "#0070f3" },
  }
}

// ── THEME_META ────────────────────────────────────────────────────────────────

describe("THEME_META", () => {
  it("contains exactly 3 built-in themes", () => {
    expect(THEME_META).toHaveLength(3)
  })

  it("includes matrix, shadcn-dark, shadcn-light", () => {
    const ids = THEME_META.map(t => t.id)
    expect(ids).toContain("matrix")
    expect(ids).toContain("shadcn-dark")
    expect(ids).toContain("shadcn-light")
  })

  it("each built-in has a non-empty label and description", () => {
    for (const t of THEME_META) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(0)
    }
  })
})

// ── getBuiltInVars ────────────────────────────────────────────────────────────

describe("getBuiltInVars", () => {
  it("returns vars for each built-in theme", () => {
    for (const id of ["matrix", "shadcn-dark", "shadcn-light"] as const) {
      const vars = getBuiltInVars(id)
      expect(vars["--do-bg-base"]).toBeTruthy()
      expect(vars["--do-text-primary"]).toBeTruthy()
      expect(vars["--do-accent"]).toBeTruthy()
    }
  })

  it("matrix theme has monospace fonts", () => {
    const vars = getBuiltInVars("matrix")
    expect(vars["--font-body"]).toMatch(/monospace/i)
  })

  it("shadcn themes have system fonts", () => {
    const vars = getBuiltInVars("shadcn-light")
    expect(vars["--font-body"]).toMatch(/system-ui|Inter/i)
  })
})

// ── applyTheme ────────────────────────────────────────────────────────────────

describe("applyTheme", () => {
  it("sets --do-bg-base on :root for matrix theme", () => {
    applyTheme("matrix")
    const value = document.documentElement.style.getPropertyValue("--do-bg-base")
    expect(value).toBe("#000000")
  })

  it("sets data-theme attribute", () => {
    applyTheme("shadcn-dark")
    expect(document.documentElement.getAttribute("data-theme")).toBe("shadcn-dark")
  })

  it("applies a custom theme by ID", () => {
    const theme = makeCustomTheme("my-custom")
    saveCustomTheme(theme)

    applyTheme("my-custom")
    const accent = document.documentElement.style.getPropertyValue("--do-accent")
    expect(accent).toBe("#0070f3")
    expect(document.documentElement.getAttribute("data-theme")).toBe("my-custom")
  })

  it("does nothing for an unknown theme ID", () => {
    applyTheme("shadcn-light") // set known state
    applyTheme("nonexistent-theme-xyz")
    // data-theme should still be shadcn-light (last known good)
    expect(document.documentElement.getAttribute("data-theme")).toBe("shadcn-light")
  })
})

// ── Custom theme persistence ──────────────────────────────────────────────────

describe("loadCustomThemes", () => {
  it("returns empty array when nothing saved", () => {
    expect(loadCustomThemes()).toEqual([])
  })

  it("returns saved themes after saveCustomTheme", () => {
    const theme = makeCustomTheme()
    saveCustomTheme(theme)
    const loaded = loadCustomThemes()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe("custom-1")
    expect(loaded[0].label).toBe("My Theme")
  })
})

describe("saveCustomTheme", () => {
  it("saves multiple themes", () => {
    saveCustomTheme(makeCustomTheme("t1", "Theme 1"))
    saveCustomTheme(makeCustomTheme("t2", "Theme 2"))
    expect(loadCustomThemes()).toHaveLength(2)
  })

  it("overwrites a theme with the same ID", () => {
    saveCustomTheme(makeCustomTheme("t1", "Original"))
    saveCustomTheme(makeCustomTheme("t1", "Updated"))
    const themes = loadCustomThemes()
    expect(themes).toHaveLength(1)
    expect(themes[0].label).toBe("Updated")
  })

  it("persists custom vars", () => {
    const theme = makeCustomTheme()
    theme.vars["--do-danger"] = "hsl(0 100% 50%)"
    saveCustomTheme(theme)
    const loaded = loadCustomThemes()[0]
    expect(loaded.vars["--do-danger"]).toBe("hsl(0 100% 50%)")
  })
})

describe("deleteCustomTheme", () => {
  it("removes the theme by ID", () => {
    saveCustomTheme(makeCustomTheme("t1"))
    saveCustomTheme(makeCustomTheme("t2"))
    deleteCustomTheme("t1")
    const themes = loadCustomThemes()
    expect(themes).toHaveLength(1)
    expect(themes[0].id).toBe("t2")
  })

  it("is a no-op for a non-existent ID", () => {
    saveCustomTheme(makeCustomTheme("t1"))
    deleteCustomTheme("does-not-exist")
    expect(loadCustomThemes()).toHaveLength(1)
  })
})
