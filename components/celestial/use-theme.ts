'use client'

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'celestialpass:theme'

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme === 'light') root.classList.add('light')
  else if (theme === 'dark') root.classList.add('dark')
  // 'system' leaves both off so the prefers-color-scheme media query applies.
}

function read(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  return stored ?? 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Sync from storage on mount (the document may have been rendered with a
  // hardcoded class from the server).
  useEffect(() => {
    const initial = read()
    setThemeState(initial)
    apply(initial)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    apply(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return { theme, setTheme }
}
