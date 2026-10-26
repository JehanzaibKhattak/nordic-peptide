CREATE TABLE "ArgentPayment" (
    "orderId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "intentId" TEXT,
    "paymentId" TEXT,
    "checkoutUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "live" BOOLEAN NOT NULL,
    "refundId" TEXT,
    "refundState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArgentPayment_pkey" PRIMARY KEY ("orderId")
);


CREATE UNIQUE INDEX "ArgentPayment_reference_key" ON "ArgentPayment"("reference");

CREATE UNIQUE INDEX "ArgentPayment_intentId_key" ON "ArgentPayment"("intentId");

CREATE UNIQUE INDEX "ArgentPayment_paymentId_key" ON "ArgentPayment"("paymentId");

CREATE UNIQUE INDEX "ArgentPayment_refundId_key" ON "ArgentPayment"("refundId");

ALTER TABLE "ArgentPayment" ADD CONSTRAINT "ArgentPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
