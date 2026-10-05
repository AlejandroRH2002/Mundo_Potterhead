-- Preserve existing primary images; supplementary URLs default to an empty gallery.
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
