import {
  Prisma,
  ZoneAppliedState,
  ZoneConfirmedState,
  ZoneDesiredState,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOwnedDevice } from '../utils/deviceOwnership';

export interface TelemetryZoneInput {
  zoneIndex: number;
  desiredState?: ZoneDesiredState;
  appliedState?: ZoneAppliedState;
  confirmedState?: ZoneConfirmedState;
  servoAngle?: number;
  soilMoisture?: number;
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

  const zones = input.zones ?? [];
  const configuredZones = zones.length
    ? await prisma.zone.findMany({
        where: {
          deviceId: deviceInternalId,
          index: { in: zones.map((zone) => zone.zoneIndex) },
        },
        select: {
          id: true,
          index: true,
          irrigationLogs: {
            where: { endedAt: null },
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: { id: true, startedAt: true },
          },
        },
      })
    : [];
  const zoneByIndex = new Map(configuredZones.map((zone) => [zone.index, zone]));
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const telemetry = await tx.deviceTelemetry.create({
      data: {
        deviceId: deviceInternalId,
        soilMoisture: input.soilMoisture,
        pumpOn: input.pumpOn,
        firmwareTimestampMs: input.firmwareTimestampMs ?? null,
        rssi: input.rssi ?? null,
        lastIp: input.lastIp ?? null,
        uptimeSeconds: input.uptimeSeconds ?? null,
        firmwareVersion: input.firmwareVersion ?? null,
        zones: zones.length
          ? {
              create: zones.map((zone) => ({
                zoneIndex: zone.zoneIndex,
                desiredState: zone.desiredState ?? null,
                appliedState: zone.appliedState ?? 'UNKNOWN',
                confirmedState: zone.confirmedState ?? 'UNAVAILABLE',
                servoAngle: zone.servoAngle ?? null,
                soilMoisture: zone.soilMoisture ?? null,
                ...(zoneByIndex.has(zone.zoneIndex)
                  ? { zone: { connect: { id: zoneByIndex.get(zone.zoneIndex)!.id } } }
                  : {}),
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
            soilMoisture: true,
          },
        },
      },
    });

    const deviceUpdate: Prisma.DeviceUpdateInput = { lastSeen: now };
    if (input.rssi !== undefined) deviceUpdate.lastRssi = input.rssi;
    if (input.lastIp !== undefined) deviceUpdate.lastIp = input.lastIp;
    await tx.device.update({ where: { id: deviceInternalId }, data: deviceUpdate });

    for (const zone of zones) {
      const updateData: Prisma.ZoneUpdateManyMutationInput = {
        lastTelemetryAt: now,
      };
      if (zone.servoAngle !== undefined) updateData.lastAppliedAngle = zone.servoAngle;
      if (zone.desiredState !== undefined) updateData.desiredState = zone.desiredState;
      if (zone.appliedState !== undefined) {
        updateData.appliedState = zone.appliedState;
        updateData.isActive = zone.appliedState === 'OPEN';
      }
      if (zone.confirmedState !== undefined) {
        updateData.confirmedState = zone.confirmedState;
      } else if (zone.appliedState !== undefined) {
        updateData.confirmedState =
          zone.appliedState === 'UNKNOWN' ? 'UNKNOWN' : zone.appliedState;
      }
      await tx.zone.updateMany({
        where: { deviceId: deviceInternalId, index: zone.zoneIndex },
        data: updateData,
      });

      // A posicao fisica informada pelo ESP32 e a fonte de verdade. Assim, uma
      // confirmacao HTTP perdida nao deixa a interface contando uma rega encerrada.
      if (zone.appliedState === 'CLOSED') {
        const activeLog = zoneByIndex.get(zone.zoneIndex)?.irrigationLogs[0];
        if (activeLog) {
          const durationSeconds = Math.max(
            0,
            Math.round((now.getTime() - activeLog.startedAt.getTime()) / 1000)
          );
          await tx.irrigationLog.update({
            where: { id: activeLog.id },
            data: { endedAt: now, durationSeconds },
          });
        }
      }
    }

    return telemetry;
  });
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
          soilMoisture: true,
        },
      },
    },
  });

  return telemetry;
}
