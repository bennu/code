'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

interface Toast {
  id: string;
  type: 'loading' | 'success' | 'error';
  message: string;
}

interface ToastContextType {
  showToast: (type: 'loading' | 'success' | 'error', message: string) => string;
  updateToast: (id: string, type: 'loading' | 'success' | 'error', message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: 'loading' | 'success' | 'error', message: string) => {
      const id = `toast-${Date.now()}`;
      const toast: Toast = { id, type, message };
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss success/error after 3s
      if (type !== 'loading') {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
      }

      return id;
    },
    []
  );

  const updateToast = useCallback(
    (id: string, type: 'loading' | 'success' | 'error', message: string) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id ? { ...toast, type, message } : toast
        )
      );

      // Auto-dismiss if changed to success/error
      if (type !== 'loading') {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colorMap = {
    loading: '#00bcd4',
    success: '#4caf50',
    error: '#e91e63',
  };

  const iconMap = {
    loading: <InfoIcon sx={{ fontSize: '20px', animation: 'spin 1s linear infinite' }} />,
    success: <CheckCircleIcon sx={{ fontSize: '20px' }} />,
    error: <ErrorIcon sx={{ fontSize: '20px' }} />,
  };

  return (
    <ToastContext.Provider value={{ showToast, updateToast, removeToast }}>
      {children}

      {/* Toast Stack */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 10000,
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      >
        {toasts.map((toast) => (
          <Box
            key={toast.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: '#1a1a1a',
              border: `1px solid ${colorMap[toast.type]}`,
              borderRadius: '4px',
              minWidth: '300px',
              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
            }}
          >
            <Box sx={{ color: colorMap[toast.type] }}>
              {iconMap[toast.type]}
            </Box>
            <Typography
              sx={{
                color: '#fff',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {toast.message}
            </Typography>
          </Box>
        ))}
      </Box>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
}
