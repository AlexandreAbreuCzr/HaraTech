import type { Device, Zone, DeviceConfig, Command, Telemetry } from './types'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

let authToken: string | null = localStorage.getItem('token')

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function getToken() {
  return authToken
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  const contentType = res.headers.get('content-type')
  const isJson = contentType?.includes('json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const message = data?.error?.message || data?.error || 'Erro na requisição'
    throw { status: res.status, message, data }
  }

  if (data && typeof data === 'object' && data.success === true && 'data' in data) {
    return data.data as T
  }

  return data as T
}

interface AuthResponse {
  token: string
  user: { id: string; name: string; email: string; createdAt: string }
}

interface DeviceListResponse {
  devices: Device[]
  total: number
}

interface ZoneListResponse {
  zones: Zone[]
  total: number
}

interface CommandListResponse {
  commands: Command[]
  total: number
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  },
  dispositivos: {
    listar: () => request<DeviceListResponse>('/devices'),
    vincular: (deviceId: string) =>
      request<Device>('/devices/link', { method: 'POST', body: JSON.stringify({ deviceId }) }),
  },
  zonas: {
    listar: (deviceId: string) => request<ZoneListResponse>(`/devices/${deviceId}/zones`),
    criar: (deviceId: string, body: { name: string; index?: number }) =>
      request<Zone>(`/devices/${deviceId}/zones`, { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (deviceId: string, zoneId: string, body: Record<string, unknown>) =>
      request<Zone>(`/devices/${deviceId}/zones/${zoneId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deletar: (deviceId: string, zoneId: string) =>
      request<void>(`/devices/${deviceId}/zones/${zoneId}`, { method: 'DELETE' }),
  },
  comandos: {
    criar: (deviceId: string, body: { type: string; payload?: Record<string, unknown> }) =>
      request<Command>(`/devices/${deviceId}/commands`, { method: 'POST', body: JSON.stringify(body) }),
    listar: (deviceId: string) => request<CommandListResponse>(`/devices/${deviceId}/commands`),
  },
  config: {
    obter: (deviceId: string) => request<DeviceConfig>(`/devices/${deviceId}/config`),
  },
  telemetria: {
    ultima: (deviceId: string) => request<Telemetry | null>(`/devices/${deviceId}/telemetry/latest`),
  },
}
