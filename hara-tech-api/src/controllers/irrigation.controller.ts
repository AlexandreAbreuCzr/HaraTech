import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import {
  listDeviceIrrigationLogs,
  listIrrigationLogs,
} from '../services/irrigation.service';
import { sendSuccess } from '../utils/response';

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((value) => value.toUpperCase()),
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function getIrrigationLogsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { limit } = paginationQuerySchema.parse(req.query);
    const logs = await listIrrigationLogs(req.user!.userId, limit);
    sendSuccess(res, { logs, total: logs.length });
  } catch (err) {
    next(err);
  }
}

export async function getDeviceIrrigationLogsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const { limit } = paginationQuerySchema.parse(req.query);
    const logs = await listDeviceIrrigationLogs(req.user!.userId, deviceId, limit);
    sendSuccess(res, { logs, total: logs.length });
  } catch (err) {
    next(err);
  }
}
