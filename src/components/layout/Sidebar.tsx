import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { colors, space } from "@/styles/tokens"
import { Panel } from "@/components/ui"

interface NavItem {
  path: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard" },
  { path: "/reports", label: "Reports" },
  { path: "/configuration", label: "Configuration" },
  { path: "/profiles", label: "Profiles" },
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
    overflow: "hidden",
  }

  const logoStyle: React.CSSProperties = {
    padding: `${space["4"]} ${space["4"]} ${space["3"]}`,
    fontFamily: "var(--font-display, 'Inter', system-ui, sans-serif)",
    fontSize: "15px",
    fontWeight: "600",
    color: colors.text.primary,
    letterSpacing: "-0.01em",
    borderBottom: `1px solid ${colors.border.default}`,
  }

  const navStyle: React.CSSProperties = {
    flex: 1,
    padding: `${space["2"]} 0`,
  }

  return (
    <Panel style={sidebarStyle}>
      <div style={logoStyle}>DiffOrbit</div>
      <nav style={navStyle}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          const itemStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            padding: `${space["2"]} ${space["4"]}`,
            cursor: "pointer",
            fontFamily: "var(--font-body, 'Inter', system-ui, sans-serif)",
            fontSize: "13px",
            fontWeight: isActive ? "500" : "400",
            color: isActive ? colors.text.primary : colors.text.secondary,
            borderLeft: isActive ? `2px solid ${colors.border.active}` : "2px solid transparent",
            backgroundColor: isActive ? colors.bg.elevated : "transparent",
            transition: "all 0.15s ease",
            userSelect: "none",
          }
          return (
            <div
              key={item.path}
              style={itemStyle}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </div>
          )
        })}
      </nav>
    </Panel>
  )
}
