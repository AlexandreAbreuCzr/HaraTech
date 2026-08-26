import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { BrandLogo } from '../components/BrandLogo'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try { await register(name, email, password); navigate('/') }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.') }
    finally { setLoading(false) }
  }

  return (
    <main className="flex min-h-screen bg-white px-6 py-10">
      <div className="m-auto w-full max-w-[360px]">
        <div className="mb-12"><BrandLogo compact /></div>
        <div className="mb-8"><h1 className="text-3xl font-semibold tracking-[-0.04em] text-black">Criar conta</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Configure seu acesso ao painel.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p role="alert" className="border-l-2 border-black pl-3 text-sm text-black">{error}</p>}
          <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" required />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required />
          <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" minLength={6} required />
          <Button type="submit" loading={loading} className="w-full">Criar conta</Button>
        </form>
        <p className="mt-7 text-sm text-[var(--text-secondary)]">Já possui uma conta? <Link to="/login" className="font-semibold text-black underline underline-offset-4">Entrar</Link></p>
        <p className="mt-16 border-t border-[var(--border-primary)] pt-5 text-xs text-[var(--text-tertiary)]">Hara Tech · Irrigação inteligente</p>
      </div>
    </main>
  )
}
