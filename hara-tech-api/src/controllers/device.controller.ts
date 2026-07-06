import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerDevice,
  linkDevice,
  getUserDevices,
  updateHeartbeat,
} from '../services/device.service';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { DeviceAuthenticatedRequest } from '../middlewares/deviceAuth';

const registerDeviceSchema = z.object({
  chipId: z.string().trim().min(1, 'chipId obrigatorio').max(64),
  rotateToken: z.boolean().optional(),
});

const linkDeviceSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z.string().regex(/^HT-[A-Z0-9]{6}$/, 'Formato de deviceId invalido')
    ),
});

const heartbeatSchema = z.object({
  ip: z.string().ip('IP invalido').optional(),
  rssi: z.number().int('RSSI deve ser inteiro').optional(),
});

export async function registerDeviceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { chipId, rotateToken } = registerDeviceSchema.parse(req.body);
    const result = await registerDevice(chipId, { rotateToken });

    // The current ESP32 sketch expects HTTP 200, including first registration.
    res.status(200).json({
      deviceId: result.deviceId,
      deviceToken: result.deviceToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function linkDeviceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = linkDeviceSchema.parse(req.body);
    const device = await linkDevice(req.user!.userId, deviceId);
    res.json(device);
  } catch (err) {
    next(err);
  }
}

export async function getUserDevicesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const devices = await getUserDevices(req.user!.userId);
    res.json({ devices, total: devices.length });
  } catch (err) {
    next(err);
  }
}

export async function heartbeatHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const input = heartbeatSchema.parse(req.body);
    const result = await updateHeartbeat(req.device!.id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
