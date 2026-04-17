-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "lastLocationAt" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
