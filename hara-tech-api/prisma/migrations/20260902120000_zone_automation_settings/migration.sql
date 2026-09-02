ALTER TABLE "zones"
  ADD COLUMN "automationEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "moistureStopThreshold" INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN "dryConfirmationSeconds" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "minimumIrrigationSeconds" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "maximumIrrigationSeconds" INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "cooldownMinutes" INTEGER NOT NULL DEFAULT 30;

-- 99% e o maior ponto de inicio valido; 100% permanece reservado para parada.
UPDATE "zones"
SET "moistureThreshold" = LEAST(99, "moistureThreshold");

-- Preserva nas areas existentes a histerese de 5 pontos usada pelo firmware anterior.
UPDATE "zones"
SET "moistureStopThreshold" = LEAST(100, "moistureThreshold" + 5);
