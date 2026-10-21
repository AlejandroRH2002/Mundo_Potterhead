BEGIN;
-- Additive: legacy stock is deliberately not copied.
ALTER TABLE "Product" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "ProductModel" (
 "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "sku" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "image" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
 "quantity" INTEGER, "version" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ProductModel_quantity_check" CHECK ("quantity" IS NULL OR "quantity" BETWEEN 0 AND 1000000),
 CONSTRAINT "ProductModel_version_check" CHECK ("version" >= 0),
 CONSTRAINT "ProductModel_productId_name_key" UNIQUE ("productId", "name")
);
CREATE INDEX "ProductModel_productId_active_quantity_idx" ON "ProductModel"("productId","active","quantity");
CREATE TABLE "InventoryMovement" (
 "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "fingerprint" TEXT NOT NULL,
 "modelId" TEXT NOT NULL REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "type" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "before" INTEGER, "after" INTEGER NOT NULL,
 "delta" INTEGER NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "InventoryMovement_balance_check" CHECK ("after" BETWEEN 0 AND 1000000 AND ("before" IS NULL OR "before" BETWEEN 0 AND 1000000) AND "after" = COALESCE("before",0) + "delta"),
 CONSTRAINT "InventoryMovement_input_check" CHECK ("quantity" BETWEEN 0 AND 1000000 AND length(trim("reason")) BETWEEN 3 AND 300),
 CONSTRAINT "InventoryMovement_type_check" CHECK (
  ("type"='COUNT' AND "before" IS NULL AND "after"="quantity") OR
  ("type"='ADJUSTMENT' AND "before" IS NOT NULL AND "after"="quantity") OR
  ("type"='SALE' AND "before" IS NOT NULL AND "quantity">0 AND "delta"=-"quantity") OR
  ("type"='RECEIPT' AND "before" IS NOT NULL AND "quantity">0 AND "delta"="quantity"))
);
CREATE INDEX "InventoryMovement_modelId_createdAt_id_idx" ON "InventoryMovement"("modelId","createdAt","id");
-- Stable default model; NULL means awaiting a real count, never unlimited or zero.
INSERT INTO "ProductModel" ("id","productId","sku","name","updatedAt")
 SELECT 'default-'||"id", "id", 'MP-'||"id", 'General', CURRENT_TIMESTAMP FROM "Product";
-- Immutable ledger for normal application writers. Corrections are new movements.
CREATE FUNCTION mp_inventory_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Inventory movements are immutable'; END; $$;
CREATE TRIGGER inventory_immutable BEFORE UPDATE OR DELETE ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION mp_inventory_immutable();

COMMIT;
