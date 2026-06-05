-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "parseMode" TEXT NOT NULL DEFAULT 'table',
    "fileConfig" TEXT NOT NULL DEFAULT '{}',
    "fieldMappings" TEXT NOT NULL DEFAULT '[]',
    "tailExtraction" TEXT,
    "aggregation" TEXT,
    "transpose" TEXT,
    "card" TEXT,
    "text" TEXT,
    "defaults" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waybill" (
    "id" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL DEFAULT '',
    "storeName" TEXT NOT NULL DEFAULT '',
    "receiverName" TEXT NOT NULL DEFAULT '',
    "receiverPhone" TEXT NOT NULL DEFAULT '',
    "receiverAddress" TEXT NOT NULL DEFAULT '',
    "skuCode" TEXT NOT NULL DEFAULT '',
    "skuName" TEXT NOT NULL DEFAULT '',
    "skuQuantity" INTEGER NOT NULL DEFAULT 0,
    "skuSpec" TEXT NOT NULL DEFAULT '',
    "remark" TEXT NOT NULL DEFAULT '',
    "batchId" TEXT NOT NULL DEFAULT '',
    "submittedAt" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Waybill_pkey" PRIMARY KEY ("id")
);
