export const HARA_PORTS = [
  { number: 1, zoneIndex: 0, servoGpio: 13, sensorGpio: 34 },
  { number: 2, zoneIndex: 1, servoGpio: 14, sensorGpio: 35 },
  { number: 3, zoneIndex: 2, servoGpio: 25, sensorGpio: 32 },
] as const;

/** GPIOs internos; o painel apresenta somente Saída 1, 2 ou 3. */
export const HARA_SERVO_GPIOS = HARA_PORTS.map((port) => port.servoGpio);

export function isHaraServoGpio(channel: number): boolean {
  return HARA_PORTS.some((port) => port.servoGpio === channel);
}

export function isHaraPortMapping(zoneIndex: number, channel: number): boolean {
  return HARA_PORTS.some(
    (port) => port.zoneIndex === zoneIndex && port.servoGpio === channel
  );
}

export const HARA_SERVO_GPIO_MESSAGE =
  'Selecione uma das tres saidas fisicas do Hara Tech';

export const HARA_PORT_MAPPING_MESSAGE =
  'A saida selecionada nao corresponde a pinagem fixa do Hara Tech';
