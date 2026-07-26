import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplets, Sprout, SunMedium } from 'lucide-react'
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
    <div className="brand-shell flex min-h-screen">
      <div className="brand-hero relative hidden w-1/2 items-center justify-center overflow-hidden p-12 lg:flex">
        <div className="brand-grid absolute inset-0 opacity-50" />
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full border border-white/10" />
        <div className="absolute right-14 top-14 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-white/55 uppercase">
          <span className="size-2 rounded-full bg-[var(--accent-sun)]" /> Energia inteligente
        </div>
        <div className="relative text-center">
          <BrandLogo className="mx-auto mb-8 w-72" />
          <p className="mx-auto max-w-sm text-lg text-white/70">
            Irrigação inteligente para um futuro mais sustentável.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80"><SunMedium className="size-3.5 text-[var(--accent-sun)]" />Solar</span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80"><Droplets className="size-3.5 text-[var(--accent-water)]" />Água</span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80"><Sprout className="size-3.5 text-[var(--accent-leaf)]" />Cultivo</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo compact />
          </div>

          <div className="mb-8">
            <p className="brand-overline mb-2">Acesso à plataforma</p>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Entre com sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
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
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>

            <p className="text-center text-sm text-[var(--text-tertiary)]">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                Cadastrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
