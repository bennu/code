"use client"

import { Box } from "@mui/material"

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        background: "#111",
        borderTop: "1px solid #2a2a2a",
        padding: "1.5rem 1rem",
        textAlign: "center",
        fontFamily: "var(--font-dm-sans)",
        fontSize: { xs: "0.8rem", sm: "0.9rem" },
        color: "#888",
        lineHeight: 1.6,
      }}
    >
      &copy; 2026 Bennu code. Hecho con ❤️ para desarrolladores.
    </Box>
  )
}
