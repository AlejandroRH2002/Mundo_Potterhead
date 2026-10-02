-- Incremental catalog ordering and offer/price filters; apply explicitly.
CREATE INDEX "Product_createdAt_id_idx" ON "Product"("createdAt", "id");
CREATE INDEX "Product_isOnSale_price_idx" ON "Product"("isOnSale", "price");
