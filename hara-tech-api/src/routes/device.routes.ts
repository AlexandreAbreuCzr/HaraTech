import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/authenticate';
import {
  authenticateDevice,
  authenticateDeviceProvisioning,
} from '../middlewares/deviceAuth';
import {
  registerDeviceHandler,
  linkDeviceHandler,
  getUserDevicesHandler,
  heartbeatHandler,
} from '../controllers/device.controller';
import {
  createZoneHandler,
  listZonesHandler,
  updateZoneHandler,
  deleteZoneHandler,
} from '../controllers/zone.controller';
import { getDeviceConfigHandler } from '../controllers/config.controller';
import { telemetryHandler } from '../controllers/telemetry.controller';
import {
  getPendingCommandsHandler,
  acknowledgeCommandHandler,
  createCommandHandler,
  getDeviceCommandsHandler,
} from '../controllers/command.controller';

const router = Router();

const esp32Limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Muitas requisicoes do dispositivo, aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register',
  esp32Limiter,
  authenticateDeviceProvisioning,
  registerDeviceHandler
);
router.post(
  '/:deviceId/heartbeat',
  esp32Limiter,
  authenticateDevice,
  heartbeatHandler
);
router.get(
  '/:deviceId/config',
  esp32Limiter,
  authenticateDevice,
  getDeviceConfigHandler
);
router.post(
  '/:deviceId/telemetry',
  esp32Limiter,
  authenticateDevice,
  telemetryHandler
);
router.get(
  '/:deviceId/commands/pending',
  esp32Limiter,
  authenticateDevice,
  getPendingCommandsHandler
);
router.post(
  '/:deviceId/commands/:commandId/ack',
  esp32Limiter,
  authenticateDevice,
  acknowledgeCommandHandler
);

router.use(authenticate);

router.post('/link', linkDeviceHandler);
router.get('/', getUserDevicesHandler);
router.post('/:deviceId/zones', createZoneHandler);
router.get('/:deviceId/zones', listZonesHandler);
router.patch('/:deviceId/zones/:zoneId', updateZoneHandler);
router.delete('/:deviceId/zones/:zoneId', deleteZoneHandler);
router.post('/:deviceId/commands', createCommandHandler);
router.get('/:deviceId/commands', getDeviceCommandsHandler);

export default router;
