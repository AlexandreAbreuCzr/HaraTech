import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { getUserDeviceConfig } from '../services/config.service';
import { getDeviceCommands } from '../services/command.service';
import { listDeviceIrrigationLogs } from '../services/irrigation.service';
import { getLatestTelemetry } from '../services/telemetry.service';
import { listZones } from '../services/zone.service';
import { sendSuccess } from '../utils/response';

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((value) => value.toUpperCase()),
});

/** Returns the complete device screen in one HTTP request. */
export async function getDeviceStatusHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const [zones, config, commands, telemetry, irrigationLogs] = await Promise.all([
      listZones(userId, deviceId),
      getUserDeviceConfig(userId, deviceId),
      getDeviceCommands(userId, deviceId),
      getLatestTelemetry(userId, deviceId),
      listDeviceIrrigationLogs(userId, deviceId, 200),
    ]);

    sendSuccess(res, { zones, config, commands, telemetry, irrigationLogs });
  } catch (err) {
    next(err);
  }
}
