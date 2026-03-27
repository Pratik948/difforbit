import { Routes, Route } from "react-router-dom"
import { colors } from "@matrixui/tokens"
import Sidebar from "@/components/layout/Sidebar"
import WindowFrame from "@/components/layout/WindowFrame"
import Dashboard from "@/pages/Dashboard"
import Reports from "@/pages/Reports"
import ReportViewer from "@/pages/ReportViewer"
import Configuration from "@/pages/Configuration"
import Profiles from "@/pages/Profiles"

export default function App() {
  const layoutStyle: React.CSSProperties = {
    display: "flex",
    width: "100vw",
    height: "100%",
    backgroundColor: colors.bg.base,
    overflow: "hidden",
  }

  const mainStyle: React.CSSProperties = {
    flex: 1,
    overflow: "auto",
    position: "relative",
  }

  return (
    <WindowFrame>
      <div style={layoutStyle}>
        <Sidebar />
        <main style={mainStyle}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<ReportViewer />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/profiles" element={<Profiles />} />
          </Routes>
        </main>
      </div>
    </WindowFrame>
  )
}
