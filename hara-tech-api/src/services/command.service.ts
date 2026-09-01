import type { CommandType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOwnedDevice } from '../utils/deviceOwnership';
import { isHaraPortMapping } from '../utils/hardware';
import { bumpDeviceConfigVersion } from './config.service';
import { recordIrrigationCommand } from './irrigation.service';

const COMMAND_BATCH_SIZE = 10;
const DEFAULT_COMMAND_RETRY_SECONDS = 120;
const configuredCommandRetrySeconds = Number(
  process.env.COMMAND_RETRY_SECONDS ?? DEFAULT_COMMAND_RETRY_SECONDS
);
const COMMAND_RETRY_MS =
  Number.isFinite(configuredCommandRetrySeconds) &&
  configuredCommandRetrySeconds > 0
    ? configuredCommandRetrySeconds * 1000
    : DEFAULT_COMMAND_RETRY_SECONDS * 1000;

const commandResponseSelect = {
  id: true,
  type: true,
  status: true,
  createdAt: true,
  sentAt: true,
  ackedAt: true,
  failedAt: true,
  failReason: true,
} satisfies Prisma.CommandSelect;

export interface CreateCommandInput {
  type: CommandType;
  payload?: Record<string, unknown>;
}

function getZoneIndex(payload?: Record<string, unknown>): number {
  const zoneIndex = payload?.zoneIndex;
  if (!Number.isInteger(zoneIndex) || (zoneIndex as number) < 0 || (zoneIndex as number) > 2) {
    throw new AppError('zoneIndex valido e obrigatorio para este comando', 422);
  }

  return zoneIndex as number;
}

export async function createCommand(
  userId: string,
  deviceId: string,
  input: CreateCommandInput
) {
  const device = await getOwnedDevice(userId, deviceId);

  return prisma.$transaction(async (tx) => {
    if (
      input.type === 'OPEN_ZONE' ||
      input.type === 'CLOSE_ZONE' ||
      input.type === 'TEST_ZONE'
    ) {
      const zoneIndex = getZoneIndex(input.payload);
      const zone = await tx.zone.findFirst({
        where: { deviceId: device.id, index: zoneIndex },
        select: { id: true, index: true, actuator: { select: { id: true, channel: true } } },
      });

      if (!zone) {
        throw new AppError('Area nao encontrada neste dispositivo', 404);
      }

      if (!zone.actuator) {
        throw new AppError('Configure o atuador da area antes de controla-la', 409);
      }

      if (!isHaraPortMapping(zone.index, zone.actuator.channel)) {
        throw new AppError('A area nao corresponde a uma saida fisica valida', 409);
      }

      if (input.type !== 'TEST_ZONE') {
        const isOpening = input.type === 'OPEN_ZONE';
        await tx.zone.update({
          where: { id: zone.id },
          data: {
            desiredState: isOpening ? 'OPEN' : 'CLOSED',
            isActive: isOpening,
          },
        });
        await bumpDeviceConfigVersion(tx, device.id);
      }
    }

    if (input.type === 'PUMP_ON' || input.type === 'PUMP_OFF') {
      await tx.deviceConfig.upsert({
        where: { deviceId: device.id },
        update: {
          pumpMode: input.type === 'PUMP_ON' ? 'FORCED_ON' : 'FORCED_OFF',
          configVersion: { increment: 1 },
        },
        create: {
          deviceId: device.id,
          pumpMode: input.type === 'PUMP_ON' ? 'FORCED_ON' : 'FORCED_OFF',
        },
      });
    }

    return tx.command.create({
      data: {
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue ?? Prisma.JsonNull,
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
  });
}

export async function getPendingCommands(deviceInternalId: string) {
  const retryBefore = new Date(Date.now() - COMMAND_RETRY_MS);

  return prisma.$transaction(async (tx) => {
    const commands = await tx.command.findMany({
      where: {
        deviceId: deviceInternalId,
        OR: [
          { status: 'PENDING' },
          {
            status: 'SENT',
            OR: [{ sentAt: { lte: retryBefore } }, { sentAt: null }],
          },
        ],
      },
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: COMMAND_BATCH_SIZE,
    });

    if (commands.length > 0) {
      await tx.command.updateMany({
        where: {
          id: { in: commands.map((command) => command.id) },
          status: { in: ['PENDING', 'SENT'] },
        },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }

    return commands;
  });
}

export async function acknowledgeCommand(
  deviceInternalId: string,
  commandId: string,
  success: boolean,
  failReason?: string
) {
  return prisma.$transaction(async (tx) => {
    const command = await tx.command.findFirst({
      where: { id: commandId, deviceId: deviceInternalId },
      select: { ...commandResponseSelect, payload: true },
    });

    if (!command) {
      throw new AppError('Comando nao encontrado neste dispositivo', 404);
    }

    const { payload, ...commandResponse } = command;

    if (
      (success && command.status === 'ACKED') ||
      (!success && command.status === 'FAILED')
    ) {
      return commandResponse;
    }

    if (command.status !== 'SENT') {
      throw new AppError('Comando nao esta em estado SENT', 409);
    }

    const updated = await tx.command.update({
      where: { id: commandId },
      data: success
        ? { status: 'ACKED', ackedAt: new Date() }
        : { status: 'FAILED', failedAt: new Date(), failReason: failReason ?? null },
      select: commandResponseSelect,
    });

    if (
      success &&
      (command.type === 'OPEN_ZONE' || command.type === 'CLOSE_ZONE')
    ) {
      await recordIrrigationCommand(
        tx,
        deviceInternalId,
        command.type,
        payload
      );
    }

    return updated;
  });
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
