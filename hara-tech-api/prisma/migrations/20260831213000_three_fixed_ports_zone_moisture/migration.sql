-- Stores the soil sensor reading associated with each fixed Hara Tech output.
ALTER TABLE "device_telemetry_zones"
  ADD COLUMN "soilMoisture" INTEGER;
