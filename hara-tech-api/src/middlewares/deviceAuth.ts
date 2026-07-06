import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { hashDeviceToken, secureCompare } from '../utils/deviceAuth';

export interface DeviceAuthenticatedRequest extends Request {
  device?: {
    id: string;
    deviceId: string;
    chipId: string;
  };
}

function readHeader(req: Request, names: string[]): string | undefined {
  for (const name of names) {
    const value = req.header(name)?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function readAuthorizationScheme(
  req: Request,
  expectedScheme: string
): string | undefined {
  const authorization = req.header('authorization')?.trim();

  if (!authorization) {
    return undefined;
  }

  const [scheme, ...credentialParts] = authorization.split(' ');

  if (scheme.toLowerCase() !== expectedScheme.toLowerCase()) {
    return undefined;
  }

  const credential = credentialParts.join(' ').trim();
  return credential || undefined;
}

function secretsMatch(provided: string, expected: string): boolean {
  return secureCompare(hashDeviceToken(provided), hashDeviceToken(expected));
}

export function authenticateDeviceProvisioning(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const expectedSecret = process.env.DEVICE_PROVISIONING_SECRET?.trim();

  if (!expectedSecret) {
    return next(
      new AppError('DEVICE_PROVISIONING_SECRET nao configurado', 500)
    );
  }

  const providedSecret =
    readHeader(req, ['x-provisioning-secret', 'x-device-secret', 'x-api-key']) ??
    readAuthorizationScheme(req, 'Provisioning');

  if (!providedSecret) {
    return next(new AppError('Credencial de provisionamento ausente', 401));
  }

  if (!secretsMatch(providedSecret, expectedSecret)) {
    return next(new AppError('Credencial de provisionamento invalida', 401));
  }

  next();
}

export async function authenticateDevice(
  req: DeviceAuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deviceId = req.params.deviceId?.trim().toUpperCase();

    if (!deviceId) {
      throw new AppError('deviceId obrigatorio', 400);
    }

    const token =
      readHeader(req, ['x-device-token']) ??
      readAuthorizationScheme(req, 'Device');

    if (!token) {
      throw new AppError('Token do dispositivo ausente', 401);
    }

    const device = await prisma.device.findUnique({
      where: { deviceId },
      select: {
        id: true,
        deviceId: true,
        chipId: true,
        deviceTokenHash: true,
      },
    });

    if (!device) {
      throw new AppError('Dispositivo nao encontrado', 404);
    }

    if (!device.deviceTokenHash) {
      throw new AppError('Dispositivo sem token cadastrado', 401);
    }

    const tokenHash = hashDeviceToken(token);

    if (!secureCompare(tokenHash, device.deviceTokenHash)) {
      throw new AppError('Token do dispositivo invalido', 401);
    }

    req.device = {
      id: device.id,
      deviceId: device.deviceId,
      chipId: device.chipId,
    };

    next();
  } catch (err) {
    next(err);
  }
}
