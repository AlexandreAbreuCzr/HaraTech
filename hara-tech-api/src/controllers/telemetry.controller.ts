import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { DeviceAuthenticatedRequest } from '../middlewares/deviceAuth';
import { processTelemetry, getLatestTelemetry } from '../services/telemetry.service';

const telemetryZoneSchema = z.object({
  zoneIndex: z.number().int().min(0).max(255),
  desiredState: z.enum(['OPEN', 'CLOSED']).optional(),
  appliedState: z.enum(['OPEN', 'CLOSED', 'UNKNOWN']).optional(),
  confirmedState: z.enum(['OPEN', 'CLOSED', 'UNKNOWN', 'UNAVAILABLE']).optional(),
  servoAngle: z.number().int().min(0).max(180).optional(),
});

const telemetrySchema = z.object({
  soilMoisture: z.number().int().min(0).max(100),
  pumpOn: z.boolean(),
  firmwareTimestampMs: z.number().int().positive().optional(),
  rssi: z.number().int().max(0).optional(),
  lastIp: z.string().ip().optional(),
  uptimeSeconds: z.number().int().positive().optional(),
  firmwareVersion: z.string().max(32).optional(),
  zones: z.array(telemetryZoneSchema).max(255).optional(),
});

export async function telemetryHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const input = telemetrySchema.parse(req.body);
    const result = await processTelemetry(req.device!.id, input);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLatestTelemetryHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const telemetry = await getLatestTelemetry(req.device!.id);
    res.json(telemetry);
  } catch (err) {
    next(err);
  }
}
