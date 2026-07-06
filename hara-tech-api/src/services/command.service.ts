import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export interface CreateCommandInput {
  type: string;
  payload?: Record<string, unknown>;
}

async function getOwnedDevice(userId: string, deviceId: string) {
  const normalizedDeviceId = deviceId.trim().toUpperCase();

  const device = await prisma.device.findFirst({
    where: {
      deviceId: normalizedDeviceId,
      ownerId: userId,
    },
    select: { id: true, deviceId: true },
  });

  if (!device) {
    throw new AppError('Dispositivo nao encontrado para este usuario', 404);
  }

  return device;
}

export async function createCommand(
  userId: string,
  deviceId: string,
  input: CreateCommandInput
) {
  const device = await getOwnedDevice(userId, deviceId);

  const command = await prisma.command.create({
    data: {
      type: input.type as any,
      payload: (input.payload as Prisma.InputJsonValue) ?? undefined,
      deviceId: device.id,
    },
    select: {
      id: true,
      type: true,
      payload: true,
      status: true,
      createdAt: true,
    },
  });

  return command;
}

export async function getPendingCommands(deviceInternalId: string) {
  const commands = await prisma.command.findMany({
    where: {
      deviceId: deviceInternalId,
      status: 'PENDING',
    },
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  if (commands.length > 0) {
    const commandIds = commands.map((c) => c.id);

    await prisma.command.updateMany({
      where: { id: { in: commandIds } },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  return commands;
}

export async function acknowledgeCommand(
  deviceInternalId: string,
  commandId: string,
  success: boolean,
  failReason?: string
) {
  const command = await prisma.command.findFirst({
    where: {
      id: commandId,
      deviceId: deviceInternalId,
    },
    select: { id: true, status: true },
  });

  if (!command) {
    throw new AppError('Comando nao encontrado neste dispositivo', 404);
  }

  if (command.status !== 'SENT') {
    throw new AppError('Comando nao esta em estado SENT', 409);
  }

  const updated = await prisma.command.update({
    where: { id: commandId },
    data: success
      ? { status: 'ACKED', ackedAt: new Date() }
      : { status: 'FAILED', failedAt: new Date(), failReason: failReason ?? null },
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      sentAt: true,
      ackedAt: true,
      failedAt: true,
      failReason: true,
    },
  });

  return updated;
}

export async function getDeviceCommands(
  userId: string,
  deviceId: string,
  limit = 50
) {
  const device = await getOwnedDevice(userId, deviceId);

  return prisma.command.findMany({
    where: { deviceId: device.id },
    select: {
      id: true,
      type: true,
      payload: true,
      status: true,
      createdAt: true,
      sentAt: true,
      ackedAt: true,
      failedAt: true,
      failReason: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
