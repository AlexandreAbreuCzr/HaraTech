import { useEffect, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('hara_theme', 'light')
  }, [])

  const theme: Theme = 'light'
  const toggle = () => undefined
  const setTheme = (_theme: Theme) => undefined

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
