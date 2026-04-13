-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "pendingScanTagId" TEXT,
ADD COLUMN     "scanModeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "scanModeToken" TEXT;
