-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "calculatedFare" DOUBLE PRECISION,
ADD COLUMN     "distanceMiles" DOUBLE PRECISION,
ADD COLUMN     "durationMinutes" DOUBLE PRECISION,
ADD COLUMN     "pricingMode" TEXT,
ADD COLUMN     "quotedPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RoutePrice" (
    "id" TEXT NOT NULL,
    "fromLabel" TEXT NOT NULL,
    "toLabel" TEXT NOT NULL,
    "fixedPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "RoutePrice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoutePrice" ADD CONSTRAINT "RoutePrice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
