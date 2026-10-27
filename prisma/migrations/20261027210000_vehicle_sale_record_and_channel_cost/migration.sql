-- CreateTable
CREATE TABLE `VehicleSaleRecord` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NULL,
    `salePriceCents` INTEGER NULL,
    `confirmedChannelSlug` VARCHAR(80) NULL,
    `sourceConfidence` ENUM('OBSERVED_FIRST_PARTY', 'PLATFORM_REPORTED', 'MANUAL_IMPORTED', 'UNAVAILABLE') NOT NULL DEFAULT 'MANUAL_IMPORTED',
    `recordedBy` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleSaleRecord_vehicleId_key`(`vehicleId`),
    INDEX `VehicleSaleRecord_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelMonthlyCost` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `flatFeeCents` INTEGER NULL,
    `adSpendCents` INTEGER NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `sourceConfidence` ENUM('OBSERVED_FIRST_PARTY', 'PLATFORM_REPORTED', 'MANUAL_IMPORTED', 'UNAVAILABLE') NOT NULL DEFAULT 'MANUAL_IMPORTED',
    `notes` TEXT NULL,
    `recordedBy` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelMonthlyCost_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `ChannelMonthlyCost_dealershipId_platformSlug_month_key`(`dealershipId`, `platformSlug`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VehicleSaleRecord` ADD CONSTRAINT `VehicleSaleRecord_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleSaleRecord` ADD CONSTRAINT `VehicleSaleRecord_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelMonthlyCost` ADD CONSTRAINT `ChannelMonthlyCost_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

