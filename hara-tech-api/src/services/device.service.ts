import { prisma } from '../lib/prisma';
import { generateUniqueDeviceId } from '../utils/deviceId';
import { generateDeviceToken, hashDeviceToken } from '../utils/deviceAuth';
import { AppError } from '../utils/AppError';

const DEFAULT_ONLINE_WINDOW_SECONDS = 120;
const configuredOnlineWindowSeconds = Number(
  process.env.DEVICE_ONLINE_WINDOW_SECONDS ?? DEFAULT_ONLINE_WINDOW_SECONDS
);
const ONLINE_WINDOW_SECONDS =
  Number.isFinite(configuredOnlineWindowSeconds) &&
  configuredOnlineWindowSeconds > 0
    ? configuredOnlineWindowSeconds
    : DEFAULT_ONLINE_WINDOW_SECONDS;
const ONLINE_WINDOW_MS = ONLINE_WINDOW_SECONDS * 1000;

type DeviceRecord = {
  id: string;
  deviceId: string;
  chipId: string;
  name: string | null;
  isLinked: boolean;
  lastSeen: Date | null;
  lastIp: string | null;
  lastRssi: number | null;
  createdAt: Date;
};

const deviceSelect = {
  id: true,
  deviceId: true,
  chipId: true,
  name: true,
  isLinked: true,
  lastSeen: true,
  lastIp: true,
  lastRssi: true,
  createdAt: true,
};

function isDeviceOnline(lastSeen: Date | null): boolean {
  return lastSeen ? Date.now() - lastSeen.getTime() <= ONLINE_WINDOW_MS : false;
}

function toDeviceResponse(device: DeviceRecord) {
  return {
    id: device.id,
    deviceId: device.deviceId,
    chipId: device.chipId,
    name: device.name,
    isLinked: device.isLinked,
    lastSeen: device.lastSeen,
    lastIp: device.lastIp,
    lastRssi: device.lastRssi,
    createdAt: device.createdAt,
    isOnline: isDeviceOnline(device.lastSeen),
  };
}

function buildDeviceToken() {
  const token = generateDeviceToken();

  return {
    token,
    tokenHash: hashDeviceToken(token),
  };
}

export interface RegisterDeviceOptions {
  rotateToken?: boolean;
}

export async function registerDevice(
  chipId: string,
  options: RegisterDeviceOptions = {}
) {
  const normalizedChipId = chipId.trim();

  const existing = await prisma.device.findUnique({
    where: { chipId: normalizedChipId },
    select: {
      id: true,
      deviceId: true,
      deviceTokenHash: true,
    },
  });

  if (existing) {
    if (options.rotateToken || !existing.deviceTokenHash) {
      const { token, tokenHash } = buildDeviceToken();

      await prisma.device.update({
        where: { id: existing.id },
        data: { deviceTokenHash: tokenHash },
      });

      return {
        deviceId: existing.deviceId,
        deviceToken: token,
        isNew: false,
      };
    }

    return { deviceId: existing.deviceId, isNew: false };
  }

  const deviceId = await generateUniqueDeviceId();
  const { token, tokenHash } = buildDeviceToken();

  const device = await prisma.device.create({
    data: {
      chipId: normalizedChipId,
      deviceId,
      deviceTokenHash: tokenHash,
    },
    select: { deviceId: true },
  });

  return {
    deviceId: device.deviceId,
    deviceToken: token,
    isNew: true,
  };
}

export async function linkDevice(userId: string, deviceId: string) {
  const normalizedDeviceId = deviceId.trim().toUpperCase();

  const device = await prisma.device.findUnique({
    where: { deviceId: normalizedDeviceId },
  });

  if (!device) {
    throw new AppError('Dispositivo nao encontrado', 404);
  }

  if (device.isLinked && device.ownerId && device.ownerId !== userId) {
    throw new AppError('Dispositivo ja vinculado a outro usuario', 409);
  }

  if (device.ownerId === userId) {
    return toDeviceResponse(device);
  }

  const linkedDevice = await prisma.device.update({
    where: { deviceId: normalizedDeviceId },
    data: { isLinked: true, ownerId: userId },
    select: deviceSelect,
  });

  return toDeviceResponse(linkedDevice);
}

export async function getUserDevices(userId: string) {
  const devices = await prisma.device.findMany({
    where: { ownerId: userId },
    select: deviceSelect,
    orderBy: { createdAt: 'desc' },
  });

  return devices.map(toDeviceResponse);
}

export interface HeartbeatInput {
  ip?: string;
  rssi?: number;
}

export async function updateHeartbeat(
  deviceInternalId: string,
  input: HeartbeatInput
) {
  const updatedDevice = await prisma.device.update({
    where: { id: deviceInternalId },
    data: {
      lastSeen: new Date(),
      lastIp: input.ip,
      lastRssi: input.rssi,
    },
    select: {
      deviceId: true,
      lastSeen: true,
      lastIp: true,
      lastRssi: true,
    },
  });

  return {
    ...updatedDevice,
    isOnline: isDeviceOnline(updatedDevice.lastSeen),
  };
}
