import { useRef, useEffect } from "react"

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\+=~"

const PRESETS: Record<string, { speed: number; fontSize: number; opacity: number; headColor: string; brightColor: string; dimColor: string; fadeAlpha: number }> = {
  sidebar:     { speed: 65, fontSize: 12, opacity: 0.38, headColor: "#66ff88", brightColor: "#006622", dimColor: "#001500", fadeAlpha: 0.04 },
  diff:        { speed: 42, fontSize: 13, opacity: 0.30, headColor: "#ffffff", brightColor: "#00ff41", dimColor: "#003300", fadeAlpha: 0.033 },
  modal:       { speed: 35, fontSize: 14, opacity: 0.40, headColor: "#ffffff", brightColor: "#00ff41", dimColor: "#003300", fadeAlpha: 0.06 },
  titlebar:    { speed: 22, fontSize: 11, opacity: 0.22, headColor: "#ccffdd", brightColor: "#00ff41", dimColor: "#002200", fadeAlpha: 0.12 },
  commitPanel: { speed: 30, fontSize: 12, opacity: 0.35, headColor: "#aaffff", brightColor: "#00cccc", dimColor: "#002233", fadeAlpha: 0.05 },
}

interface Props {
  preset?: keyof typeof PRESETS
  style?: React.CSSProperties
}

export default function MatrixRain({ preset = "diff", style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cfg = PRESETS[preset] ?? PRESETS.diff
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let columns: number[] = []
    let animId = 0
    let lastFrame = 0

    function init() {
      if (!canvas) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx!.scale(dpr, dpr)
      const colCount = Math.floor(w / cfg.fontSize)
      columns = Array.from({ length: colCount }, () => Math.floor(Math.random() * (h / cfg.fontSize)) * -1)
    }

    function draw(timestamp: number) {
      animId = requestAnimationFrame(draw)
      if (timestamp - lastFrame < cfg.speed) return
      lastFrame = timestamp
      if (!canvas) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx!.fillStyle = `rgba(0,0,0,${cfg.fadeAlpha})`
      ctx!.fillRect(0, 0, w, h)
      ctx!.font = `${cfg.fontSize}px monospace`
      columns.forEach((y, i) => {
        const x = i * cfg.fontSize
        ctx!.fillStyle = cfg.headColor
        ctx!.shadowColor = cfg.headColor
        ctx!.shadowBlur = 8
        ctx!.fillText(CHARS[Math.floor(Math.random() * CHARS.length)]!, x, y * cfg.fontSize)
        if (y > 1) {
          ctx!.fillStyle = cfg.brightColor
          ctx!.shadowColor = cfg.brightColor
          ctx!.shadowBlur = 4
          ctx!.fillText(CHARS[Math.floor(Math.random() * CHARS.length)]!, x, (y - 1) * cfg.fontSize)
        }
        ctx!.shadowBlur = 0
        if (y * cfg.fontSize > h && Math.random() > 0.975) columns[i] = 0
        else columns[i] = y + 1
      })
    }

    init()
    animId = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => { cancelAnimationFrame(animId); init(); animId = requestAnimationFrame(draw) })
    ro.observe(canvas.parentElement ?? canvas)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [preset])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        opacity: PRESETS[preset]?.opacity ?? 0.3,
        pointerEvents: "none", zIndex: 0,
        ...style,
      }}
    />
  )
}
