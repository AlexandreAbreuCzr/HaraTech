import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOwnedDevice } from '../utils/deviceOwnership';
import { isHaraPortMapping } from '../utils/hardware';
import { bumpDeviceConfigVersion } from './config.service';

export interface ZoneActuatorInput {
  channel: number;
  openAngle?: number;
  closedAngle?: number;
  minPulseUs?: number;
  maxPulseUs?: number;
  inverted?: boolean;
}

export interface CreateZoneInput {
  name: string;
  index: number;
  moistureThreshold: number;
  isActive?: boolean;
  enabled?: boolean;
  actuator: ZoneActuatorInput;
}

export interface UpdateZoneInput {
  name?: string;
  index?: number;
  moistureThreshold?: number;
  isActive?: boolean;
  enabled?: boolean;
  actuator?: ZoneActuatorInput;
}

const zoneSelect = {
  id: true,
  name: true,
  index: true,
  moistureThreshold: true,
  isActive: true,
  enabled: true,
  desiredState: true,
  appliedState: true,
  confirmedState: true,
  lastAppliedAngle: true,
  lastTelemetryAt: true,
  createdAt: true,
  updatedAt: true,
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

async function ensureZoneIndexAvailable(
  deviceInternalId: string,
  index: number,
  ignoredZoneId?: string
) {
  const existing = await prisma.zone.findFirst({
    where: {
      deviceId: deviceInternalId,
      index,
      id: ignoredZoneId ? { not: ignoredZoneId } : undefined,
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('Ja existe uma area com esse indice neste dispositivo', 409);
  }
}

function uniqueConstraintTarget(error: unknown): string {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return '';
  }

  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(',') : String(target ?? '');
}

function isZoneIndexConflict(error: unknown): boolean {
  const target = uniqueConstraintTarget(error);
  return target.includes('deviceId') && target.includes('index');
}

function isActuatorChannelConflict(error: unknown): boolean {
  const target = uniqueConstraintTarget(error);
  return target.includes('driver') && target.includes('channel');
}

function rethrowZoneConstraint(error: unknown): never {
  if (isZoneIndexConflict(error)) {
    throw new AppError('Ja existe uma area com esse indice neste dispositivo', 409);
  }

  if (isActuatorChannelConflict(error)) {
    throw new AppError('Esta saida ja esta configurada em outra area', 409);
  }

  throw error;
}

function zoneStateFromInput(isActive?: boolean) {
  return isActive ? 'OPEN' : 'CLOSED';
}

async function createZoneWithIndex(
  deviceInternalId: string,
  input: CreateZoneInput,
  index: number
) {
  return prisma.$transaction(async (tx) => {
    const zone = await tx.zone.create({
      data: {
        name: input.name,
        index,
        moistureThreshold: input.moistureThreshold,
        isActive: input.isActive ?? false,
        desiredState: zoneStateFromInput(input.isActive),
        enabled: input.enabled ?? true,
        deviceId: deviceInternalId,
      },
      select: { id: true },
    });

    if (input.actuator) {
      await tx.zoneActuator.create({
        data: {
          deviceId: deviceInternalId,
          zoneId: zone.id,
          ...input.actuator,
        },
      });
    }

    await bumpDeviceConfigVersion(tx, deviceInternalId);

    return tx.zone.findUniqueOrThrow({
      where: { id: zone.id },
      select: zoneSelect,
    });
  });
}

export async function createZone(
  userId: string,
  deviceId: string,
  input: CreateZoneInput
) {
  const device = await getOwnedDevice(userId, deviceId);
  if (!isHaraPortMapping(input.index, input.actuator.channel)) {
    throw new AppError('Saida fisica invalida para o Hara Tech', 422);
  }
  await ensureZoneIndexAvailable(device.id, input.index);

  try {
    return await createZoneWithIndex(device.id, input, input.index);
  } catch (err) {
    return rethrowZoneConstraint(err);
  }
}

export async function listZones(userId: string, deviceId: string) {
  const device = await getOwnedDevice(userId, deviceId);

  return prisma.zone.findMany({
    where: { deviceId: device.id },
    select: zoneSelect,
    orderBy: { index: 'asc' },
  });
}

export async function updateZone(
  userId: string,
  deviceId: string,
  zoneId: string,
  input: UpdateZoneInput
) {
  const device = await getOwnedDevice(userId, deviceId);

  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, deviceId: device.id },
    select: {
      id: true,
      index: true,
      actuator: { select: { channel: true } },
    },
  });

  if (!zone) {
    throw new AppError('Area nao encontrada neste dispositivo', 404);
  }

  if (input.index !== undefined) {
    await ensureZoneIndexAvailable(device.id, input.index, zoneId);
  }

  const { actuator, isActive, ...zoneChanges } = input;
  if (input.index !== undefined || actuator !== undefined) {
    const nextIndex = input.index ?? zone.index;
    const nextChannel = actuator?.channel ?? zone.actuator?.channel;
    if (nextChannel !== undefined && !isHaraPortMapping(nextIndex, nextChannel)) {
      throw new AppError('Saida fisica invalida para o Hara Tech', 422);
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.zone.update({
        where: { id: zoneId },
        data: {
          ...zoneChanges,
          ...(isActive === undefined
            ? {}
            : {
                isActive,
                desiredState: zoneStateFromInput(isActive),
              }),
        },
      });

      if (actuator) {
        await tx.zoneActuator.upsert({
          where: { zoneId },
          update: actuator,
          create: {
            deviceId: device.id,
            zoneId,
            ...actuator,
          },
        });
      }

      await bumpDeviceConfigVersion(tx, device.id);

      return tx.zone.findUniqueOrThrow({
        where: { id: zoneId },
        select: zoneSelect,
      });
    });
  } catch (err) {
    return rethrowZoneConstraint(err);
  }
}

export async function deleteZone(userId: string, deviceId: string, zoneId: string) {
  const device = await getOwnedDevice(userId, deviceId);

  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, deviceId: device.id },
    select: { id: true },
  });

  if (!zone) {
    throw new AppError('Area nao encontrada neste dispositivo', 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.zone.delete({ where: { id: zoneId } });
    await bumpDeviceConfigVersion(tx, device.id);
  });
}
