-- Device authentication and heartbeat telemetry
ALTER TABLE "devices" ADD COLUMN "deviceTokenHash" TEXT;
ALTER TABLE "devices" ADD COLUMN "lastIp" TEXT;
ALTER TABLE "devices" ADD COLUMN "lastRssi" INTEGER;

CREATE UNIQUE INDEX "devices_deviceTokenHash_key" ON "devices"("deviceTokenHash");
