import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getOwnedDevice } from '../utils/deviceOwnership';

function getZoneIndex(payload: Prisma.JsonValue | null): number | null {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return null;
  }

  const zoneIndex = payload.zoneIndex;
  return typeof zoneIndex === 'number' && Number.isInteger(zoneIndex)
    ? zoneIndex
    : null;
}

/** Records the lifecycle of a zone command once the ESP32 confirms it. */
export async function recordIrrigationCommand(
  client: Prisma.TransactionClient,
  deviceInternalId: string,
  type: 'OPEN_ZONE' | 'CLOSE_ZONE',
  payload: Prisma.JsonValue | null
) {
  const zoneIndex = getZoneIndex(payload);
  if (zoneIndex === null) {
    return;
  }

  const zone = await client.zone.findFirst({
    where: { deviceId: deviceInternalId, index: zoneIndex },
    select: { id: true },
  });

  if (!zone) {
    return;
  }

  const now = new Date();

  if (type === 'OPEN_ZONE') {
    const activeLog = await client.irrigationLog.findFirst({
      where: { deviceId: deviceInternalId, zoneId: zone.id, endedAt: null },
      select: { id: true },
    });

    if (activeLog) {
      return;
    }

    await client.irrigationLog.create({
      data: {
        deviceId: deviceInternalId,
        zoneId: zone.id,
        startedAt: now,
        triggeredBy: 'MANUAL',
      },
    });
    return;
  }

  const activeLog = await client.irrigationLog.findFirst({
    where: { deviceId: deviceInternalId, zoneId: zone.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { id: true, startedAt: true },
  });

  if (!activeLog) {
    return;
  }

  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - activeLog.startedAt.getTime()) / 1000)
  );

  await client.irrigationLog.update({
    where: { id: activeLog.id },
    data: { endedAt: now, durationSeconds },
  });
}

export async function listIrrigationLogs(userId: string, limit = 100) {
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  return prisma.irrigationLog.findMany({
    where: { device: { ownerId: userId } },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      triggeredBy: true,
      createdAt: true,
      device: { select: { deviceId: true } },
      zone: { select: { index: true, name: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: safeLimit,
  });
}

export async function listDeviceIrrigationLogs(
  userId: string,
  deviceId: string,
  limit = 100
) {
  const device = await getOwnedDevice(userId, deviceId);
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  return prisma.irrigationLog.findMany({
    where: { deviceId: device.id },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      triggeredBy: true,
      createdAt: true,
      device: { select: { deviceId: true } },
      zone: { select: { index: true, name: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: safeLimit,
  });
}
