import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import { HardDrive, Wifi, WifiOff, Link2, ArrowRight, Search } from 'lucide-react'
import type { Device } from '../lib/types'

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const fetch = () => {
    api.dispositivos.listar()
      .then(d => setDevices(d.devices))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleLink = async () => {
    setLinkError('')
    if (!linkInput.trim()) return
    try {
      await api.dispositivos.vincular(linkInput.trim().toUpperCase())
      setLinkInput('')
      fetch()
    } catch (err: any) {
      setLinkError(err.message || 'Erro ao vincular')
    }
  }

  const filtered = devices.filter(d =>
    d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    d.chipId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="max-w-4xl">
        <h1 className="text-xl font-bold text-white mb-1">Dispositivos</h1>
        <p className="text-sm text-zinc-500 mb-6">Gerencie seus dispositivos Hara</p>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Vincular Novo</h2>
          <div className="flex gap-2">
            <input
              value={linkInput} onChange={e => setLinkInput(e.target.value)}
              placeholder="HT-XXXXXX"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500 transition-colors uppercase font-mono"
              onKeyDown={e => e.key === 'Enter' && handleLink()}
            />
            <button onClick={handleLink} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors">
              <Link2 className="size-4" /> Vincular
            </button>
          </div>
          {linkError && <p className="text-red-400 text-sm mt-2">{linkError}</p>}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por deviceId ou chipId..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {loading ? (
          <p className="text-zinc-600 text-sm py-12 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
            <HardDrive className="size-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500">{search ? 'Nenhum resultado' : 'Nenhum dispositivo vinculado'}</p>
            {!search && <p className="text-zinc-700 text-sm mt-1">Insira o código acima para vincular</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => (
              <button
                key={d.id}
                onClick={() => navigate(`/dispositivos/${d.deviceId}`)}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={`size-3 rounded-full ${d.isOnline ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-zinc-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{d.deviceId}</span>
                      {d.name && <span className="text-zinc-500 text-sm">— {d.name}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-600 mt-0.5">
                      <span>Chip: {d.chipId}</span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        {d.isOnline ? <Wifi className="size-3 text-green-500" /> : <WifiOff className="size-3" />}
                        {d.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="size-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
