-- CreateTable
CREATE TABLE "Purchaser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "organization" TEXT NOT NULL DEFAULT '',
    "registrationId" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "researchPurpose" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'UNSUBMITTED',
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "reviewedAt" DATETIME,
    "approvedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginChallenge" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "digest" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommerceApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CheckoutCurrency" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "eurRate" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ShippingApproval" (
    "country" TEXT NOT NULL PRIMARY KEY,
    "approved" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "CommerceRateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "shortDescription" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "categoryId" TEXT NOT NULL,
    "researchApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedCountries" JSONB,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "form" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "relatedIds" JSONB NOT NULL,
    "faqs" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "faqs", "form", "id", "images", "isActive", "isPopular", "name", "relatedIds", "shortDescription", "sku", "slug", "specs", "updatedAt") SELECT "categoryId", "createdAt", "description", "faqs", "form", "id", "images", "isActive", "isPopular", "name", "relatedIds", "shortDescription", "sku", "slug", "specs", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaserId" TEXT,
    "stripeSessionId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "shippingMethod" TEXT NOT NULL,
    "shippingCountry" TEXT NOT NULL,
    "couponCode" TEXT,
    "paymentMethod" TEXT,
    "paymentProvider" TEXT,
    "providerRef" TEXT,
    "affiliate" JSONB,
    "trackingNo" TEXT,
    "reservedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "Purchaser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("affiliate", "billingAddress", "couponCode", "createdAt", "currency", "discountCents", "email", "id", "locale", "orderNumber", "paymentMethod", "paymentProvider", "providerRef", "reservedUntil", "shippingAddress", "shippingCents", "shippingCountry", "shippingMethod", "status", "subtotalCents", "taxCents", "totalCents", "trackingNo", "updatedAt") SELECT "affiliate", "billingAddress", "couponCode", "createdAt", "currency", "discountCents", "email", "id", "locale", "orderNumber", "paymentMethod", "paymentProvider", "providerRef", "reservedUntil", "shippingAddress", "shippingCents", "shippingCountry", "shippingMethod", "status", "subtotalCents", "taxCents", "totalCents", "trackingNo", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_email_idx" ON "Order"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Purchaser_email_key" ON "Purchaser"("email");

-- CreateIndex
CREATE INDEX "CommerceRateLimit_expiresAt_idx" ON "CommerceRateLimit"("expiresAt");
