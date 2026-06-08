-- AlterTable: add price drop tracking columns to Vehicle
ALTER TABLE `Vehicle`
    ADD COLUMN `originalPriceCents` INTEGER NULL,
    ADD COLUMN `priceLastChangedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ListingReport` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(80) NOT NULL,
    `details` VARCHAR(1000) NULL,
    `reporterIp` VARCHAR(45) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ListingReport_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ListingReport` ADD CONSTRAINT `ListingReport_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
