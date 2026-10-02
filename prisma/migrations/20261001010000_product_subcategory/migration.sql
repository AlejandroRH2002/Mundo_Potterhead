ALTER TABLE "Product" ADD COLUMN "subcategory" TEXT;
CREATE INDEX "Product_universe_category_subcategory_idx" ON "Product"("universe", "category", "subcategory");
