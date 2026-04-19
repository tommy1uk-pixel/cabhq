ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS "driverLimit" INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "vehicleLimit" INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "dispatcherSeatLimit" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Company"
SET
  "status" = COALESCE("status", 'ACTIVE'),
  "timezone" = COALESCE("timezone", 'Europe/London'),
  "currency" = COALESCE("currency", 'GBP'),
  "driverLimit" = COALESCE("driverLimit", 25),
  "vehicleLimit" = COALESCE("vehicleLimit", 25),
  "dispatcherSeatLimit" = COALESCE("dispatcherSeatLimit", 3),
  "updatedAt" = CURRENT_TIMESTAMP;