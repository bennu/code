"use client"

import { Box } from "@mui/material"
import { useState, useRef, useEffect } from "react"
import { animate } from "animejs"
import { useThemeMode } from "@/lib/ThemeContext"
import Initializer from "./Initializer"
import CorporateInitializer from "./CorporateInitializer"

type Mode = "terminal" | "corporate"

const SANS = "var(--font-dm-sans)"
const MONO = "var(--font-dm-mono)"
const ACCENT = "#6366f1"

export default function WizardSection() {
  const [mode, setMode] = useState<Mode>("terminal")
  const { isDark } = useThemeMode()
  const contentRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)

  /* slide pill indicator */
  useEffect(() => {
    if (!pillRef.current) return
    animate(pillRef.current, {
      left: mode === "terminal" ? "3px" : "calc(50% + 1px)",
      duration: 320,
      ease: "easeInOutQuart",
    })
  }, [mode])

  const switchMode = (next: Mode) => {
    if (next === mode) return
    if (!contentRef.current) {
      setMode(next)
      return
    }

    /* fade out → swap → fade in */
    animate(contentRef.current, {
      opacity: [1, 0],
      translateY: [0, -10],
      duration: 200,
      ease: "easeInQuart",
      onComplete: () => {
        setMode(next)
        requestAnimationFrame(() => {
          if (contentRef.current) {
            animate(contentRef.current, {
              opacity: [0, 1],
              translateY: [10, 0],
              duration: 300,
              ease: "easeOutQuart",
            })
          }
        })
      },
    })
  }

  return (
    <Box id="code" sx={{ position: "relative", scrollMarginTop: "80px" }}>
      {/* ── floating toggle ── */}
      <Box
        sx={{
          position: "absolute",
          top: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            background: isDark ? "rgba(26,26,26,0.9)" : "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "40px",
            border: isDark ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(99,102,241,0.18)",
            boxShadow: "0 4px 20px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.06)",
            p: "3px",
            gap: 0,
            width: 264,
          }}
        >
          {/* sliding pill background */}
          <Box
            ref={pillRef}
            sx={{
              position: "absolute",
              top: "3px",
              left: "3px",
              width: "calc(50% - 2px)",
              height: "calc(100% - 6px)",
              background: ACCENT,
              borderRadius: "36px",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
              pointerEvents: "none",
            }}
          />

          {/* terminal option */}
          <Box
            onClick={() => switchMode("terminal")}
            sx={{
              flex: 1,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.75,
              px: 1.5,
              borderRadius: "36px",
              cursor: "pointer",
              userSelect: "none",
              transition: "color 0.25s",
              color: mode === "terminal" ? "#fff" : isDark ? "#94a3b8" : "#64748b",
            }}
          >
            <Box component="span" sx={{ fontSize: "0.85rem", lineHeight: 1 }}>
              ⌨
            </Box>
            <Box sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 500 }}>Terminal</Box>
          </Box>

          {/* corporate option */}
          <Box
            onClick={() => switchMode("corporate")}
            sx={{
              flex: 1,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.75,
              px: 1.5,
              borderRadius: "36px",
              cursor: "pointer",
              userSelect: "none",
              transition: "color 0.25s",
              color: mode === "corporate" ? "#fff" : "#64748b",
            }}
          >
            <Box component="span" sx={{ fontSize: "0.85rem", lineHeight: 1 }}>
              ◈
            </Box>
            <Box sx={{ fontFamily: SANS, fontSize: "0.75rem", fontWeight: 500 }}>Corporate</Box>
          </Box>
        </Box>
      </Box>

      {/* ── wizard content ── */}
      <Box ref={contentRef}>{mode === "terminal" ? <Initializer /> : <CorporateInitializer />}</Box>
    </Box>
  )
}
