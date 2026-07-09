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
import { sendSuccess } from '../utils/response';

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

    sendSuccess(res, command, 'Comando criado com sucesso', 201);
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

    sendSuccess(res, { commands, total: commands.length });
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

    sendSuccess(res, { commands, total: commands.length });
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

    sendSuccess(res, result, 'Comando confirmado com sucesso');
  } catch (err) {
    next(err);
  }
}
