import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { colors, space, textGlow } from "@/styles/tokens"
import { Panel } from "@/components/ui"

interface NavItem {
  path: string
  label: string
  glyph: string
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "DASHBOARD", glyph: ">" },
  { path: "/reports", label: "REPORTS", glyph: ">" },
  { path: "/configuration", label: "CONFIG", glyph: ">" },
  { path: "/profiles", label: "PROFILES", glyph: ">" },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const sidebarStyle: React.CSSProperties = {
    width: "220px",
    height: "100%",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: `1px solid ${colors.border.default}`,
    position: "relative",
    overflow: "hidden",
  }

  const logoStyle: React.CSSProperties = {
    padding: `${space['4']} ${space['4']} ${space['3']}`,
    fontFamily: "var(--font-display, 'Share Tech Mono', monospace)",
    fontSize: "11px",
    color: colors.text.tertiary,
    letterSpacing: "0.15em",
    borderBottom: `1px solid ${colors.border.default}`,
    position: "relative",
    zIndex: 1,
  }

  const navStyle: React.CSSProperties = {
    flex: 1,
    padding: `${space['3']} 0`,
    position: "relative",
    zIndex: 1,
  }

  return (
    <Panel rain={{ preset: "sidebar" }} bgOpacity={0.85} style={sidebarStyle}>
      <div style={logoStyle}>[ DIFFORBIT ]</div>
      <nav style={navStyle}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          const itemStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: space['2'],
            padding: `${space['2']} ${space['4']}`,
            cursor: "pointer",
            fontFamily: "var(--font-body, 'Courier New', monospace)",
            fontSize: "12px",
            color: isActive ? colors.text.primary : colors.text.secondary,
            textShadow: isActive ? textGlow.greenPrimary : "none",
            borderLeft: isActive ? `2px solid ${colors.border.active}` : "2px solid transparent",
            backgroundColor: isActive ? `${colors.bg.elevated}88` : "transparent",
            transition: "all 0.15s ease",
            userSelect: "none",
          }
          return (
            <div
              key={item.path}
              style={itemStyle}
              onClick={() => navigate(item.path)}
            >
              <span style={{ color: colors.status.synced, fontSize: "10px" }}>{item.glyph}</span>
              {item.label}
            </div>
          )
        })}
      </nav>
    </Panel>
  )
}
