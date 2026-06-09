-- MarketplaceListing: tracks eBay (and future marketplace) listing lifecycle per vehicle per platform
CREATE TABLE `MarketplaceListing` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `externalListingId` VARCHAR(120) NULL,
    `externalOfferId` VARCHAR(120) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ENDED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `errorMessage` VARCHAR(500) NULL,
    `listedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketplaceListing_vehicleId_platformSlug_key`(`vehicleId`, `platformSlug`),
    INDEX `MarketplaceListing_dealershipId_platformSlug_idx`(`dealershipId`, `platformSlug`),
    INDEX `MarketplaceListing_dealershipId_platformSlug_status_idx`(`dealershipId`, `platformSlug`, `status`),
    INDEX `MarketplaceListing_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MarketplaceListing` ADD CONSTRAINT `MarketplaceListing_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketplaceListing` ADD CONSTRAINT `MarketplaceListing_vehicleId_fkey`
    FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
