"use client"

import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material"
import { useState } from "react"
import { useThemeMode } from "@/lib/ThemeContext"

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const navLinks = [
  { label: "Bennu Site", href: "https://bennu.cl/", external: true },
  { label: "Inicializador", href: "#code", external: false },
  { label: "GitHub", href: "https://github.com/bennu", external: true },
]

export default function Navbar() {
  const { isDark, toggleTheme } = useThemeMode()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const linkSx = (muted = false) => ({
    textDecoration: "none",
    color: muted
      ? isDark ? "#7885a8" : "#999"
      : isDark ? "#f0f0f0" : "#000",
    fontSize: "0.95rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.3s ease",
    "&:hover": { color: "#9c27b0" },
  })

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          background: isDark ? "rgba(15, 15, 15, 0.85)" : "rgba(245, 244, 240, 0.8)",
          backdropFilter: "blur(10px)",
          borderBottom: isDark
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "none",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            padding: "1rem 2rem",
          }}
        >
          <MuiLink
            href="#"
            sx={{
              fontFamily: "var(--font-michroma)",
              fontSize: "1.3rem",
              fontWeight: 700,
              letterSpacing: "2px",
              color: isDark ? "#f0f0f0" : "#000",
              transition: "color 0.3s ease",
              textDecoration: "none",
              "&:hover": { color: "#9c27b0" },
            }}
          >
            code
          </MuiLink>

          {/* Desktop links */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: "2rem", alignItems: "center" }}>
            {navLinks.map(({ label, href, external }) => (
              <MuiLink
                key={label}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                sx={linkSx(label === "Bennu Site")}
              >
                {label}
              </MuiLink>
            ))}
            <Tooltip title={isDark ? "Modo claro" : "Modo noche"}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: isDark ? "#f0f0f0" : "#000",
                  border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                  borderRadius: "8px",
                  padding: "6px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    borderColor: "#9c27b0",
                    color: "#9c27b0",
                  },
                }}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Mobile: theme toggle + hamburger */}
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: "0.75rem", alignItems: "center" }}>
            <Tooltip title={isDark ? "Modo claro" : "Modo noche"}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: isDark ? "#f0f0f0" : "#000",
                  border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                  borderRadius: "8px",
                  padding: "6px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    borderColor: "#9c27b0",
                    color: "#9c27b0",
                  },
                }}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{
                color: isDark ? "#f0f0f0" : "#000",
                border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: "8px",
                padding: "6px",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  borderColor: "#9c27b0",
                  color: "#9c27b0",
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 260,
            background: isDark ? "#0f0f0f" : "#f5f4f0",
            borderLeft: isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(0,0,0,0.08)",
            padding: "1.5rem 1rem",
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <MuiLink
            href="#"
            onClick={() => setDrawerOpen(false)}
            sx={{
              fontFamily: "var(--font-michroma)",
              fontSize: "1.2rem",
              fontWeight: 700,
              letterSpacing: "2px",
              color: isDark ? "#f0f0f0" : "#000",
              textDecoration: "none",
              "&:hover": { color: "#9c27b0" },
            }}
          >
            code
          </MuiLink>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            size="small"
            sx={{
              color: isDark ? "#f0f0f0" : "#000",
              padding: "4px",
              "&:hover": { color: "#9c27b0" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Drawer links */}
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {navLinks.map(({ label, href, external }) => (
            <ListItem key={label} disablePadding>
              <MuiLink
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => setDrawerOpen(false)}
                sx={{
                  ...linkSx(label === "Bennu Site"),
                  display: "block",
                  width: "100%",
                  padding: "0.75rem 0.5rem",
                  fontSize: "1rem",
                  borderBottom: isDark
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {label}
              </MuiLink>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  )
}
