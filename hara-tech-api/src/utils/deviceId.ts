import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode(length = 6): string {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += CHARS[randomInt(CHARS.length)];
  }

  return `HT-${result}`;
}

export async function generateUniqueDeviceId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const deviceId = generateCode();
    const existing = await prisma.device.findUnique({ where: { deviceId } });

    if (!existing) {
      return deviceId;
    }
  }

  throw new Error('Falha ao gerar deviceId unico apos 10 tentativas');
}
