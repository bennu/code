"use client"

import { Box, Button, Container, Stack, Typography } from "@mui/material"

export default function Hero() {
  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
        marginTop: "60px",
      }}
    >
      {/* Conic Gradient Blob */}
      <Box
        sx={{
          position: "absolute",
          width: "600px",
          height: "600px",
          background: "conic-gradient(from 0deg, #9c27b0, #e91e63, #00bcd4, #9c27b0)",
          borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
          opacity: 0.1,
          top: "-200px",
          right: "-100px",
          animation: "float 20s ease-in-out infinite",
          filter: "blur(40px)",
          "@keyframes float": {
            "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
            "50%": { transform: "translate(-50px, -100px) rotate(180deg)" },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <Typography
          variant="h1"
          sx={{
            fontFamily: "var(--font-syne)",
            fontSize: { xs: "3rem", sm: "4rem", md: "5rem" },
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "1rem",
            letterSpacing: "-3px",
            color: "text.primary",
          }}
        >
          Proyectos{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #9c27b0, #e91e63, #00bcd4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            fullstack
          </span>{" "}
          en segundos
        </Typography>

        <Typography
          sx={{
            fontSize: "1.25rem",
            color: "text.secondary",
            marginBottom: "2.5rem",
            lineHeight: 1.6,
            maxWidth: "600px",
            margin: "0 auto 2.5rem",
          }}
        >
          Genera estructuras de proyectos listas para producción. Elige tu stack de tecnología
          favorito y descarga al instante.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          sx={{ marginBottom: "2.5rem" }}
        >
          <Button
            variant="contained"
            sx={{
              padding: "0.9rem 2.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              background: "#00bcd4",
              color: "#fff",
              "&:hover": {
                background: "#0097a7",
                transform: "translateY(-2px)",
              },
            }}
            onClick={() => handleNavClick("initializer")}
          >
            Comenzar
          </Button>
        </Stack>

        {/* Stats */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          justifyContent="center"
          sx={{ marginTop: "2rem" }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontFamily: "var(--font-syne)",
                fontSize: "2.5rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #9c27b0, #e91e63)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              10
            </Typography>
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: "text.secondary",
                marginTop: "0.5rem",
                fontWeight: 500,
              }}
            >
              Plantillas
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontFamily: "var(--font-syne)",
                fontSize: "2.5rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #9c27b0, #e91e63)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              5
            </Typography>
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: "text.secondary",
                marginTop: "0.5rem",
                fontWeight: 500,
              }}
            >
              Stacks de Tecnología
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontFamily: "var(--font-syne)",
                fontSize: "2.5rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #9c27b0, #e91e63)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ∞
            </Typography>
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: "text.secondary",
                marginTop: "0.5rem",
                fontWeight: 500,
              }}
            >
              Posibilidades
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
