import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { DeviceAuthenticatedRequest } from '../middlewares/deviceAuth';
import { getDeviceConfig } from '../services/config.service';
import { sendSuccess } from '../utils/response';

const configQuerySchema = z.object({
  configVersion: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(0).optional()),
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
