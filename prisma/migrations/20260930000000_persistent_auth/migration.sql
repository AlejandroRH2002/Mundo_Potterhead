-- Preserve existing users, products and migration history.
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING ROUND("price"::numeric, 2);
ALTER TABLE "Product" ADD COLUMN "universe" TEXT NOT NULL DEFAULT 'harry-potter',
 ADD COLUMN "originalPrice" DECIMAL(12,2), ADD COLUMN "isOnSale" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "Session" (
 "tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "LoginAttempt" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "LoginAttempt_expiresAt_idx" ON "LoginAttempt"("expiresAt");
