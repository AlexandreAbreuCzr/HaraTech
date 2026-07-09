import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOwnedDevice } from '../utils/deviceOwnership';

export interface TelemetryZoneInput {
  zoneIndex: number;
  desiredState?: string;
  appliedState?: string;
  confirmedState?: string;
  servoAngle?: number;
}

export interface TelemetryInput {
  soilMoisture: number;
  pumpOn: boolean;
  firmwareTimestampMs?: number;
  rssi?: number;
  lastIp?: string;
  uptimeSeconds?: number;
  firmwareVersion?: string;
  zones?: TelemetryZoneInput[];
}

export async function processTelemetry(
  deviceInternalId: string,
  input: TelemetryInput
) {
  const device = await prisma.device.findUnique({
    where: { id: deviceInternalId },
    select: { id: true },
  });

  if (!device) {
    throw new AppError('Dispositivo nao encontrado', 404);
  }

  const telemetry = await prisma.deviceTelemetry.create({
    data: {
      deviceId: deviceInternalId,
      soilMoisture: input.soilMoisture,
      pumpOn: input.pumpOn,
      firmwareTimestampMs: input.firmwareTimestampMs ?? null,
      rssi: input.rssi ?? null,
      lastIp: input.lastIp ?? null,
      uptimeSeconds: input.uptimeSeconds ?? null,
      firmwareVersion: input.firmwareVersion ?? null,
      zones: input.zones
        ? {
            create: input.zones.map((zone) => ({
              zoneIndex: zone.zoneIndex,
              desiredState: zone.desiredState as any ?? null,
              appliedState: (zone.appliedState as any) ?? 'UNKNOWN',
              confirmedState: (zone.confirmedState as any) ?? 'UNAVAILABLE',
              servoAngle: zone.servoAngle ?? null,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      soilMoisture: true,
      pumpOn: true,
      firmwareTimestampMs: true,
      rssi: true,
      lastIp: true,
      uptimeSeconds: true,
      firmwareVersion: true,
      createdAt: true,
      zones: {
        select: {
          zoneIndex: true,
          desiredState: true,
          appliedState: true,
          confirmedState: true,
          servoAngle: true,
        },
      },
    },
  });

  if (input.zones) {
    const now = new Date();
    for (const zone of input.zones) {
      const updateData: any = {
        lastTelemetryAt: now,
        lastAppliedAngle: zone.servoAngle ?? null,
      };
      if (zone.appliedState) {
        updateData.appliedState = zone.appliedState;
      }
      await prisma.zone.updateMany({
        where: {
          deviceId: deviceInternalId,
          index: zone.zoneIndex,
        },
        data: updateData,
      });
    }
  }

  return telemetry;
}

export async function getLatestTelemetry(userId: string, deviceId: string) {
  const device = await getOwnedDevice(userId, deviceId);

  const telemetry = await prisma.deviceTelemetry.findFirst({
    where: { deviceId: device.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      soilMoisture: true,
      pumpOn: true,
      rssi: true,
      lastIp: true,
      uptimeSeconds: true,
      firmwareVersion: true,
      createdAt: true,
      zones: {
        select: {
          zoneIndex: true,
          desiredState: true,
          appliedState: true,
          servoAngle: true,
        },
      },
    },
  });

  return telemetry;
}
