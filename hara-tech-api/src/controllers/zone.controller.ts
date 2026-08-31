import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import {
  createZone,
  listZones,
  updateZone,
  deleteZone,
} from '../services/zone.service';
import { sendSuccess, sendSuccessNoContent } from '../utils/response';
import {
  HARA_PORT_MAPPING_MESSAGE,
  HARA_SERVO_GPIO_MESSAGE,
  isHaraPortMapping,
  isHaraServoGpio,
} from '../utils/hardware';

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((value) => value.toUpperCase()),
});

const zoneIdParamSchema = deviceIdParamSchema.extend({
  zoneId: z.string().uuid('zoneId invalido'),
});

const actuatorSchema = z.object({
  channel: z.number().int().refine(isHaraServoGpio, {
    message: HARA_SERVO_GPIO_MESSAGE,
  }),
  openAngle: z.number().int().min(0).max(180).optional(),
  closedAngle: z.number().int().min(0).max(180).optional(),
  minPulseUs: z.number().int().min(400).max(3000).optional(),
  maxPulseUs: z.number().int().min(400).max(3000).optional(),
  inverted: z.boolean().optional(),
}).refine(
  (actuator) =>
    actuator.minPulseUs === undefined ||
    actuator.maxPulseUs === undefined ||
    actuator.minPulseUs < actuator.maxPulseUs,
  { message: 'minPulseUs deve ser menor que maxPulseUs' }
).refine(
  (actuator) =>
    actuator.openAngle === undefined ||
    actuator.closedAngle === undefined ||
    actuator.openAngle !== actuator.closedAngle,
  { message: 'openAngle e closedAngle devem ser diferentes' }
);

const createZoneSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  index: z.number().int().min(0).max(2),
  isActive: z.boolean().optional(),
  enabled: z.boolean().optional(),
  actuator: actuatorSchema,
}).refine(
  (data) => isHaraPortMapping(data.index, data.actuator.channel),
  { message: HARA_PORT_MAPPING_MESSAGE }
);

const updateZoneSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    index: z.number().int().min(0).max(2).optional(),
    isActive: z.boolean().optional(),
    enabled: z.boolean().optional(),
    actuator: actuatorSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })
  .refine(
    (data) =>
      data.index === undefined ||
      data.actuator === undefined ||
      isHaraPortMapping(data.index, data.actuator.channel),
    { message: HARA_PORT_MAPPING_MESSAGE }
  );

export async function createZoneHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const input = createZoneSchema.parse(req.body);
    const zone = await createZone(req.user!.userId, deviceId, input);

    sendSuccess(res, zone, 'Area criada com sucesso', 201);
  } catch (err) {
    next(err);
  }
}

export async function listZonesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const zones = await listZones(req.user!.userId, deviceId);

    sendSuccess(res, { zones, total: zones.length });
  } catch (err) {
    next(err);
  }
}

export async function updateZoneHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId, zoneId } = zoneIdParamSchema.parse(req.params);
    const input = updateZoneSchema.parse(req.body);
    const zone = await updateZone(req.user!.userId, deviceId, zoneId, input);

    sendSuccess(res, zone, 'Area atualizada com sucesso');
  } catch (err) {
    next(err);
  }
}

export async function deleteZoneHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId, zoneId } = zoneIdParamSchema.parse(req.params);
    await deleteZone(req.user!.userId, deviceId, zoneId);

    sendSuccessNoContent(res);
  } catch (err) {
    next(err);
  }
}
