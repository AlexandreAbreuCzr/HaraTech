import { useCallback, useState, useEffect, type ReactNode } from 'react'
import { api, setToken, getToken, getTokenPayload } from './api'
import { AuthContext, type User } from './auth-context'
const userNameKey = (userId: string) => `hara:user:${userId}:name`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    const payload = getTokenPayload()
    if (getToken() && payload) {
      const storedName = localStorage.getItem(userNameKey(payload.userId))
      setUser({ ...payload, name: storedName || undefined })
    } else if (getToken()) {
      setToken(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('hara:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('hara:unauthorized', handleUnauthorized)
  }, [logout])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password })
    setToken(res.token)
    localStorage.setItem(userNameKey(res.user.id), res.user.name)
    setUser({ userId: res.user.id, email: res.user.email, name: res.user.name })
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.auth.register({ name, email, password })
    setToken(res.token)
    localStorage.setItem(userNameKey(res.user.id), res.user.name)
    setUser({ userId: res.user.id, email: res.user.email, name: res.user.name })
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
