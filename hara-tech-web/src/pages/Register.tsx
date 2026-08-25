import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { BrandLogo } from '../components/BrandLogo'
import { CheckCircle2, Droplets, Sprout } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="brand-shell flex min-h-screen">
      <div className="brand-hero relative hidden w-1/2 items-center justify-center overflow-hidden p-12 lg:flex">
        <div className="brand-grid absolute inset-0 opacity-50" />
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div className="relative max-w-md">
          <BrandLogo className="mb-9 w-64" />
          <p className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">Sua irrigação organizada desde o primeiro cultivo.</p>
          <p className="mt-3 text-sm leading-6 text-white/55">Conecte dispositivos, acompanhe o solo e planeje rotinas em um único lugar.</p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Droplets, text: 'Leituras e controles em tempo real' },
              { icon: Sprout, text: 'Perfis de cultivo personalizados' },
              { icon: CheckCircle2, text: 'Histórico confirmado pelo dispositivo' },
            ].map((item) => <div key={item.text} className="flex items-center gap-3 text-sm text-white/70"><span className="flex size-8 items-center justify-center rounded-lg bg-white/8"><item.icon className="size-4 text-[var(--accent-leaf)]" /></span>{item.text}</div>)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo compact />
          </div>

          <div className="mb-8">
            <p className="brand-overline mb-2">Comece agora</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Criar conta</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Preencha os dados para se cadastrar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Input
              label="Nome"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />

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
              Cadastrar
            </Button>

            <p className="text-sm text-center text-[var(--text-tertiary)]">
              Já tem conta?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
