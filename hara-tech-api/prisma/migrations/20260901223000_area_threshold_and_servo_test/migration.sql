-- Each fixed output owns its sensor threshold; the former device threshold is
-- copied to existing areas to preserve their current behavior.
ALTER TABLE "zones"
  ADD COLUMN "moistureThreshold" INTEGER NOT NULL DEFAULT 35;

UPDATE "zones" AS zone
SET "moistureThreshold" = config."moistureThreshold"
FROM "device_configs" AS config
WHERE config."deviceId" = zone."deviceId";

ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'TEST_ZONE';
