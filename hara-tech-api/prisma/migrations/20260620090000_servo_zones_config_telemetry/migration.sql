-- Servo-based zone architecture, runtime configuration and telemetry.
CREATE TYPE "DeviceOperationMode" AS ENUM ('AUTO', 'MANUAL', 'OFF');
CREATE TYPE "PumpMode" AS ENUM ('AUTO', 'FORCED_ON', 'FORCED_OFF');
CREATE TYPE "ZoneDesiredState" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "ZoneAppliedState" AS ENUM ('OPEN', 'CLOSED', 'UNKNOWN');
CREATE TYPE "ZoneConfirmedState" AS ENUM ('OPEN', 'CLOSED', 'UNKNOWN', 'UNAVAILABLE');
CREATE TYPE "ActuatorType" AS ENUM ('SERVO');
CREATE TYPE "ActuatorDriver" AS ENUM ('ESP32_PWM', 'PCA9685');

ALTER TABLE "zones"
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "desiredState" "ZoneDesiredState" NOT NULL DEFAULT 'CLOSED',
  ADD COLUMN "appliedState" "ZoneAppliedState" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "confirmedState" "ZoneConfirmedState" NOT NULL DEFAULT 'UNAVAILABLE',
  ADD COLUMN "lastAppliedAngle" INTEGER,
  ADD COLUMN "lastTelemetryAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "zones"
SET "desiredState" = CASE WHEN "isActive" THEN 'OPEN'::"ZoneDesiredState" ELSE 'CLOSED'::"ZoneDesiredState" END;

CREATE TABLE "device_configs" (
  "id" TEXT NOT NULL,
  "operationMode" "DeviceOperationMode" NOT NULL DEFAULT 'AUTO',
  "moistureThreshold" INTEGER NOT NULL DEFAULT 35,
  "heartbeatIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
  "telemetryIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
  "configSyncIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
  "pumpMode" "PumpMode" NOT NULL DEFAULT 'AUTO',
  "maxSimultaneousZones" INTEGER,
  "configVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceId" TEXT NOT NULL,

  CONSTRAINT "device_configs_pkey" PRIMARY KEY ("id")
);

INSERT INTO "device_configs" ("id", "deviceId")
SELECT MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || "id"), "id"
FROM "devices"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "device_configs_deviceId_key" ON "device_configs"("deviceId");

CREATE TABLE "zone_actuators" (
  "id" TEXT NOT NULL,
  "type" "ActuatorType" NOT NULL DEFAULT 'SERVO',
  "driver" "ActuatorDriver" NOT NULL DEFAULT 'ESP32_PWM',
  "channel" INTEGER NOT NULL,
  "openAngle" INTEGER NOT NULL DEFAULT 90,
  "closedAngle" INTEGER NOT NULL DEFAULT 10,
  "minPulseUs" INTEGER NOT NULL DEFAULT 500,
  "maxPulseUs" INTEGER NOT NULL DEFAULT 2500,
  "inverted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceId" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL,

  CONSTRAINT "zone_actuators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zone_actuators_zoneId_key" ON "zone_actuators"("zoneId");
CREATE UNIQUE INDEX "zone_actuators_deviceId_driver_channel_key" ON "zone_actuators"("deviceId", "driver", "channel");

CREATE TABLE "device_telemetry" (
  "id" TEXT NOT NULL,
  "soilMoisture" INTEGER NOT NULL,
  "pumpOn" BOOLEAN NOT NULL,
  "firmwareTimestampMs" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceId" TEXT NOT NULL,

  CONSTRAINT "device_telemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_telemetry_deviceId_createdAt_idx" ON "device_telemetry"("deviceId", "createdAt");

CREATE TABLE "device_telemetry_zones" (
  "id" TEXT NOT NULL,
  "zoneIndex" INTEGER NOT NULL,
  "desiredState" "ZoneDesiredState",
  "appliedState" "ZoneAppliedState" NOT NULL DEFAULT 'UNKNOWN',
  "confirmedState" "ZoneConfirmedState" NOT NULL DEFAULT 'UNAVAILABLE',
  "servoAngle" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "telemetryId" TEXT NOT NULL,
  "zoneId" TEXT,

  CONSTRAINT "device_telemetry_zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_telemetry_zones_telemetryId_idx" ON "device_telemetry_zones"("telemetryId");
CREATE INDEX "device_telemetry_zones_zoneId_createdAt_idx" ON "device_telemetry_zones"("zoneId", "createdAt");

ALTER TABLE "device_configs"
  ADD CONSTRAINT "device_configs_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "zone_actuators"
  ADD CONSTRAINT "zone_actuators_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "zone_actuators"
  ADD CONSTRAINT "zone_actuators_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_telemetry"
  ADD CONSTRAINT "device_telemetry_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_telemetry_zones"
  ADD CONSTRAINT "device_telemetry_zones_telemetryId_fkey"
  FOREIGN KEY ("telemetryId") REFERENCES "device_telemetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_telemetry_zones"
  ADD CONSTRAINT "device_telemetry_zones_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
