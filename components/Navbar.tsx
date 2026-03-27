'use client';

import {
  AppBar,
  Box,
  IconButton,
  Link as MuiLink,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useThemeMode } from '@/lib/ThemeContext';

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Navbar() {
  const { isDark, toggleTheme } = useThemeMode();

  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        background: isDark
          ? 'rgba(15, 15, 15, 0.85)'
          : 'rgba(245, 244, 240, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: isDark
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: 'var(--font-michroma)',
            fontSize: '1.3rem',
            fontWeight: 700,
            letterSpacing: '2px',
            color: isDark ? '#f0f0f0' : '#000',
            transition: 'color 0.3s ease'
          }}
        >
          code
        </Typography>

        <Box sx={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <MuiLink
            href="https://bennu.cl/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: 'none',
              color: isDark ? '#7885a8' : '#999',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              '&:hover': { color: '#9c27b0' },
            }}
          >
            Bennu Site
          </MuiLink>
          <MuiLink
            component="button"
            onClick={() => handleNavClick('initializer')}
            sx={{
              textDecoration: 'none',
              color: isDark ? '#f0f0f0' : '#000',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              '&:hover': { color: '#9c27b0' },
              border: 'none',
              background: 'none',
              padding: 0,
            }}
          >
            Inicializador
          </MuiLink>
          <MuiLink
            href="https://github.com/bennu"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: 'none',
              color: isDark ? '#f0f0f0' : '#000',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              '&:hover': { color: '#9c27b0' },
            }}
          >
            GitHub
          </MuiLink>
          <Tooltip title={isDark ? 'Modo claro' : 'Modo noche'}>
            <IconButton
              onClick={toggleTheme}
              size="small"
              sx={{
                color: isDark ? '#f0f0f0' : '#000',
                border: isDark
                  ? '1px solid rgba(255,255,255,0.15)'
                  : '1px solid rgba(0,0,0,0.12)',
                borderRadius: '8px',
                padding: '6px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)',
                  borderColor: '#9c27b0',
                  color: '#9c27b0',
                },
              }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
