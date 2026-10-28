BEGIN;
ALTER TABLE "Product" ADD COLUMN "groupedIntoId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_groupedIntoId_fkey" FOREIGN KEY ("groupedIntoId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "Product" ADD CONSTRAINT "Product_grouped_source_state" CHECK ("groupedIntoId" IS NULL OR ("groupedIntoId" <> "id" AND "archived" AND "status"='archived'));
CREATE INDEX "Product_groupedIntoId_idx" ON "Product"("groupedIntoId");
CREATE TABLE "ProductGrouping" (
 "id" TEXT PRIMARY KEY,"actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
 "targetId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
 "fingerprint" TEXT NOT NULL UNIQUE,"report" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ProductGrouping_targetId_createdAt_idx" ON "ProductGrouping"("targetId","createdAt");
CREATE FUNCTION mp_grouping_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Product grouping audit is immutable'; END; $$;
CREATE TRIGGER grouping_immutable BEFORE UPDATE OR DELETE ON "ProductGrouping" FOR EACH ROW EXECUTE FUNCTION mp_grouping_immutable();
COMMIT;
