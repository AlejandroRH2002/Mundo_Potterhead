BEGIN;
ALTER TABLE "Product" ADD COLUMN "imageThumbnails" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';
CREATE TABLE "ProductSku" (
 "id" TEXT PRIMARY KEY, "modelId" TEXT NOT NULL REFERENCES "ProductModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "code" TEXT NOT NULL UNIQUE, "size" TEXT NOT NULL DEFAULT 'one', "quantity" INTEGER, "version" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "ProductSku_modelId_size_key" UNIQUE ("modelId","size"),
 CONSTRAINT "ProductSku_quantity_check" CHECK ("quantity" IS NULL OR "quantity" BETWEEN 0 AND 1000000),
 CONSTRAINT "ProductSku_version_check" CHECK ("version">=0)
);
CREATE INDEX "ProductSku_size_quantity_idx" ON "ProductSku"("size","quantity");
-- Preserve existing inventory exactly; legacy zero Product.stock is never consulted.
INSERT INTO "ProductSku" ("id","modelId","code","quantity","version") SELECT "id","id","sku","quantity","version" FROM "ProductModel";
ALTER TABLE "InventoryMovement" ADD COLUMN "skuId" TEXT;
-- Only this migration may backfill the immutable ledger's new reference.
ALTER TABLE "InventoryMovement" DISABLE TRIGGER inventory_immutable;
UPDATE "InventoryMovement" SET "skuId"="modelId";
ALTER TABLE "InventoryMovement" ENABLE TRIGGER inventory_immutable;
ALTER TABLE "InventoryMovement" ALTER COLUMN "skuId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InventoryMovement_skuId_createdAt_id_idx" ON "InventoryMovement"("skuId","createdAt","id");
-- Search is maintained in the DB for all writers, without joins in q queries.
CREATE FUNCTION mp_refresh_search(pid TEXT) RETURNS void LANGUAGE sql AS $$
 UPDATE "Product" p SET "searchText"=p."name"||' '||COALESCE((SELECT string_agg(m."name",' ' ORDER BY m."id") FROM "ProductModel" m WHERE m."productId"=pid),'') WHERE p."id"=pid;
$$;
CREATE FUNCTION mp_model_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM mp_refresh_search(COALESCE(NEW."productId",OLD."productId")); RETURN COALESCE(NEW,OLD); END; $$;
CREATE TRIGGER model_search AFTER INSERT OR UPDATE OF "name" OR DELETE ON "ProductModel" FOR EACH ROW EXECUTE FUNCTION mp_model_search();
CREATE FUNCTION mp_product_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW."searchText"=NEW."name"||' '||COALESCE((SELECT string_agg("name",' ' ORDER BY "id") FROM "ProductModel" WHERE "productId"=NEW."id"),''); RETURN NEW; END; $$;
CREATE TRIGGER product_search BEFORE INSERT OR UPDATE OF "name" ON "Product" FOR EACH ROW EXECUTE FUNCTION mp_product_search();
UPDATE "Product" SET "name"="name";
-- Validate SKU size even for writers outside the API.
CREATE FUNCTION mp_check_size() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cat TEXT;
BEGIN SELECT p."category" INTO cat FROM "Product" p JOIN "ProductModel" m ON m."productId"=p."id" WHERE m."id"=NEW."modelId";
 IF NEW."size"='one' THEN RETURN NEW; END IF;
 IF cat='clothing' AND NEW."size" IN ('xs','s','m','l','xl','xxl') THEN RETURN NEW; END IF;
 IF cat='footwear' AND NEW."size" IN ('22','22.5','23','23.5','24','24.5','25','25.5','26','26.5','27','27.5','28','28.5','29','29.5','30') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Size does not belong to product category'; END; $$;
CREATE TRIGGER sku_size BEFORE INSERT OR UPDATE OF "size","modelId" ON "ProductSku" FOR EACH ROW EXECUTE FUNCTION mp_check_size();
CREATE FUNCTION mp_check_product_category() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW."category"=OLD."category" THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM "ProductSku" s JOIN "ProductModel" m ON m."id"=s."modelId" WHERE m."productId"=NEW."id" AND NOT (s."size"='one' OR NEW."category"='clothing' AND s."size" IN ('xs','s','m','l','xl','xxl') OR NEW."category"='footwear' AND s."size" IN ('22','22.5','23','23.5','24','24.5','25','25.5','26','26.5','27','27.5','28','28.5','29','29.5','30'))) THEN RAISE EXCEPTION 'Existing sizes conflict with category'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER product_category_sizes BEFORE UPDATE OF "category" ON "Product" FOR EACH ROW EXECUTE FUNCTION mp_check_product_category();
COMMIT;
