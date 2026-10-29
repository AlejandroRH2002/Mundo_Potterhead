-- Expand-only: previous backends ignore this isolated settings table.
CREATE TABLE "PromotionSettings" (
 "id" TEXT PRIMARY KEY DEFAULT 'store',
 "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision">=0),
 "shippingEnabled" BOOLEAN NOT NULL DEFAULT false,
 "shippingMinimum" DECIMAL(12,2) NOT NULL DEFAULT 1500 CHECK ("shippingMinimum">0 AND "shippingMinimum"<=1000000),
 "shippingScope" TEXT NOT NULL DEFAULT '',
 "shippingConditions" TEXT NOT NULL DEFAULT '',
 "generalEnabled" BOOLEAN NOT NULL DEFAULT false,
 "generalTitle" TEXT NOT NULL DEFAULT '',
 "generalMessage" TEXT NOT NULL DEFAULT '',
 "updatedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PromotionSettings_singleton" CHECK ("id"='store'),
 CONSTRAINT "PromotionSettings_shipping_conditions" CHECK (NOT "shippingEnabled" OR (length(trim("shippingScope"))>0 AND length(trim("shippingConditions"))>0)),
 CONSTRAINT "PromotionSettings_general_content" CHECK (NOT "generalEnabled" OR (length(trim("generalTitle"))>0 AND length(trim("generalMessage"))>0))
);
INSERT INTO "PromotionSettings" ("id") VALUES ('store');
