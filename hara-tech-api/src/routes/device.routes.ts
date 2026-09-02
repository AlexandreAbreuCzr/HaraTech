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
import {
  getDeviceConfigHandler,
  getUserDeviceConfigHandler,
} from '../controllers/config.controller';
import {
  telemetryHandler,
  getLatestTelemetryHandler,
} from '../controllers/telemetry.controller';
import {
  getPendingCommandsHandler,
  acknowledgeCommandHandler,
  createCommandHandler,
  getDeviceCommandsHandler,
} from '../controllers/command.controller';
import {
  getDeviceIrrigationLogsHandler,
  getIrrigationLogsHandler,
} from '../controllers/irrigation.controller';
import { getDeviceStatusHandler } from '../controllers/device-status.controller';

const router: Router = Router();

const provisioningLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas tentativas de registro, aguarde.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const esp32Limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas requisicoes do dispositivo, aguarde.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.deviceId?.trim().toUpperCase() || 'unknown-device',
});

router.post(
  '/register',
  provisioningLimiter,
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
router.get('/irrigation-logs', getIrrigationLogsHandler);
router.get('/:deviceId/status', getDeviceStatusHandler);
router.post('/:deviceId/zones', createZoneHandler);
router.get('/:deviceId/zones', listZonesHandler);
router.patch('/:deviceId/zones/:zoneId', updateZoneHandler);
router.delete('/:deviceId/zones/:zoneId', deleteZoneHandler);
router.get('/:deviceId/configuration', getUserDeviceConfigHandler);
router.get('/:deviceId/telemetry/latest', getLatestTelemetryHandler);
router.get('/:deviceId/irrigation-logs', getDeviceIrrigationLogsHandler);
router.post('/:deviceId/commands', createCommandHandler);
router.get('/:deviceId/commands', getDeviceCommandsHandler);

export default router;
