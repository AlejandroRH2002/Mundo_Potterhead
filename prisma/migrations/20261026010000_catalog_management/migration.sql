BEGIN;
ALTER TABLE "Product" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Product" ADD COLUMN "code" TEXT;
ALTER TABLE "Product" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
ALTER TABLE "Product" ADD CONSTRAINT "Product_status_check" CHECK ("status" IN ('draft','active','archived'));
ALTER TABLE "ProductModel" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProductSku" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductSku" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProductSku" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
-- No IDs or ledger entries change. Old writers use color='' and remain valid.
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_modelId_size_color_key" UNIQUE ("modelId","size","color");
ALTER TABLE "ProductSku" DROP CONSTRAINT "ProductSku_modelId_size_key";
CREATE UNIQUE INDEX "ProductSku_model_size_color_normalized" ON "ProductSku"("modelId","size",lower(btrim("color")));
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_color_check" CHECK (length("color") <= 60);
CREATE TABLE "CatalogImport" (
 "id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "fingerprint" TEXT NOT NULL UNIQUE, "summary" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CatalogImport_createdAt_id_idx" ON "CatalogImport"("createdAt","id");
-- Synchronize old archived flag with new state; old APIs never expose drafts.
CREATE FUNCTION mp_catalog_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW."status"='draft' OR NEW."status"='archived' THEN NEW."archived"=true;
  ELSIF NEW."archived" THEN NEW."status"='archived'; END IF;
 ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN NEW."archived"=(NEW."status"<>'active');
 ELSIF NEW."archived" IS DISTINCT FROM OLD."archived" THEN NEW."status"=CASE WHEN NEW."archived" THEN 'archived' ELSE 'active' END; END IF;
 IF TG_OP='UPDATE' THEN NEW."revision"=OLD."revision"+1; END IF;
 RETURN NEW;
END; $$;
UPDATE "Product" SET "status"='archived' WHERE "archived";
CREATE TRIGGER catalog_state BEFORE INSERT OR UPDATE ON "Product" FOR EACH ROW EXECUTE FUNCTION mp_catalog_state();
COMMIT;
