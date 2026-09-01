import type {
  Device,
  Zone,
  DeviceConfig,
  Command,
  Telemetry,
  IrrigationLog,
  ActuatorConfig,
} from './types'

const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 15_000

let authToken: string | null = localStorage.getItem('token')

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(status: number, message: string, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface TokenPayload {
  userId: string
  email: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback
  const error = data.error
  if (isRecord(error) && typeof error.message === 'string') return error.message
  if (typeof error === 'string') return error
  return fallback
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
}

export function getTokenPayload(token = authToken): TokenPayload | null {
  if (!token) return null

  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const parsed = JSON.parse(decodeBase64Url(payload)) as unknown
    if (!isRecord(parsed) || typeof parsed.userId !== 'string' || typeof parsed.email !== 'string') {
      return null
    }
    return { userId: parsed.userId, email: parsed.email }
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function getToken() {
  return authToken
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    })

    if (res.status === 204) return undefined as T

    const contentType = res.headers.get('content-type') ?? ''
    const data: unknown = contentType.includes('json') ? await res.json() : await res.text()

    if (!res.ok) {
      const error = new ApiError(res.status, getErrorMessage(data, 'Não foi possível concluir a solicitação'), data)
      if (res.status === 401 && authToken) {
        window.dispatchEvent(new Event('hara:unauthorized'))
      }
      throw error
    }

    if (isRecord(data) && data.success === true && 'data' in data) {
      return data.data as T
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'A conexão demorou mais do que o esperado. Tente novamente.', null)
    }
    throw new ApiError(0, 'Não foi possível conectar à Hara Tech. Verifique sua conexão.', null)
  } finally {
    window.clearTimeout(timeout)
  }
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

interface IrrigationLogListResponse {
  logs: IrrigationLog[]
  total: number
}

interface DeviceStatusResponse {
  zones: Zone[]
  config: DeviceConfig
  commands: Command[]
  telemetry: Telemetry | null
  irrigationLogs: IrrigationLog[]
}

export interface ZoneMutation {
  name?: string
  index?: number
  moistureThreshold?: number
  isActive?: boolean
  enabled?: boolean
  actuator?: { channel: number } & Partial<Pick<ActuatorConfig, 'openAngle' | 'closedAngle' | 'minPulseUs' | 'maxPulseUs' | 'inverted'>>
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
    status: (deviceId: string) =>
      request<DeviceStatusResponse>(`/devices/${deviceId}/status`),
  },
  zonas: {
    listar: (deviceId: string) => request<ZoneListResponse>(`/devices/${deviceId}/zones`),
    criar: (deviceId: string, body: Required<Pick<ZoneMutation, 'name' | 'index' | 'actuator'>> & ZoneMutation) =>
      request<Zone>(`/devices/${deviceId}/zones`, { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (deviceId: string, zoneId: string, body: ZoneMutation) =>
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
    obter: (deviceId: string) => request<DeviceConfig>(`/devices/${deviceId}/configuration`),
  },
  telemetria: {
    ultima: (deviceId: string) => request<Telemetry | null>(`/devices/${deviceId}/telemetry/latest`),
  },
  irrigacao: {
    listar: () => request<IrrigationLogListResponse>('/devices/irrigation-logs'),
    listarDispositivo: (deviceId: string, limit = 200) =>
      request<IrrigationLogListResponse>(`/devices/${deviceId}/irrigation-logs?limit=${limit}`),
  },
}
