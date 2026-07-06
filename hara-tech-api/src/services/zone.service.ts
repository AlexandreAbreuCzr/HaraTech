import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export interface CreateZoneInput {
  name: string;
  index?: number;
  isActive?: boolean;
}

export interface UpdateZoneInput {
  name?: string;
  index?: number;
  isActive?: boolean;
}

async function getOwnedDevice(userId: string, deviceId: string) {
  const normalizedDeviceId = deviceId.trim().toUpperCase();

  const device = await prisma.device.findFirst({
    where: {
      deviceId: normalizedDeviceId,
      ownerId: userId,
    },
    select: {
      id: true,
      deviceId: true,
    },
  });

  if (!device) {
    throw new AppError('Dispositivo nao encontrado para este usuario', 404);
  }

  return device;
}

async function getNextZoneIndex(deviceInternalId: string) {
  const result = await prisma.zone.aggregate({
    where: { deviceId: deviceInternalId },
    _max: { index: true },
  });

  return (result._max.index ?? -1) + 1;
}

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

function isZoneIndexConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('deviceId') &&
    error.meta.target.includes('index')
  );
}

function zoneIndexConflictError(): AppError {
  return new AppError('Ja existe uma area com esse indice neste dispositivo', 409);
}

async function createZoneWithIndex(
  deviceInternalId: string,
  input: CreateZoneInput,
  index: number
) {
  return prisma.zone.create({
    data: {
      name: input.name,
      index,
      isActive: input.isActive ?? false,
      deviceId: deviceInternalId,
    },
    select: {
      id: true,
      name: true,
      index: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createZone(
  userId: string,
  deviceId: string,
  input: CreateZoneInput
) {
  const device = await getOwnedDevice(userId, deviceId);

  if (input.index !== undefined) {
    await ensureZoneIndexAvailable(device.id, input.index);

    try {
      return await createZoneWithIndex(device.id, input, input.index);
    } catch (err) {
      if (isZoneIndexConflict(err)) {
        throw zoneIndexConflictError();
      }

      throw err;
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const nextIndex = await getNextZoneIndex(device.id);

    try {
      return await createZoneWithIndex(device.id, input, nextIndex);
    } catch (err) {
      if (!isZoneIndexConflict(err)) {
        throw err;
      }
    }
  }

  throw new AppError('Nao foi possivel gerar um indice livre para a area', 409);
}

export async function listZones(userId: string, deviceId: string) {
  const device = await getOwnedDevice(userId, deviceId);

  return prisma.zone.findMany({
    where: { deviceId: device.id },
    select: {
      id: true,
      name: true,
      index: true,
      isActive: true,
      createdAt: true,
    },
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
    where: {
      id: zoneId,
      deviceId: device.id,
    },
    select: { id: true },
  });

  if (!zone) {
    throw new AppError('Area nao encontrada neste dispositivo', 404);
  }

  if (input.index !== undefined) {
    await ensureZoneIndexAvailable(device.id, input.index, zoneId);
  }

  try {
    return await prisma.zone.update({
      where: { id: zoneId },
      data: input,
      select: {
        id: true,
        name: true,
        index: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (err) {
    if (isZoneIndexConflict(err)) {
      throw zoneIndexConflictError();
    }

    throw err;
  }
}

export async function deleteZone(userId: string, deviceId: string, zoneId: string) {
  const device = await getOwnedDevice(userId, deviceId);

  const zone = await prisma.zone.findFirst({
    where: {
      id: zoneId,
      deviceId: device.id,
    },
    select: { id: true },
  });

  if (!zone) {
    throw new AppError('Area nao encontrada neste dispositivo', 404);
  }

  await prisma.zone.delete({
    where: { id: zoneId },
  });
}
