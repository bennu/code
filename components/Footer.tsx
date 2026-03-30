"use client"

import { Box, Typography, useTheme } from "@mui/material"

export default function Footer() {
  const theme = useTheme()
  const dark = theme.palette.mode === "dark"

  return (
    <Box
      component="footer"
      sx={{
        background: dark ? "#0a0a0a" : "#1a1a1a",
        color: dark ? "#555" : "#999",
        textAlign: "center",
        padding: "2rem",
        borderTop: dark ? "1px solid #222" : "1px solid #333",
        marginTop: "4rem",
      }}
    >
      <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
        &copy; 2026 Bennu code. Hecho con ❤️ para desarrolladores.
      </Typography>
    </Box>
  )
}
