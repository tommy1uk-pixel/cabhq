/*
  Warnings:

  - Added the required column `pickupTime` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "pickupTime" TIMESTAMP(3) NOT NULL;
