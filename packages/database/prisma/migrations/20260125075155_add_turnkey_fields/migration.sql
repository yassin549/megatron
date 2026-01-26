-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "collateral" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "stopLoss" DECIMAL(18,6),
ADD COLUMN     "takeProfit" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "turnkeySubOrgId" TEXT,
ADD COLUMN     "turnkeyWalletId" TEXT;

-- CreateTable
CREATE TABLE "limit_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "initialQuantity" DECIMAL(18,6) NOT NULL,
    "remainingQuantity" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limit_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimedExit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "totalShares" DECIMAL(18,6) NOT NULL,
    "sharesExited" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "chunksTotal" INTEGER NOT NULL,
    "chunksCompleted" INTEGER NOT NULL DEFAULT 0,
    "intervalMs" INTEGER NOT NULL DEFAULT 300000,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastError" TEXT,
    "nextExecutionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimedExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "limit_orders_assetId_status_side_price_idx" ON "limit_orders"("assetId", "status", "side", "price");

-- CreateIndex
CREATE INDEX "limit_orders_userId_idx" ON "limit_orders"("userId");

-- CreateIndex
CREATE INDEX "TimedExit_status_nextExecutionAt_idx" ON "TimedExit"("status", "nextExecutionAt");

-- CreateIndex
CREATE INDEX "TimedExit_userId_idx" ON "TimedExit"("userId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_assetId_key" ON "Bookmark"("userId", "assetId");

-- AddForeignKey
ALTER TABLE "limit_orders" ADD CONSTRAINT "limit_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_orders" ADD CONSTRAINT "limit_orders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimedExit" ADD CONSTRAINT "TimedExit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimedExit" ADD CONSTRAINT "TimedExit_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
