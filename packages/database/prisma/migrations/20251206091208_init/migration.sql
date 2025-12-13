-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "walletHotBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "walletColdBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "depositAddress" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "oracleQueries" JSONB NOT NULL,
    "oracleIntervalMs" INTEGER NOT NULL DEFAULT 600000,
    "pricingModel" TEXT NOT NULL DEFAULT 'linear_bonding',
    "pricingParams" JSONB NOT NULL,
    "totalSupply" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'funding',
    "softCap" DECIMAL(18,6) NOT NULL,
    "hardCap" DECIMAL(18,6) NOT NULL,
    "fundingDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "lastMarketPrice" DECIMAL(18,6),
    "lastFundamental" DECIMAL(18,6),
    "lastDisplayPrice" DECIMAL(18,6),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variableName" TEXT NOT NULL,
    "description" TEXT,
    "suggestedQueries" JSONB NOT NULL,
    "initialLPContribution" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityPool" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "totalUsdc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalLPShares" DECIMAL(27,18) NOT NULL DEFAULT 0,
    "unclaimedFees" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'funding',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiquidityPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPShare" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lpShares" DECIMAL(27,18) NOT NULL,
    "contributedUsdc" DECIMAL(18,6) NOT NULL,
    "unclaimedRewards" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPUnlockSchedule" (
    "id" TEXT NOT NULL,
    "lpShareId" TEXT NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "unlockPercentage" DECIMAL(5,2) NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LPUnlockSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalQueue" (
    "id" TEXT NOT NULL,
    "lpShareId" TEXT NOT NULL,
    "amountUsdc" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawalQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "price" DECIMAL(18,6) NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "fee" DECIMAL(18,6) NOT NULL,
    "side" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "shares" DECIMAL(18,6) NOT NULL,
    "avgPrice" DECIMAL(18,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaAmount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracleLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "deltaPercent" DECIMAL(10,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "summary" TEXT,
    "sourceUrls" JSONB NOT NULL,
    "llmResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OracleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTick" (
    "id" BIGSERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "priceDisplay" DECIMAL(18,6) NOT NULL,
    "priceMarket" DECIMAL(18,6) NOT NULL,
    "priceFundamental" DECIMAL(18,6) NOT NULL,
    "weightMarket" DECIMAL(5,4) NOT NULL,
    "volume5m" DECIMAL(18,6) NOT NULL,
    "supply" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "PriceTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_depositAddress_key" ON "User"("depositAddress");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "AssetRequest_userId_idx" ON "AssetRequest"("userId");

-- CreateIndex
CREATE INDEX "AssetRequest_status_idx" ON "AssetRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityPool_assetId_key" ON "LiquidityPool"("assetId");

-- CreateIndex
CREATE INDEX "LPShare_userId_idx" ON "LPShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LPShare_poolId_userId_key" ON "LPShare"("poolId", "userId");

-- CreateIndex
CREATE INDEX "LPUnlockSchedule_lpShareId_unlockDate_idx" ON "LPUnlockSchedule"("lpShareId", "unlockDate");

-- CreateIndex
CREATE INDEX "WithdrawalQueue_status_requestedAt_idx" ON "WithdrawalQueue"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "Trade_assetId_timestamp_idx" ON "Trade"("assetId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_buyerId_idx" ON "Trade"("buyerId");

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_assetId_key" ON "Position"("userId", "assetId");

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_refId_idx" ON "Ledger"("refId");

-- CreateIndex
CREATE INDEX "OracleLog_assetId_createdAt_idx" ON "OracleLog"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceTick_assetId_timestamp_idx" ON "PriceTick"("assetId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "AdminAction_adminEmail_createdAt_idx" ON "AdminAction"("adminEmail", "createdAt");

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidityPool" ADD CONSTRAINT "LiquidityPool_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPShare" ADD CONSTRAINT "LPShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "LiquidityPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPShare" ADD CONSTRAINT "LPShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPUnlockSchedule" ADD CONSTRAINT "LPUnlockSchedule_lpShareId_fkey" FOREIGN KEY ("lpShareId") REFERENCES "LPShare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalQueue" ADD CONSTRAINT "WithdrawalQueue_lpShareId_fkey" FOREIGN KEY ("lpShareId") REFERENCES "LPShare"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracleLog" ADD CONSTRAINT "OracleLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTick" ADD CONSTRAINT "PriceTick_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
