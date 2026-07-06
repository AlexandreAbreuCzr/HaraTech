import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Droplets } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpeg" alt="Hara" className="h-8 mb-4" />
          <p className="text-zinc-500 text-sm">Irrigação inteligente</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">Entrar</h2>
          {error && <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</p>}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500 transition-colors"
              placeholder="seu@email.com" required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••" required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg py-2.5 transition-colors">
            Entrar
          </button>
          <p className="text-sm text-zinc-600 text-center">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">Cadastrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
