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

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = res.headers.get('content-type')?.includes('json')
    ? await res.json()
    : await res.text()

  if (!res.ok) throw { status: res.status, message: data.error || 'Erro na requisição', data }
  return data
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  },
  dispositivos: {
    listar: () => request('/devices'),
    vincular: (deviceId: string) =>
      request('/devices/link', { method: 'POST', body: JSON.stringify({ deviceId }) }),
  },
  zonas: {
    listar: (deviceId: string) => request(`/devices/${deviceId}/zones`),
    criar: (deviceId: string, body: { name: string; index?: number }) =>
      request(`/devices/${deviceId}/zones`, { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (deviceId: string, zoneId: string, body: Record<string, unknown>) =>
      request(`/devices/${deviceId}/zones/${zoneId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deletar: (deviceId: string, zoneId: string) =>
      request(`/devices/${deviceId}/zones/${zoneId}`, { method: 'DELETE' }),
  },
  comandos: {
    criar: (deviceId: string, body: { type: string; payload?: Record<string, unknown> }) =>
      request(`/devices/${deviceId}/commands`, { method: 'POST', body: JSON.stringify(body) }),
    listar: (deviceId: string) => request(`/devices/${deviceId}/commands`),
  },
  config: {
    obter: (deviceId: string) => request(`/devices/${deviceId}/config`),
  },
  telemetria: {
    ultima: (deviceId: string) => request(`/devices/${deviceId}/telemetry/latest`),
  },
}
