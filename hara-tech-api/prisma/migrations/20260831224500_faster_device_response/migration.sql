ALTER TABLE "device_configs"
  ALTER COLUMN "telemetryIntervalSeconds" SET DEFAULT 5,
  ALTER COLUMN "configSyncIntervalSeconds" SET DEFAULT 10;

UPDATE "device_configs"
SET
  "telemetryIntervalSeconds" = LEAST("telemetryIntervalSeconds", 5),
  "configSyncIntervalSeconds" = LEAST("configSyncIntervalSeconds", 10);
