import { prisma } from '../lib/prisma';
import { AppError } from './AppError';

export async function getOwnedDevice(userId: string, deviceId: string) {
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
