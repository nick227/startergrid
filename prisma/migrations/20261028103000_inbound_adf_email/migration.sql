-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `inboundMessageId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `InboundEmailRoute` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `routeToken` VARCHAR(40) NOT NULL,
    `status` ENUM('ACTIVE', 'ROTATED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotatedAt` DATETIME(3) NULL,
    INDEX `InboundEmailRoute_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `InboundEmailRoute_routeToken_key`(`routeToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundEmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `providerMessageId` VARCHAR(120) NOT NULL,
    `rfcMessageId` VARCHAR(255) NULL,
    `dealershipId` VARCHAR(191) NULL,
    `routeToken` VARCHAR(40) NULL,
    `envelopeRecipient` VARCHAR(255) NOT NULL,
    `fromEmail` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `provenance` JSON NOT NULL,
    `providerTrust` ENUM('VERIFIED', 'CLAIMED', 'CONFLICTING', 'UNKNOWN') NOT NULL,
    `status` ENUM('RECEIVED', 'LEAD_CREATED', 'DUPLICATE', 'UNROUTED', 'PARSE_FAILED', 'NEEDS_REVIEW', 'DISMISSED') NOT NULL,
    `failureReason` VARCHAR(60) NULL,
    `duplicateOfLeadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `InboundEmailMessage_dealershipId_status_idx`(`dealershipId`, `status`),
    INDEX `InboundEmailMessage_dealershipId_rfcMessageId_idx`(`dealershipId`, `rfcMessageId`),
    UNIQUE INDEX `InboundEmailMessage_provider_providerMessageId_key`(`provider`, `providerMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboundLeadVehicleSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `basis` VARCHAR(20) NOT NULL,
    `resolution` VARCHAR(12) NULL,
    UNIQUE INDEX `InboundLeadVehicleSuggestion_leadId_vehicleId_key`(`leadId`, `vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Lead_inboundMessageId_key` ON `Lead`(`inboundMessageId`);

-- AddForeignKey
ALTER TABLE `InboundEmailRoute` ADD CONSTRAINT `InboundEmailRoute_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboundEmailMessage` ADD CONSTRAINT `InboundEmailMessage_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_inboundMessageId_fkey` FOREIGN KEY (`inboundMessageId`) REFERENCES `InboundEmailMessage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboundLeadVehicleSuggestion` ADD CONSTRAINT `InboundLeadVehicleSuggestion_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboundLeadVehicleSuggestion` ADD CONSTRAINT `InboundLeadVehicleSuggestion_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
