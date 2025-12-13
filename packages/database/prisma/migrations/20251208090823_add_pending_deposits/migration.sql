-- CreateTable
CREATE TABLE "PendingDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PendingDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingDeposit_txHash_key" ON "PendingDeposit"("txHash");

-- CreateIndex
CREATE INDEX "PendingDeposit_status_idx" ON "PendingDeposit"("status");

-- CreateIndex
CREATE INDEX "PendingDeposit_userId_idx" ON "PendingDeposit"("userId");

-- AddForeignKey
ALTER TABLE "PendingDeposit" ADD CONSTRAINT "PendingDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
