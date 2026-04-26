-- Add a column for storing the direct image URL an extension returned at
-- search time. When set, the UI uses it as-is instead of falling back to the
-- /api/extensions/[id]/image proxy (which 404s for extensions that don't
-- implement /image).

ALTER TABLE "rfid_tags" ADD COLUMN "externalItemImageUrl" TEXT;
