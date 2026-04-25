-- Reshape extensions for the shared-registry model:
--   * Extension is now system-wide (no userId; addedByUserId is audit-only)
--   * ExtensionAccount is now per-user (composite unique on extensionId+userId)
--
-- Any rows left over from the previous shape are cleared. Tags pointing at
-- extensions get their extensionId reset by the rfid_tags_extensionId_fkey
-- ON DELETE SET NULL behaviour, so no tag data is lost.

-- Clear v1 data (none expected outside dev).
DELETE FROM "extension_accounts";
DELETE FROM "extensions";

-- extensions: drop userId, add audit column.
ALTER TABLE "extensions" DROP CONSTRAINT "extensions_userId_fkey";
ALTER TABLE "extensions" DROP COLUMN "userId";
ALTER TABLE "extensions" ADD COLUMN "addedByUserId" TEXT;

-- extension_accounts: add userId, swap unique index.
DROP INDEX "extension_accounts_extensionId_key";
ALTER TABLE "extension_accounts" ADD COLUMN "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_accounts" ADD CONSTRAINT "extension_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "extension_accounts_extensionId_userId_key" ON "extension_accounts"("extensionId", "userId");
