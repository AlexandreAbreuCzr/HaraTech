import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authenticate';
import {
  createZone,
  listZones,
  updateZone,
  deleteZone,
} from '../services/zone.service';

const deviceIdParamSchema = z.object({
  deviceId: z.string().trim().transform((value) => value.toUpperCase()),
});

const zoneIdParamSchema = deviceIdParamSchema.extend({
  zoneId: z.string().uuid('zoneId invalido'),
});

const createZoneSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
  index: z.number().int().min(0).max(255).optional(),
  isActive: z.boolean().optional(),
});

const updateZoneSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    index: z.number().int().min(0).max(255).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export async function createZoneHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);
    const input = createZoneSchema.parse(req.body);
    const zone = await createZone(req.user!.userId, deviceId, input);

    res.status(201).json(zone);
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

    res.json({ zones, total: zones.length });
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

    res.json(zone);
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

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
