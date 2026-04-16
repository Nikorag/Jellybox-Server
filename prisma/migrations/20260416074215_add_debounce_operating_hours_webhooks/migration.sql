-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('JELLYFIN_OFFLINE');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "lastPlayedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "operatingHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operatingHoursEnd" TEXT,
ADD COLUMN     "operatingHoursStart" TEXT,
ADD COLUMN     "operatingHoursTimezone" TEXT,
ADD COLUMN     "scanDebounceSeconds" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
