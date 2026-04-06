"use client"

import { Box, TextField } from "@mui/material"
import { useState, useEffect, useRef, useCallback } from "react"
import { animate, spring } from "animejs"
import { BACKEND_TEMPLATES, FRONTEND_TEMPLATES, GITHUB_OWNER, MOCK_TREES } from "@/lib/templates"
import { useToast } from "@/components/Toast"
import { TemplateItem } from "@/lib/templates"
import { buildAndDownload } from "@/lib/download"

/* ─── types ─────────────────────────────────────────────────── */
type HistoryEntry = {
  id: number
  type: "command" | "info" | "success"
  label?: string
  value?: string
}

type ProjectType = "full" | "backend" | "frontend"

let _uid = 0

/* ─── constants ──────────────────────────────────────────────── */
const G = "#4ade80"
const DIM = "#555"
const TEXT = "#e2e8f0"
const BLUE = "#7dd3fc"
const MONO = "var(--font-dm-mono)"

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

/*
 * Phases:
 *  0 – project name
 *  1 – project type  (full / backend / frontend)
 *  2 – docker compose (y/n)
 *  3 – backend selection
 *  4 – group id (java only)
 *  5 – frontend selection
 *  6 – review + download trigger
 *  7 – downloading animation
 *  8 – success / restart
 *
 * Display step: phases 0-2 → 1/3 | phases 3-5 → 2/3 | phases 6-8 → 3/3
 */

/* ─── tree helpers ───────────────────────────────────────────── */
interface TreeNode {
  name: string
  isDir: boolean
  children: TreeNode[]
}

function getFileIcon(name: string): string {
  if (name === "Dockerfile" || name === ".dockerignore") return "🐳"
  if (name.endsWith(".java")) return "☕"
  if (name.endsWith(".go")) return "🐹"
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "🔷"
  if (name.endsWith(".jsx") || name.endsWith(".js")) return "🟨"
  if (name.endsWith(".json") || name === "go.sum") return "{}"
  if (name.endsWith(".yml") || name.endsWith(".yaml")) return "⚙️"
  if (name.endsWith(".md")) return "📝"
  if (name.endsWith(".xml")) return "📋"
  if (name.endsWith(".css") || name.endsWith(".scss")) return "🎨"
  if (name.endsWith(".html")) return "🌐"
  return "📄"
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const path of paths) {
    const parts = path.split("/").filter(Boolean)
    const isDir = path.endsWith("/")
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLeaf = i === parts.length - 1
      let node = current.find((n) => n.name === part)
      if (!node) {
        node = { name: part, isDir: isLeaf ? isDir : true, children: [] }
        current.push(node)
      }
      current = node.children
    }
  }
  return root
}

function renderTree(nodes: TreeNode[], prefix = ""): string[] {
  const lines: string[] = []
  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1
    const connector = isLast ? "└── " : "├── "
    const icon = node.isDir ? "📁" : getFileIcon(node.name)
    lines.push(`${prefix}${connector}${icon} ${node.name}${node.isDir ? "/" : ""}`)
    if (node.children.length > 0) {
      lines.push(...renderTree(node.children, prefix + (isLast ? "     " : "│    ")))
    }
  })
  return lines
}

function fixPkgOrder(paths: string[], groupId: string): string[] {
  if (!groupId || !groupId.includes(".")) return paths
  const revParts = groupId.split(".").reverse()
  const rev = revParts.join("/")
  const fwd = groupId.split(".").join("/")
  return paths
    .filter((p) => {
      if (!p.endsWith("/")) return true
      const seg = p.slice(0, -1).split("/").pop() ?? ""
      return !(revParts.slice(0, -1).includes(seg) && paths.some((q) => q.startsWith(p) && q.includes(rev)))
    })
    .map((p) => p.split(rev).join(fwd))
}

async function fetchTreePaths(template: TemplateItem): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${template.repo}/git/trees/HEAD?recursive=1`
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } })
    if (!res.ok) throw new Error("GitHub API error")
    const data = await res.json()
    return (data.tree || []).map(
      (item: { path: string; type: string }) => item.path + (item.type === "tree" ? "/" : ""),
    )
  } catch {
    const key = template.id.replace(/^template_/, "")
    return MOCK_TREES[key] ?? MOCK_TREES[template.id] ?? []
  }
}

/* ─── sub-components ─────────────────────────────────────────── */
function Prompt() {
  return (
    <Box component="span" sx={{ color: G, userSelect: "none", flexShrink: 0 }}>
      user@bennu:~/projects$
    </Box>
  )
}

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        "@keyframes tslIn": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: "tslIn 0.18s ease both",
      }}
    >
      {entry.type === "command" && (
        <>
          <Prompt />
          <Box component="span" sx={{ color: TEXT }}>
            &nbsp;bennu init
          </Box>
        </>
      )}
      {entry.type === "info" && (
        <Box component="span" sx={{ color: DIM }}>
          Initializing project wizard…
        </Box>
      )}
      {entry.type === "success" && (
        <Box component="span">
          <Box component="span" sx={{ color: G }}>
            ✔&nbsp;
          </Box>
          <Box component="span" sx={{ color: "#888" }}>
            {entry.label}
          </Box>
          <Box component="span" sx={{ color: "#555" }}>
            =
          </Box>
          <Box component="span" sx={{ color: TEXT }}>
            &quot;{entry.value}&quot;
          </Box>
        </Box>
      )}
    </Box>
  )
}

function TemplateList({
  templates,
  selectedId,
  onToggle,
}: {
  templates: TemplateItem[]
  selectedId: string | null
  onToggle: (id: string) => void
}) {
  return (
    <Box sx={{ mt: 0.5 }}>
      {templates.map((t, i) => {
        const active = selectedId === t.id
        const disabled = !!t.comingSoon
        return (
          <Box
            key={t.id}
            onClick={disabled ? undefined : () => onToggle(t.id)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 0.25,
              px: 1,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.45 : 1,
              borderLeft: `2px solid ${active ? G : "transparent"}`,
              background: active ? "rgba(74,222,128,0.07)" : "transparent",
              "&:hover": { background: disabled ? "transparent" : "rgba(255,255,255,0.035)" },
              transition: "background 0.12s, border-color 0.12s",
              userSelect: "none",
              "@keyframes tslIn": {
                from: { opacity: 0, transform: "translateX(-6px)" },
                to: { opacity: 1, transform: "translateX(0)" },
              },
              animation: `tslIn ${0.14 + i * 0.05}s ease both`,
            }}
          >
            <Box component="span" sx={{ color: active ? G : DIM, width: 12, flexShrink: 0 }}>
              {active ? "❯" : " "}
            </Box>
            <Box component="span" sx={{ color: "#666", width: 28, flexShrink: 0 }}>
              [{i + 1}]
            </Box>
            <Box component="span" sx={{ color: active ? TEXT : "#aaa", minWidth: 110 }}>
              {t.name}
            </Box>
            <Box component="span" sx={{ color: "#444", fontSize: "0.78rem" }}>
              # {t.badge}
              {disabled ? " (próximamente)" : ""}
            </Box>
          </Box>
        )
      })}
      <Box
        sx={{
          py: 0.25,
          px: 1,
          pl: "27px",
          color: DIM,
          fontSize: "0.8rem",
          fontStyle: "italic",
          userSelect: "none",
        }}
      >
        (press Enter to skip)
      </Box>
    </Box>
  )
}

function OptionList<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: { value: T; label: string; desc?: string }[]
  selectedValue: T
  onSelect: (v: T) => void
}) {
  return (
    <Box sx={{ mt: 0.5 }}>
      {options.map((opt, i) => {
        const active = selectedValue === opt.value
        return (
          <Box
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 0.25,
              px: 1,
              cursor: "pointer",
              borderLeft: `2px solid ${active ? G : "transparent"}`,
              background: active ? "rgba(74,222,128,0.07)" : "transparent",
              "&:hover": { background: "rgba(255,255,255,0.035)" },
              transition: "background 0.12s, border-color 0.12s",
              userSelect: "none",
              "@keyframes tslIn": {
                from: { opacity: 0, transform: "translateX(-6px)" },
                to: { opacity: 1, transform: "translateX(0)" },
              },
              animation: `tslIn ${0.14 + i * 0.05}s ease both`,
            }}
          >
            <Box component="span" sx={{ color: active ? G : DIM, width: 12, flexShrink: 0 }}>
              {active ? "❯" : " "}
            </Box>
            <Box component="span" sx={{ color: "#666", width: 28, flexShrink: 0 }}>
              [{i + 1}]
            </Box>
            <Box component="span" sx={{ color: active ? TEXT : "#aaa", minWidth: 110 }}>
              {opt.label}
            </Box>
            {opt.desc && (
              <Box component="span" sx={{ color: "#444", fontSize: "0.78rem" }}>
                # {opt.desc}
              </Box>
            )}
          </Box>
        )
      })}
      <Box
        sx={{
          py: 0.25,
          px: 1,
          pl: "27px",
          color: DIM,
          fontSize: "0.8rem",
          fontStyle: "italic",
          userSelect: "none",
        }}
      >
        (press Enter to confirm)
      </Box>
    </Box>
  )
}

function TreeBlock({
  label,
  lines,
  loading,
}: {
  label: string
  lines: string[]
  loading: boolean
}) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
        <Prompt />
        <Box component="span" sx={{ color: TEXT }}>
          &nbsp;tree {label}/
        </Box>
      </Box>
      <Box sx={{ pl: 2 }}>
        {loading ? (
          <Box sx={{ color: DIM, fontStyle: "italic" }}>loading tree…</Box>
        ) : lines.length === 0 ? (
          <Box sx={{ color: DIM }}>no tree data</Box>
        ) : (
          lines.map((line, i) => (
            <Box
              key={i}
              component="div"
              sx={{
                whiteSpace: "pre",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "0.8rem",
                color: "#bbb",
                lineHeight: 1.65,
              }}
            >
              {line}
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}

function ProgressBar({ progress }: { progress: number }) {
  const TOTAL = 32
  const filled = Math.min(Math.round((progress / 100) * TOTAL), TOTAL)
  const empty = TOTAL - filled
  return (
    <Box component="span" sx={{ fontFamily: MONO }}>
      <Box component="span" sx={{ color: "#333" }}>
        [
      </Box>
      <Box component="span" sx={{ color: G }}>
        {"█".repeat(filled)}
      </Box>
      <Box component="span" sx={{ color: "#2a2a2a" }}>
        {"░".repeat(empty)}
      </Box>
      <Box component="span" sx={{ color: "#333" }}>
        ]
      </Box>
      <Box component="span" sx={{ color: TEXT, ml: 1 }}>
        {Math.round(progress)}%
      </Box>
    </Box>
  )
}

/* ─── main component ─────────────────────────────────────────── */
export default function Initializer() {
  const { showToast } = useToast()

  /* phase navigation — use a stack for correct back navigation */
  const [phase, setPhase] = useState(0)
  const [phaseHistory, setPhaseHistory] = useState<number[]>([])

  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: _uid++, type: "command" },
    { id: _uid++, type: "info" },
  ])
  const [projectName, setProjectName] = useState("")
  const [projectType, setProjectType] = useState<ProjectType>("full")
  const [includeDocker, setIncludeDocker] = useState(false)
  const [groupId, setGroupId] = useState("")
  const [selectedBackendId, setSelectedBackendId] = useState<string | null>(null)
  const [selectedFrontendId, setSelectedFrontendId] = useState<string | null>(null)

  const [backendTreeLines, setBackendTreeLines] = useState<string[]>([])
  const [frontendTreeLines, setFrontendTreeLines] = useState<string[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  const [dlProgress, setDlProgress] = useState(0)
  const [dlSpinnerIdx, setDlSpinnerIdx] = useState(0)
  const [dlStatus, setDlStatus] = useState<"downloading" | "done" | "error">("downloading")
  const [dlLabel, setDlLabel] = useState("")

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const enterBtnRef = useRef<HTMLDivElement>(null)
  const backBtnRef = useRef<HTMLDivElement>(null)

  const selectedBackend = BACKEND_TEMPLATES.find((t) => t.id === selectedBackendId)
  const selectedFrontend = FRONTEND_TEMPLATES.find((t) => t.id === selectedFrontendId)
  const isJavaTemplate = (t: TemplateItem | undefined) =>
    t?.badge === "Java" || t?.badge === "Quarkus"
  const hasBoth = !!(selectedBackend && selectedFrontend)

  const displayStep = phase <= 2 ? 1 : phase <= 5 ? 2 : 3

  /* phases that add a history entry when confirmed (used for back-pop logic) */
  const HISTORY_PHASES = new Set([0, 1, 2, 3, 4, 5])

  /* helpers */
  const addSuccess = useCallback((label: string, value: string) => {
    setHistory((prev) => [...prev, { id: _uid++, type: "success", label, value }])
  }, [])

  /* auto-scroll */
  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth" })
  }, [history, phase, backendTreeLines, frontendTreeLines, dlProgress])

  /* focus input */
  useEffect(() => {
    inputRef.current?.focus()
  }, [phase])

  /* ── phase 1: number keys 1/2/3 → project type ── */
  useEffect(() => {
    if (phase !== 1) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "1") setProjectType("full")
      if (e.key === "2") setProjectType("backend")
      if (e.key === "3") setProjectType("frontend")
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [phase])

  /* ── phase 2: y/n keys → docker choice (auto-advance) ── */
  useEffect(() => {
    if (phase !== 2) return
    const h = (e: KeyboardEvent) => {
      const yes = e.key === "y" || e.key === "Y" || e.key === "1"
      const no = e.key === "n" || e.key === "N" || e.key === "2"
      if (!yes && !no) return
      const choice = yes
      setIncludeDocker(choice)
      addSuccess("docker_compose", choice ? "yes" : "no")
      setPhaseHistory((prev) => [...prev, 2])
      setPhase(projectType === "frontend" ? 5 : 3)
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, projectType])

  /* ── Enter key for selection phases (1, 3, 5) ── */
  useEffect(() => {
    if (phase !== 1 && phase !== 3 && phase !== 5) return
    let handler: ((e: KeyboardEvent) => void) | null = null
    const timeout = setTimeout(() => {
      handler = (e: KeyboardEvent) => {
        if (e.key === "Enter") confirmPhase()
      }
      window.addEventListener("keydown", handler)
    }, 150)
    return () => {
      clearTimeout(timeout)
      if (handler) window.removeEventListener("keydown", handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, projectType, selectedBackendId, selectedFrontendId])

  /* ── fetch trees at phase 6 ── */
  useEffect(() => {
    if (phase !== 6) return
    setTreeLoading(true)
    const fetches: Promise<void>[] = []
    if (selectedBackend)
      fetches.push(
        fetchTreePaths(selectedBackend).then((paths) =>
          setBackendTreeLines(renderTree(buildTree(fixPkgOrder(paths, groupId)))),
        ),
      )
    if (selectedFrontend)
      fetches.push(
        fetchTreePaths(selectedFrontend).then((paths) =>
          setFrontendTreeLines(renderTree(buildTree(fixPkgOrder(paths, groupId)))),
        ),
      )
    Promise.all(fetches).finally(() => setTreeLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ── spinner during phase 7 ── */
  useEffect(() => {
    if (phase !== 7) return
    const si = setInterval(() => setDlSpinnerIdx((p) => (p + 1) % SPINNER_FRAMES.length), 80)
    return () => clearInterval(si)
  }, [phase])

  /* ── when download done, move to phase 8 ── */
  useEffect(() => {
    if (phase !== 7 || dlStatus !== "done") return
    setDlProgress(100)
    const t = setTimeout(() => {
      setPhaseHistory((prev) => [...prev, 7])
      setPhase(8)
    }, 700)
    return () => clearTimeout(t)
  }, [phase, dlStatus])

  /* ── y key at phase 8 → restart ── */
  const resetWizard = useCallback(() => {
    setPhase(0)
    setPhaseHistory([])
    setHistory([
      { id: _uid++, type: "command" },
      { id: _uid++, type: "info" },
    ])
    setProjectName("")
    setProjectType("full")
    setIncludeDocker(false)
    setGroupId("")
    setSelectedBackendId(null)
    setSelectedFrontendId(null)
    setBackendTreeLines([])
    setFrontendTreeLines([])
    setDlProgress(0)
    setDlStatus("downloading")
  }, [])

  useEffect(() => {
    if (phase !== 8) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y") resetWizard()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [phase, resetWizard])

  /* ── confirm current phase ── */
  const confirmPhase = useCallback(() => {
    if (enterBtnRef.current) {
      animate(enterBtnRef.current, {
        scale: [1, 0.9, 1],
        duration: 200,
        ease: spring({ bounce: 0.4 }),
      })
    }

    if (phase === 0) {
      if (!projectName.trim()) return
      addSuccess("project_name", projectName.trim())
      setPhaseHistory((prev) => [...prev, 0])
      setPhase(1)
    } else if (phase === 1) {
      const typeLabel =
        projectType === "full"
          ? "full (back+front)"
          : projectType === "backend"
            ? "solo backend"
            : "solo frontend"
      addSuccess("project_type", typeLabel)
      setPhaseHistory((prev) => [...prev, 1])
      if (projectType === "frontend") {
        setIncludeDocker(false)
        setPhase(5)
      } else {
        setPhase(2)
      }
    } else if (phase === 3) {
      addSuccess("backend", selectedBackend?.name ?? "none")
      setPhaseHistory((prev) => [...prev, 3])
      if (isJavaTemplate(selectedBackend)) setPhase(4)
      else if (projectType === "full") setPhase(5)
      else setPhase(6)
    } else if (phase === 4) {
      if (!groupId.trim()) return
      addSuccess("group_id", groupId.trim())
      setPhaseHistory((prev) => [...prev, 4])
      if (projectType === "full") setPhase(5)
      else setPhase(6)
    } else if (phase === 5) {
      addSuccess("frontend", selectedFrontend?.name ?? "none")
      setPhaseHistory((prev) => [...prev, 5])
      setPhase(6)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, projectName, projectType, selectedBackend, selectedFrontend, groupId])

  const goBack = useCallback(() => {
    if (phaseHistory.length === 0) return
    if (phase >= 7) return
    if (backBtnRef.current) {
      animate(backBtnRef.current, {
        scale: [1, 0.9, 1],
        duration: 200,
        ease: spring({ bounce: 0.4 }),
      })
    }
    const prevPhase = phaseHistory[phaseHistory.length - 1]
    setPhaseHistory((h) => h.slice(0, -1))
    if (HISTORY_PHASES.has(prevPhase)) {
      setHistory((h) => h.slice(0, -1))
    }
    setPhase(prevPhase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseHistory])

  const downloadProject = async () => {
    const effectiveBackend = projectType !== "frontend" ? selectedBackend : undefined
    const effectiveFrontend = projectType !== "backend" ? selectedFrontend : undefined
    if (!effectiveBackend && !effectiveFrontend) {
      showToast("error", "Selecciona al menos una plantilla")
      return
    }
    setDlLabel(`${projectName}.zip`)
    setDlProgress(0)
    setDlStatus("downloading")
    setPhaseHistory((prev) => [...prev, 6])
    setPhase(7)

    try {
      await buildAndDownload({
        projectName,
        groupId,
        backend: effectiveBackend,
        frontend: effectiveFrontend,
        isJavaBackend: isJavaTemplate(selectedBackend),
        includeDocker,
        onProgress: setDlProgress,
      })
      setDlStatus("done")
    } catch (err) {
      console.error(err)
      showToast("error", "Error al descargar las plantillas")
      setDlStatus("error")
      setPhaseHistory((prev) => prev.slice(0, -1))
      setPhase(6)
    }
  }

  const questionColor = BLUE
  const canBack = phaseHistory.length > 0 && phase < 7
  const canEnter = phase <= 5

  return (
    <Box
      component="section"
      id="initializer"
      sx={{
        background: "linear-gradient(160deg, #07070f 0%, #0c0c18 50%, #080810 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 10,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 700 }}>
        {/* ── title bar ── */}
        <Box
          sx={{
            background: "#252525",
            borderRadius: "10px 10px 0 0",
            border: "1px solid #333",
            borderBottom: "1px solid #1a1a1a",
            px: 2,
            py: 1.1,
            display: "flex",
            alignItems: "center",
            gap: 0.8,
          }}
        >
          <Box
            sx={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "#ff5f57",
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "#febc2e",
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "#28c840",
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              fontFamily: MONO,
              fontSize: "0.72rem",
              color: "#666",
              mx: "auto",
              letterSpacing: "0.03em",
            }}
          >
            user@bennu: ~/projects — bash
          </Box>
        </Box>

        {/* ── terminal body ── */}
        <Box
          ref={terminalRef}
          onClick={() => inputRef.current?.focus()}
          sx={{
            background: "#111",
            border: "1px solid #2a2a2a",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            px: "1.75rem",
            py: "1.5rem",
            minHeight: 460,
            maxHeight: 560,
            overflowY: "auto",
            fontFamily: MONO,
            fontSize: "0.875rem",
            lineHeight: 1.85,
            cursor: "text",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": { background: "#2a2a2a", borderRadius: 2 },
          }}
        >
          {history.map((e) => (
            <HistoryLine key={e.id} entry={e} />
          ))}
          <Box sx={{ height: "0.4rem" }} />

          {/* ── phase 0: project name ── */}
          {phase === 0 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.2s ease both",
              }}
            >
              <Box sx={{ color: questionColor, mb: 0.25 }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;project name:
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 0.5 }}>
                <Box component="span" sx={{ color: G }}>
                  ❯
                </Box>
                <TextField
                  inputRef={inputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation()
                      confirmPhase()
                    }
                  }}
                  placeholder="my-awesome-app"
                  variant="standard"
                  autoFocus
                  sx={{
                    flex: 1,
                    "& .MuiInput-root": {
                      color: TEXT,
                      fontFamily: MONO,
                      fontSize: "0.875rem",
                      "&:before, &:after": { display: "none" },
                    },
                    "& .MuiInput-input": {
                      p: 0,
                      caretColor: G,
                      "&::placeholder": { color: "#3a3a3a", opacity: 1 },
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* ── phase 1: project type ── */}
          {phase === 1 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.2s ease both",
              }}
            >
              <Box sx={{ color: questionColor }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;project type:
              </Box>
              <OptionList<ProjectType>
                options={[
                  { value: "full", label: "full project", desc: "backend + frontend" },
                  { value: "backend", label: "solo backend", desc: "server only" },
                  { value: "frontend", label: "solo frontend", desc: "UI only" },
                ]}
                selectedValue={projectType}
                onSelect={setProjectType}
              />
            </Box>
          )}

          {/* ── phase 2: docker compose ── */}
          {phase === 2 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.2s ease both",
              }}
            >
              <Box sx={{ color: questionColor }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;include docker-compose?
              </Box>
              <OptionList<string>
                options={[
                  { value: "yes", label: "yes", desc: "add docker-compose.yml" },
                  { value: "no", label: "no" },
                ]}
                selectedValue={includeDocker ? "yes" : "no"}
                onSelect={(v) => {
                  const choice = v === "yes"
                  setIncludeDocker(choice)
                  addSuccess("docker_compose", v)
                  setPhaseHistory((prev) => [...prev, 2])
                  setPhase(projectType === "frontend" ? 5 : 3)
                }}
              />
            </Box>
          )}

          {/* ── phase 3: backend ── */}
          {phase === 3 && (
            <Box>
              <Box sx={{ color: questionColor }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;select backend&nbsp;
                <Box component="span" sx={{ color: DIM, fontSize: "0.8rem" }}>
                  (optional)
                </Box>
              </Box>
              <TemplateList
                templates={BACKEND_TEMPLATES}
                selectedId={selectedBackendId}
                onToggle={(id) => setSelectedBackendId((prev) => (prev === id ? null : id))}
              />
            </Box>
          )}

          {/* ── phase 4: group id ── */}
          {phase === 4 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.2s ease both",
              }}
            >
              <Box sx={{ color: questionColor, mb: 0.25 }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;group id:&nbsp;
                <Box component="span" sx={{ color: DIM, fontSize: "0.8rem" }}>
                  (e.g. com.mycompany)
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 0.5 }}>
                <Box component="span" sx={{ color: G }}>
                  ❯
                </Box>
                <TextField
                  inputRef={inputRef}
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation()
                      confirmPhase()
                    }
                  }}
                  placeholder="com.example"
                  variant="standard"
                  autoFocus
                  sx={{
                    flex: 1,
                    "& .MuiInput-root": {
                      color: TEXT,
                      fontFamily: MONO,
                      fontSize: "0.875rem",
                      "&:before, &:after": { display: "none" },
                    },
                    "& .MuiInput-input": {
                      p: 0,
                      caretColor: G,
                      "&::placeholder": { color: "#3a3a3a", opacity: 1 },
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* ── phase 5: frontend ── */}
          {phase === 5 && (
            <Box>
              <Box sx={{ color: questionColor }}>
                <Box component="span" sx={{ color: DIM }}>
                  ?
                </Box>
                &nbsp;select frontend&nbsp;
                <Box component="span" sx={{ color: DIM, fontSize: "0.8rem" }}>
                  (optional)
                </Box>
              </Box>
              <TemplateList
                templates={FRONTEND_TEMPLATES}
                selectedId={selectedFrontendId}
                onToggle={(id) => setSelectedFrontendId((prev) => (prev === id ? null : id))}
              />
            </Box>
          )}

          {/* ── phase 6: review + download ── */}
          {phase === 6 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.25s ease both",
              }}
            >
              {/* cat project.yaml */}
              <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
                <Prompt />
                <Box component="span" sx={{ color: TEXT }}>
                  &nbsp;cat project.yaml
                </Box>
              </Box>
              <Box sx={{ pl: 2, color: "#888", borderLeft: "1px solid #2a2a2a", ml: 0.5, mb: 2 }}>
                {[
                  ["name", projectName],
                  ["type", projectType],
                  ...(isJavaTemplate(selectedBackend) ? [["group_id", groupId]] : []),
                  ["backend", selectedBackend?.name ?? "none"],
                  ["frontend", selectedFrontend?.name ?? "none"],
                  ...(includeDocker ? [["docker", "docker-compose.yml"]] : []),
                ].map(([k, v]) => (
                  <Box key={k}>
                    <Box component="span" sx={{ color: "#666" }}>
                      {k}:{" "}
                    </Box>
                    <Box component="span" sx={{ color: v === "none" ? DIM : TEXT }}>
                      {v}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* file tree previews */}
              {(selectedBackend || selectedFrontend) && (
                <Box sx={{ mb: 1.5 }}>
                  {selectedBackend && (
                    <TreeBlock
                      label={hasBoth ? `${projectName}/backend` : projectName}
                      lines={backendTreeLines}
                      loading={treeLoading && backendTreeLines.length === 0}
                    />
                  )}
                  {selectedFrontend && (
                    <TreeBlock
                      label={hasBoth ? `${projectName}/frontend` : projectName}
                      lines={frontendTreeLines}
                      loading={treeLoading && frontendTreeLines.length === 0}
                    />
                  )}
                </Box>
              )}

              {/* download command */}
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
                <Prompt />
                <Box
                  component="span"
                  onClick={downloadProject}
                  sx={{
                    color: !selectedBackend && !selectedFrontend ? DIM : TEXT,
                    cursor: !selectedBackend && !selectedFrontend ? "not-allowed" : "pointer",
                    "&:hover": !selectedBackend && !selectedFrontend ? {} : { color: G },
                    transition: "color 0.15s",
                  }}
                >
                  &nbsp;bennu download {projectName}.zip
                </Box>
              </Box>
              {!selectedBackend && !selectedFrontend && (
                <Box sx={{ color: "#b45309", fontSize: "0.78rem", pl: 0.5, mt: 0.5 }}>
                  ⚠ selecciona al menos una plantilla antes de descargar
                </Box>
              )}

              {/* blinking cursor */}
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Prompt />
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    width: 8,
                    height: "1em",
                    background: G,
                    verticalAlign: "text-bottom",
                    "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
                    animation: "blink 1.1s step-end infinite",
                  }}
                />
              </Box>
            </Box>
          )}

          {/* ── phase 7: downloading ── */}
          {phase === 7 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.15s ease both",
              }}
            >
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <Prompt />
                <Box component="span" sx={{ color: TEXT }}>
                  &nbsp;bennu download {dlLabel}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pl: 0.5, mb: 0.75 }}>
                <Box
                  component="span"
                  sx={{
                    color: G,
                    fontFamily: MONO,
                    fontSize: "1rem",
                    lineHeight: 1,
                    display: "inline-block",
                    minWidth: "1ch",
                  }}
                >
                  {dlStatus === "done" ? "✔" : SPINNER_FRAMES[dlSpinnerIdx]}
                </Box>
                <Box
                  component="span"
                  sx={{ color: dlStatus === "done" ? G : "#888", fontSize: "0.82rem" }}
                >
                  {dlStatus === "done" ? "Download complete" : "Fetching templates from GitHub…"}
                </Box>
              </Box>
              <Box sx={{ pl: 0.5, mb: 0.5, fontSize: "0.82rem", lineHeight: 2 }}>
                <ProgressBar progress={dlProgress} />
              </Box>
              <Box sx={{ pl: 0.5, color: "#444", fontSize: "0.75rem" }}>
                {dlStatus === "done" ? (
                  <Box component="span" sx={{ color: "#555" }}>
                    saved → ~/{dlLabel}
                  </Box>
                ) : (
                  <Box component="span">
                    <Box component="span" sx={{ color: "#3a3a3a" }}>
                      ETA{" "}
                    </Box>
                    <Box component="span" sx={{ color: "#555" }}>
                      {dlProgress < 30
                        ? "calculating…"
                        : `~${Math.max(1, Math.round((100 - dlProgress) / 12))}s`}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* ── phase 8: success / restart ── */}
          {phase === 8 && (
            <Box
              sx={{
                "@keyframes tslIn": { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: "tslIn 0.3s ease both",
              }}
            >
              <Box sx={{ display: "flex", gap: 1, mb: 0.25 }}>
                <Prompt />
                <Box component="span" sx={{ color: TEXT }}>
                  &nbsp;bennu download {dlLabel}
                </Box>
              </Box>
              <Box sx={{ pl: 0.5, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                  <Box component="span" sx={{ color: G }}>
                    ✔
                  </Box>
                  <Box component="span" sx={{ color: "#888", fontSize: "0.82rem" }}>
                    Download complete
                  </Box>
                </Box>
                <Box sx={{ fontSize: "0.82rem", lineHeight: 2 }}>
                  <ProgressBar progress={100} />
                </Box>
                <Box sx={{ color: "#555", fontSize: "0.75rem" }}>saved → ~/{dlLabel}</Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
                <Prompt />
                <Box component="span" sx={{ color: questionColor }}>
                  &nbsp;? start a new project?
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 2, pl: 2 }}>
                <Box
                  onClick={resetWizard}
                  sx={{
                    color: G,
                    border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: "4px",
                    px: 2,
                    py: 0.5,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    userSelect: "none",
                    "&:hover": {
                      background: "rgba(74,222,128,0.08)",
                      borderColor: "rgba(74,222,128,0.45)",
                    },
                    transition: "all 0.15s",
                  }}
                >
                  [y] yes
                </Box>
                <Box
                  sx={{
                    color: DIM,
                    border: "1px solid #2a2a2a",
                    borderRadius: "4px",
                    px: 2,
                    py: 0.5,
                    fontSize: "0.8rem",
                    userSelect: "none",
                    cursor: "default",
                  }}
                >
                  [n] no
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Prompt />
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    width: 8,
                    height: "1em",
                    background: G,
                    verticalAlign: "text-bottom",
                    "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
                    animation: "blink 1.1s step-end infinite",
                  }}
                />
              </Box>
            </Box>
          )}

          {phase < 6 && phase > 0 && <Box sx={{ height: "0.25rem" }} />}
        </Box>

        {/* ── controls ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 1.5,
            px: 0.5,
          }}
        >
          {/* back */}
          <Box
            ref={backBtnRef}
            onClick={goBack}
            sx={{
              fontFamily: MONO,
              fontSize: "0.75rem",
              color: canBack ? "#555" : "transparent",
              pointerEvents: canBack ? "auto" : "none",
              cursor: "pointer",
              userSelect: "none",
              "&:hover": { color: "#888" },
              transition: "color 0.15s",
            }}
          >
            [esc] back
          </Box>

          {/* step indicator */}
          <Box sx={{ fontFamily: MONO, fontSize: "0.72rem", color: "#333", userSelect: "none" }}>
            [paso {displayStep}/3]
          </Box>

          {/* enter — phases 0, 1, 3, 4, 5 */}
          {canEnter && phase !== 2 && (
            <Box
              ref={enterBtnRef}
              onClick={confirmPhase}
              sx={{
                fontFamily: MONO,
                fontSize: "0.75rem",
                color: G,
                border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: "4px",
                px: 2,
                py: 0.6,
                cursor: "pointer",
                userSelect: "none",
                "&:hover": {
                  background: "rgba(74,222,128,0.08)",
                  borderColor: "rgba(74,222,128,0.45)",
                },
                transition: "all 0.15s",
              }}
            >
              [↵ enter]
            </Box>
          )}

          {/* phase 2 hint (docker) */}
          {phase === 2 && (
            <Box sx={{ fontFamily: MONO, fontSize: "0.75rem", color: "#444", userSelect: "none" }}>
              [click to select]
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
