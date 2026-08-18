import { useEffect, useRef } from 'react'
import { Application, Graphics, Text, Container, TextStyle } from 'pixi.js'

// ─── Layout ───────────────────────────────────────────────────────────────────
const TILE = 32
const COLS = 22
const ROWS = 16
const SPEED = 64 // px/sec

// 0 = walkable, 1 = wall/desk
const GRID: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

// Desk "sit" spots (tile in front of each 2×2 desk block)
const DESK_SPOTS: Array<{ col: number; row: number }> = [
  { col: 1, row: 3 }, { col: 4, row: 3 },
  { col: 6, row: 3 }, { col: 9, row: 3 },
  { col: 13, row: 3 }, { col: 16, row: 3 },
  { col: 18, row: 3 }, { col: 1, row: 8 },
  { col: 6, row: 8 }, { col: 13, row: 8 },
  { col: 18, row: 8 }, { col: 1, row: 12 },
  { col: 6, row: 12 }, { col: 13, row: 12 },
]

// Walkable spots for wandering
function walkable(c: number, r: number) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false
  return GRID[r][c] === 0
}

// BFS pathfinding
function bfs(sc: number, sr: number, ec: number, er: number): Array<[number,number]> {
  if (!walkable(ec, er)) return []
  const visited = new Set<string>()
  const key = (c: number, r: number) => `${c},${r}`
  const q: Array<{ c: number; r: number; path: Array<[number,number]> }> = [{ c: sc, r: sr, path: [] }]
  visited.add(key(sc, sr))
  while (q.length) {
    const { c, r, path } = q.shift()!
    const np: Array<[number,number]> = [...path, [c, r]]
    if (c === ec && r === er) return np
    for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nc = c + dc, nr = r + dr
      if (walkable(nc, nr) && !visited.has(key(nc, nr))) {
        visited.add(key(nc, nr))
        q.push({ c: nc, r: nr, path: np })
      }
    }
  }
  return []
}

// Color palette for agents
const ACCENT_COLORS: Record<string, number> = {
  coral: 0xD96A62, mint: 0x5CA97A, sky: 0x4F9FAF,
  lemon: 0xDCAB3C, lilac: 0x9482D3, peach: 0xD99168,
}
const ACCENT_NAMES = Object.keys(ACCENT_COLORS)

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloorAgent {
  id: string
  name: string
  status: string
  action?: string
  accent: string
}

interface CharRuntime {
  agent: FloorAgent
  col: number
  row: number
  px: number
  py: number
  path: Array<[number,number]>
  pathIdx: number
  dx: number   // walk direction for animation
  dy: number
  frame: number  // 0-3 walk frame
  frameTimer: number
  idleTimer: number
  deskCol: number
  deskRow: number
  container: Container
  body: Graphics
  thoughtBg: Graphics
  thoughtText: Text
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  agents: FloorAgent[]
  onSelectAgent: (id: string) => void
}

export default function OfficeFloor({ agents, onSelectAgent }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    app: Application
    chars: Map<string, CharRuntime>
    agentsSnapshot: FloorAgent[]
  } | null>(null)

  useEffect(() => {
    let destroyed = false
    const el = canvasRef.current
    if (!el) return

    const app = new Application()

    const W = COLS * TILE
    const H = ROWS * TILE

    app.init({
      width: W,
      height: H,
      backgroundColor: 0xFCFAF0,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (destroyed) { app.destroy(); return }
      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.maxWidth = '100%'
      canvas.style.maxHeight = '100%'
      canvas.style.objectFit = 'contain'
      el.appendChild(canvas)

      // ── Draw floor tiles ──
      const floorLayer = new Container()
      app.stage.addChild(floorLayer)

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const g = new Graphics()
          if (GRID[r][c] === 1) {
            g.rect(c * TILE, r * TILE, TILE, TILE).fill(0xE8D9A0)
            g.rect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2).fill(0xF4E9C7)
          } else {
            g.rect(c * TILE, r * TILE, TILE, TILE).fill(0xFCFAF0)
            g.rect(c * TILE, r * TILE, TILE, 1).fill(0xF0EAD2)
            g.rect(c * TILE, r * TILE, 1, TILE).fill(0xF0EAD2)
          }
          floorLayer.addChild(g)
        }
      }

      // ── Desk labels ──
      const deskLayer = new Container()
      app.stage.addChild(deskLayer)
      const ds = new TextStyle({ fontFamily: '"Press Start 2P", monospace', fontSize: 5, fill: 0xA899B5 })
      DESK_SPOTS.slice(0, 14).forEach((spot, i) => {
        const lbl = new Text({ text: `D${i + 1}`, style: ds })
        lbl.x = spot.col * TILE + 4
        lbl.y = spot.row * TILE + 4
        deskLayer.addChild(lbl)
      })

      const charLayer = new Container()
      app.stage.addChild(charLayer)

      const chars = new Map<string, CharRuntime>()
      stateRef.current = { app, chars, agentsSnapshot: [] }

      function makeChar(agent: FloorAgent, deskIdx: number): CharRuntime {
        const spot = DESK_SPOTS[deskIdx % DESK_SPOTS.length]
        const accentHex = ACCENT_COLORS[agent.accent] ?? ACCENT_COLORS[ACCENT_NAMES[deskIdx % ACCENT_NAMES.length]]
        const skinColor = 0xF5CBA7
        const hairColors = [0x2C1810, 0x5C3317, 0x8B6914, 0x1A1320, 0x6B4226]
        const hairColor = hairColors[deskIdx % hairColors.length]

        const container = new Container()
        container.x = spot.col * TILE + TILE / 2
        container.y = spot.row * TILE + TILE - 4
        container.eventMode = 'static'
        container.cursor = 'pointer'
        container.on('pointertap', () => onSelectAgent(agent.id))

        const body = new Graphics()
        drawChar(body, accentHex, skinColor, hairColor, 'down', 0)
        container.addChild(body)

        // Thought bubble
        const thoughtBg = new Graphics()
        thoughtBg.visible = false
        container.addChild(thoughtBg)

        const tStyle = new TextStyle({ fontFamily: 'Inter, sans-serif', fontSize: 9, fill: 0x3D2E4A, wordWrap: true, wordWrapWidth: 100 })
        const thoughtText = new Text({ text: '', style: tStyle })
        thoughtText.visible = false
        container.addChild(thoughtText)

        charLayer.addChild(container)

        return {
          agent, col: spot.col, row: spot.row,
          px: spot.col * TILE + TILE / 2, py: spot.row * TILE + TILE - 4,
          path: [], pathIdx: 0, dx: 0, dy: 1,
          frame: 0, frameTimer: 0, idleTimer: Math.random() * 120,
          deskCol: spot.col, deskRow: spot.row,
          container, body, thoughtBg, thoughtText,
        }
      }

      function drawChar(g: Graphics, accent: number, skin: number, hair: number, dir: string, frame: number) {
        g.clear()
        const legOffset = (frame % 2 === 0) ? 0 : (frame === 1 ? -2 : 2)
        // shadow
        g.ellipse(0, 2, 6, 2).fill({ color: 0x000000, alpha: 0.08 })
        // legs
        g.rect(-4, -8, 4, 9 + (dir === 'down' ? legOffset : 0)).fill(0x3D2E4A)
        g.rect(0, -8, 4, 9 + (dir === 'down' ? -legOffset : 0)).fill(0x3D2E4A)
        // body
        g.rect(-6, -20, 12, 14).fill(accent)
        // head
        g.rect(-5, -30, 10, 10).fill(skin)
        // hair
        g.rect(-5, -30, 10, 4).fill(hair)
        // eyes (facing down only)
        if (dir !== 'up') {
          g.rect(-3, -23, 2, 2).fill(0x1A1320)
          g.rect(1, -23, 2, 2).fill(0x1A1320)
        }
        // name chip
        // (shown via container label, not inline)
      }

      function updateThought(rt: CharRuntime) {
        const action = rt.agent.action
        const status = rt.agent.status
        if (!action && status !== 'working') {
          rt.thoughtBg.visible = false
          rt.thoughtText.visible = false
          return
        }
        const txt = action || status
        rt.thoughtText.text = txt.slice(0, 28) + (txt.length > 28 ? '…' : '')
        rt.thoughtText.x = 8
        rt.thoughtText.y = -44
        const tw = rt.thoughtText.width + 8, th = rt.thoughtText.height + 6
        rt.thoughtBg.clear()
          .roundRect(6, -48, tw, th, 3).fill(0xFFF8E7)
          .roundRect(6, -48, tw, th, 3).stroke({ color: 0xD9CFE0, width: 1 })
          // tail
          .poly([10, -36, 6, -30, 14, -34]).fill(0xFFF8E7)
        rt.thoughtBg.visible = true
        rt.thoughtText.visible = true
      }

      function setDest(rt: CharRuntime, tc: number, tr: number) {
        const p = bfs(rt.col, rt.row, tc, tr)
        if (p.length > 1) {
          rt.path = p
          rt.pathIdx = 1
        }
      }

      // Wander: pick a random walkable tile within range
      function wander(rt: CharRuntime) {
        const range = 5
        const candidates: Array<[number, number]> = []
        for (let dc = -range; dc <= range; dc++)
          for (let dr = -range; dr <= range; dr++) {
            const nc = rt.col + dc, nr = rt.row + dr
            if (walkable(nc, nr)) candidates.push([nc, nr])
          }
        if (!candidates.length) return
        const [tc, tr] = candidates[Math.floor(Math.random() * candidates.length)]
        setDest(rt, tc, tr)
      }

      // Sync agents from snapshot
      function syncAgents(newAgents: FloorAgent[]) {
        const ids = new Set(newAgents.map(a => a.id))
        // remove stale
        for (const [id, rt] of chars) {
          if (!ids.has(id)) { rt.container.destroy({ children: true }); chars.delete(id) }
        }
        // add / update
        let deskIdx = 0
        for (const agent of newAgents) {
          const rt = chars.get(agent.id)
          if (!rt) {
            chars.set(agent.id, makeChar(agent, deskIdx))
          } else {
            rt.agent = agent
            updateThought(rt)
            // If now working → walk to desk
            if ((agent.status === 'working' || agent.status === 'thinking') && rt.path.length === 0) {
              setDest(rt, rt.deskCol, rt.deskRow)
            }
          }
          deskIdx++
        }
        stateRef.current!.agentsSnapshot = newAgents
      }

      // Sync initial agents
      syncAgents(agents)

      // Expose sync for prop updates
      ;(stateRef.current as any).syncAgents = syncAgents

      // ── Tick ──────────────────────────────────────────────────────────────
      const ACCENT_NAMES_LOCAL = Object.keys(ACCENT_COLORS)
      let agentDeskIdx = 0

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000

        for (const [, rt] of chars) {
          const accentHex = ACCENT_COLORS[rt.agent.accent] ?? ACCENT_COLORS[ACCENT_NAMES_LOCAL[0]]
          const skinColor = 0xF5CBA7
          const hairColors = [0x2C1810, 0x5C3317, 0x8B6914, 0x1A1320, 0x6B4226]

          if (rt.path.length > 0 && rt.pathIdx < rt.path.length) {
            // Walking
            const [tc, tr] = rt.path[rt.pathIdx]
            const tx = tc * TILE + TILE / 2
            const ty = tr * TILE + TILE - 4
            const dx = tx - rt.px, dy = ty - rt.py
            const dist = Math.sqrt(dx * dx + dy * dy)
            const step = SPEED * dt

            rt.frameTimer += dt
            if (rt.frameTimer > 0.12) { rt.frame = (rt.frame + 1) % 4; rt.frameTimer = 0 }

            if (Math.abs(dx) > Math.abs(dy)) { rt.dx = dx > 0 ? 1 : -1; rt.dy = 0 }
            else { rt.dx = 0; rt.dy = dy > 0 ? 1 : -1 }

            const dir = rt.dx > 0 ? 'right' : rt.dx < 0 ? 'left' : rt.dy > 0 ? 'down' : 'up'
            drawChar(rt.body, accentHex, skinColor, hairColors[0], dir, rt.frame)
            if (rt.dx < 0) rt.body.scale.x = -1
            else rt.body.scale.x = 1

            if (dist <= step) {
              rt.px = tx; rt.py = ty
              rt.col = tc; rt.row = tr
              rt.pathIdx++
            } else {
              rt.px += (dx / dist) * step
              rt.py += (dy / dist) * step
            }
            rt.container.x = rt.px
            rt.container.y = rt.py

          } else {
            // Idle / at destination
            rt.frame = 0
            const dir = rt.dy >= 0 ? 'down' : 'up'
            drawChar(rt.body, accentHex, skinColor, hairColors[0], dir, 0)
            rt.body.scale.x = 1

            // Idle wandering for non-working agents
            if (rt.agent.status !== 'working' && rt.agent.status !== 'thinking') {
              rt.idleTimer -= dt
              if (rt.idleTimer <= 0) {
                rt.idleTimer = 8 + Math.random() * 12
                wander(rt)
              }
            } else {
              // Working → go back to desk if wandered
              if (rt.col !== rt.deskCol || rt.row !== rt.deskRow) {
                setDest(rt, rt.deskCol, rt.deskRow)
              }
            }
          }

          updateThought(rt)
        }
      })
    })

    return () => {
      destroyed = true
      stateRef.current?.app.destroy(true)
      stateRef.current = null
    }
  }, [])

  // Sync agents changes after mount
  useEffect(() => {
    if (stateRef.current && (stateRef.current as any).syncAgents) {
      ;(stateRef.current as any).syncAgents(agents)
    }
  }, [agents])

  return (
    <div
      ref={canvasRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--cth-paper-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  )
}
