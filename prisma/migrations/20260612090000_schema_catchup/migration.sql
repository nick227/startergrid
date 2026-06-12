-- AlterTable
ALTER TABLE `DealershipProfile` ADD COLUMN `logoUrl` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `MarketplaceUser` ADD COLUMN `avatarUrl` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `OperatorAccount` ADD COLUMN `avatarUrl` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `PlatformAccount` ADD COLUMN `connectionConfig` JSON NULL,
    ADD COLUMN `highestConfirmedLevel` VARCHAR(50) NULL,
    ADD COLUMN `lastValidatedAt` DATETIME(3) NULL,
    ADD COLUMN `lastValidationNote` TEXT NULL,
    ADD COLUMN `lastValidationStatus` VARCHAR(50) NULL,
    MODIFY `state` enum('ACCOUNT_NEEDED','CREDENTIALS_NEEDED','PENDING_REVIEW','ACTIVE','BLOCKED','PARTNER_REQUIRED','SUSPENDED','NEEDS_INFO','READY','FAILED','WAITING_ON_PARTNER') NOT NULL DEFAULT 'ACCOUNT_NEEDED';

-- AlterTable
ALTER TABLE `Vehicle` ADD COLUMN `listingStatus` VARCHAR(16) NOT NULL DEFAULT 'READY';

-- AlterTable
ALTER TABLE `VehicleMedia` ADD COLUMN `assignedBy` VARCHAR(30) NULL,
    ADD COLUMN `customGroup` VARCHAR(80) NULL,
    ADD COLUMN `customLabel` VARCHAR(120) NULL,
    ADD COLUMN `mediaRole` VARCHAR(24) NULL,
    ADD COLUMN `mediaSlotKey` VARCHAR(80) NULL;

-- CreateTable
CREATE TABLE `AdminAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `actorEmail` VARCHAR(255) NOT NULL,
    `detail` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAuditLog_action_createdAt_idx`(`action` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSecret` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `fieldKey` VARCHAR(80) NOT NULL,
    `encryptedValue` TEXT NOT NULL,
    `maskedValue` VARCHAR(80) NOT NULL,
    `secretType` VARCHAR(40) NULL,
    `lastRotatedAt` DATETIME(3) NULL,
    `lastValidatedAt` DATETIME(3) NULL,
    `validationStatus` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformSecret_dealershipId_idx`(`dealershipId` ASC),
    UNIQUE INDEX `PlatformSecret_dealershipId_platformSlug_fieldKey_key`(`dealershipId` ASC, `platformSlug` ASC, `fieldKey` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialPageAccount` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `pageId` VARCHAR(40) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `pictureUrl` VARCHAR(500) NULL,
    `category` VARCHAR(120) NULL,
    `pageAccessToken` TEXT NOT NULL,
    `pageTokenExpiresAt` DATETIME(3) NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `metadataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SocialPageAccount_dealershipId_platformSlug_idx`(`dealershipId` ASC, `platformSlug` ASC),
    INDEX `SocialPageAccount_dealershipId_platformSlug_isSelected_idx`(`dealershipId` ASC, `platformSlug` ASC, `isSelected` ASC),
    UNIQUE INDEX `SocialPageAccount_dealershipId_platformSlug_pageId_key`(`dealershipId` ASC, `platformSlug` ASC, `pageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialPost` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `pageAccountId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `externalPostId` VARCHAR(120) NULL,
    `externalUrl` VARCHAR(500) NULL,
    `postText` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'FAILED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `trigger` ENUM('MANUAL', 'AUTO', 'PREVIEW') NOT NULL DEFAULT 'MANUAL',
    `source` VARCHAR(80) NULL,
    `metadataJson` JSON NULL,
    `publishedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SocialPost_dealershipId_platformSlug_idx`(`dealershipId` ASC, `platformSlug` ASC),
    INDEX `SocialPost_dealershipId_platformSlug_status_idx`(`dealershipId` ASC, `platformSlug` ASC, `status` ASC),
    INDEX `SocialPost_pageAccountId_idx`(`pageAccountId` ASC),
    INDEX `SocialPost_vehicleId_idx`(`vehicleId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleChannelSelection` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `channelKey` VARCHAR(80) NOT NULL,
    `selected` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VehicleChannelSelection_dealershipId_idx`(`dealershipId` ASC),
    UNIQUE INDEX `VehicleChannelSelection_vehicleId_channelKey_key`(`vehicleId` ASC, `channelKey` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `VehicleMedia_vehicleId_mediaSlotKey_idx` ON `VehicleMedia`(`vehicleId` ASC, `mediaSlotKey` ASC);

-- AddForeignKey
ALTER TABLE `PlatformSecret` ADD CONSTRAINT `PlatformSecret_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialPageAccount` ADD CONSTRAINT `SocialPageAccount_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialPost` ADD CONSTRAINT `SocialPost_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialPost` ADD CONSTRAINT `SocialPost_pageAccountId_fkey` FOREIGN KEY (`pageAccountId`) REFERENCES `SocialPageAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialPost` ADD CONSTRAINT `SocialPost_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleChannelSelection` ADD CONSTRAINT `VehicleChannelSelection_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

