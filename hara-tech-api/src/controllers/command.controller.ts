import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import { DeviceAuthenticatedRequest } from '../middlewares/deviceAuth';
import {
  createCommand,
  getPendingCommands,
  acknowledgeCommand,
  getDeviceCommands,
} from '../services/command.service';

const createCommandSchema = z.object({
  type: z.enum([
    'OPEN_ZONE',
    'CLOSE_ZONE',
    'PUMP_ON',
    'PUMP_OFF',
    'SYNC_CONFIG',
    'RESTART',
    'OTA_UPDATE',
  ]),
  payload: z.record(z.unknown()).optional(),
});

const ackCommandSchema = z.object({
  success: z.boolean(),
  failReason: z.string().max(256).optional(),
});

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((v) => v.toUpperCase()),
});

const commandIdParamSchema = deviceIdParamSchema.extend({
  commandId: z.string().uuid('commandId invalido'),
});

export async function createCommandHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const input = createCommandSchema.parse(req.body);
    const command = await createCommand(req.user!.userId, deviceId, input);

    res.status(201).json(command);
  } catch (err) {
    next(err);
  }
}

export async function getDeviceCommandsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const commands = await getDeviceCommands(req.user!.userId, deviceId);

    res.json({ commands, total: commands.length });
  } catch (err) {
    next(err);
  }
}

export async function getPendingCommandsHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const commands = await getPendingCommands(req.device!.id);

    res.json({ commands, total: commands.length });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgeCommandHandler(
  req: DeviceAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { commandId } = commandIdParamSchema.parse({
      ...req.params,
      commandId: req.params.commandId,
    });
    const input = ackCommandSchema.parse(req.body);
    const result = await acknowledgeCommand(
      req.device!.id,
      commandId,
      input.success,
      input.failReason
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}
