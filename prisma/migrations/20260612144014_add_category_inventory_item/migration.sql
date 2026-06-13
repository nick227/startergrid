-- CreateTable
CREATE TABLE `CategoryInventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(40) NOT NULL,
    `stockNumber` VARCHAR(80) NULL,
    `primaryIdentifier` VARCHAR(80) NULL,
    `priceCents` INTEGER NULL,
    `originalPriceCents` INTEGER NULL,
    `priceLastChangedAt` DATETIME(3) NULL,
    `condition` VARCHAR(24) NULL,
    `listingStatus` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    `data` JSON NOT NULL,
    `soldAt` DATETIME(3) NULL,
    `removedAt` DATETIME(3) NULL,
    `reactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CategoryInventoryItem_dealershipId_idx`(`dealershipId`),
    INDEX `CategoryInventoryItem_dealershipId_categoryId_idx`(`dealershipId`, `categoryId`),
    UNIQUE INDEX `CategoryInventoryItem_dealershipId_stockNumber_key`(`dealershipId`, `stockNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryInventoryItemMedia` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `kind` VARCHAR(32) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `mimeType` VARCHAR(80) NULL,
    `mediaSlotKey` VARCHAR(80) NULL,
    `mediaRole` VARCHAR(24) NULL,
    `customLabel` VARCHAR(120) NULL,
    `customGroup` VARCHAR(80) NULL,
    `assignedBy` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CategoryInventoryItemMedia_itemId_idx`(`itemId`),
    INDEX `CategoryInventoryItemMedia_itemId_mediaSlotKey_idx`(`itemId`, `mediaSlotKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CategoryInventoryItem` ADD CONSTRAINT `CategoryInventoryItem_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryInventoryItemMedia` ADD CONSTRAINT `CategoryInventoryItemMedia_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `CategoryInventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
