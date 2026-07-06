import jwt from 'jsonwebtoken';
import { AppError } from './AppError';

interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET nao definido');

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET nao definido');

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new AppError('Token invalido ou expirado', 401);
  }
}
