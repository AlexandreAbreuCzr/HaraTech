import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { BrandLogo } from '../components/BrandLogo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Left panel - brand */}
      <div className="hidden lg:flex w-1/2 bg-[var(--text-primary)] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white" />
        </div>
        <div className="relative text-center">
          <BrandLogo className="w-72 mx-auto mb-8" />
          <p className="text-lg text-stone-300 max-w-sm">
            Irrigação inteligente para um futuro mais sustentável
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo compact />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Entre com sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>

            <p className="text-sm text-center text-[var(--text-tertiary)]">
              Ainda não tem conta?{' '}
              <Link to="/register" className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors">
                Cadastrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
