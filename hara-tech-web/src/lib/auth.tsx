import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api, setToken, getToken } from './api'

interface User {
  userId: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedName = localStorage.getItem('user_name')
    if (getToken()) {
      try {
        const payload = JSON.parse(atob(getToken()!.split('.')[1]))
        setUser({ userId: payload.userId, email: payload.email, name: storedName || undefined })
      } catch { setToken(null) }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password })
    setToken(res.token)
    const payload = JSON.parse(atob(res.token.split('.')[1]))
    const name = res.user?.name
    if (name) localStorage.setItem('user_name', name)
    setUser({ userId: payload.userId, email: payload.email, name: name || undefined })
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.auth.register({ name, email, password })
    setToken(res.token)
    const payload = JSON.parse(atob(res.token.split('.')[1]))
    const userName = res.user?.name || name
    localStorage.setItem('user_name', userName)
    setUser({ userId: payload.userId, email: payload.email, name: userName })
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('user_name')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
