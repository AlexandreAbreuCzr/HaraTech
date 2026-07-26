import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { DeviceAuthenticatedRequest } from '../middlewares/deviceAuth';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { getDeviceConfig, getUserDeviceConfig } from '../services/config.service';
import { sendSuccess } from '../utils/response';

const configQuerySchema = z.object({
  configVersion: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().min(0).optional()),
});

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((value) => value.toUpperCase()),
});

export async function getDeviceConfigHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = configQuerySchema.parse(req.query);
    const config = await getDeviceConfig(req.device!.id, query.configVersion);

    if (!config) {
      res.status(304).end();
      return;
    }

    sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
}

export async function getUserDeviceConfigHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const config = await getUserDeviceConfig(req.user!.userId, deviceId);
    sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
}
