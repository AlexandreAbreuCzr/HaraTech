export interface Device {
  id: string
  deviceId: string
  chipId: string
  name: string | null
  isLinked: boolean
  isOnline: boolean
  lastSeen: string | null
  lastIp: string | null
  lastRssi: number | null
  createdAt: string
}

export interface Zone {
  id: string
  name: string
  index: number
  isActive: boolean
  createdAt: string
}

export interface ActuatorConfig {
  type: string
  driver: string
  channel: number
  openAngle: number
  closedAngle: number
  minPulseUs: number
  maxPulseUs: number
  inverted: boolean
}

export interface ZoneConfig {
  index: number
  name: string
  enabled: boolean
  desiredState: string
  actuator: ActuatorConfig | null
}

export interface DeviceConfig {
  configVersion: number
  operationMode: string
  moistureThreshold: number
  heartbeatIntervalSeconds: number
  telemetryIntervalSeconds: number
  configSyncIntervalSeconds: number
  pumpMode: string
  maxSimultaneousZones: number | null
  zones: ZoneConfig[]
}

export interface Command {
  id: string
  type: string
  payload: Record<string, unknown> | null
  status: 'PENDING' | 'SENT' | 'ACKED' | 'FAILED'
  createdAt: string
  sentAt: string | null
  ackedAt: string | null
  failedAt: string | null
  failReason: string | null
}

export interface Cultura {
  id: string
  nome: string
  descricao: string
  aguaPorRegaMl: number
  intervaloRegaHoras: number
  umidadeIdealMin: number
  umidadeIdealMax: number
  icone: string
  cor: string
}

export interface Programacao {
  id: string
  dispositivoId: string
  zonaIndex: number
  zonaNome: string
  culturaId: string
  culturaNome: string
  diasSemana: number[]
  horario: string
  ativo: boolean
  quantidadeAguaMl: number
  criadoEm: string
}

export interface TelemetryZone {
  zoneIndex: number
  desiredState: string | null
  appliedState: string | null
  servoAngle: number | null
}

export interface Telemetry {
  id: string
  soilMoisture: number
  pumpOn: boolean
  rssi: number | null
  lastIp: string | null
  uptimeSeconds: number | null
  firmwareVersion: string | null
  createdAt: string
  zones: TelemetryZone[]
}

export interface RegaEvento {
  id: string
  dispositivoId: string
  zonaIndex: number
  zonaNome: string
  culturaNome: string
  quantidadeMl: number
  data: string
  status: 'executado' | 'falhou' | 'cancelado'
}
