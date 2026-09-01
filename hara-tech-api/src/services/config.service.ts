import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';
import { getOwnedDevice } from '../utils/deviceOwnership';

const MAX_TELEMETRY_INTERVAL_SECONDS = 5;
const MAX_CONFIG_SYNC_INTERVAL_SECONDS = 10;

export interface ZoneActuatorConfig {
  type: string;
  driver: string;
  channel: number;
  openAngle: number;
  closedAngle: number;
  minPulseUs: number;
  maxPulseUs: number;
  inverted: boolean;
}

export interface ZoneConfig {
  index: number;
  name: string;
  moistureThreshold: number;
  enabled: boolean;
  desiredState: string;
  actuator: ZoneActuatorConfig | null;
}

export interface DeviceConfigResponse {
  configVersion: number;
  operationMode: string;
  moistureThreshold: number;
  heartbeatIntervalSeconds: number;
  telemetryIntervalSeconds: number;
  configSyncIntervalSeconds: number;
  pumpMode: string;
  maxSimultaneousZones: number | null;
  zones: ZoneConfig[];
}

const zoneConfigSelect = {
  index: true,
  name: true,
  moistureThreshold: true,
  enabled: true,
  desiredState: true,
  actuator: {
    select: {
      type: true,
      driver: true,
      channel: true,
      openAngle: true,
      closedAngle: true,
      minPulseUs: true,
      maxPulseUs: true,
      inverted: true,
    },
  },
} satisfies Prisma.ZoneSelect;

const deviceConfigSelect = {
  operationMode: true,
  moistureThreshold: true,
  heartbeatIntervalSeconds: true,
  telemetryIntervalSeconds: true,
  configSyncIntervalSeconds: true,
  pumpMode: true,
  maxSimultaneousZones: true,
  configVersion: true,
} satisfies Prisma.DeviceConfigSelect;

export async function getDeviceConfig(
  deviceInternalId: string,
  currentVersion?: number
): Promise<DeviceConfigResponse | null> {
  const device = await prisma.device.findUnique({
    where: { id: deviceInternalId },
    select: {
      id: true,
      config: { select: deviceConfigSelect },
      zones: {
        select: zoneConfigSelect,
        orderBy: { index: 'asc' },
      },
    },
  });

  if (!device) {
    throw new AppError('Dispositivo nao encontrado', 404);
  }

  if (!device.config) {
    return null;
  }

  if (
    currentVersion !== undefined &&
    device.config.configVersion <= currentVersion
  ) {
    return null;
  }

  return {
    configVersion: device.config.configVersion,
    operationMode: device.config.operationMode,
    moistureThreshold: device.config.moistureThreshold,
    heartbeatIntervalSeconds: device.config.heartbeatIntervalSeconds,
    telemetryIntervalSeconds: Math.min(
      device.config.telemetryIntervalSeconds,
      MAX_TELEMETRY_INTERVAL_SECONDS
    ),
    configSyncIntervalSeconds: Math.min(
      device.config.configSyncIntervalSeconds,
      MAX_CONFIG_SYNC_INTERVAL_SECONDS
    ),
    pumpMode: device.config.pumpMode,
    maxSimultaneousZones: device.config.maxSimultaneousZones,
    zones: device.zones.map((zone) => ({
      index: zone.index,
      name: zone.name,
      moistureThreshold: zone.moistureThreshold,
      enabled: zone.enabled,
      desiredState: zone.desiredState,
      actuator: zone.actuator
        ? {
            type: zone.actuator.type,
            driver: zone.actuator.driver,
            channel: zone.actuator.channel,
            openAngle: zone.actuator.openAngle,
            closedAngle: zone.actuator.closedAngle,
            minPulseUs: zone.actuator.minPulseUs,
            maxPulseUs: zone.actuator.maxPulseUs,
            inverted: zone.actuator.inverted,
          }
        : null,
    })),
  };
}

/** Returns the runtime configuration for a dashboard user who owns the device. */
export async function getUserDeviceConfig(userId: string, deviceId: string) {
  const device = await getOwnedDevice(userId, deviceId);
  const config = await getDeviceConfig(device.id);

  if (!config) {
    throw new AppError('Configuracao do dispositivo indisponivel', 404);
  }

  return config;
}

/**
 * Every change that the firmware needs to download receives a newer version.
 * The upsert also repairs devices created before runtime configuration existed.
 */
export async function bumpDeviceConfigVersion(
  client: Prisma.TransactionClient,
  deviceInternalId: string
) {
  return client.deviceConfig.upsert({
    where: { deviceId: deviceInternalId },
    update: { configVersion: { increment: 1 } },
    create: { deviceId: deviceInternalId },
  });
}
