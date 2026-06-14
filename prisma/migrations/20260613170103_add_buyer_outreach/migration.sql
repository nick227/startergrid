-- CreateTable
CREATE TABLE `BuyerOutreach` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `recipientAddress` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `messagePreview` VARCHAR(500) NOT NULL,
    `errorMessage` VARCHAR(500) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BuyerOutreach_leadId_idx`(`leadId`),
    INDEX `BuyerOutreach_dealershipId_idx`(`dealershipId`),
    INDEX `BuyerOutreach_dealershipId_createdAt_idx`(`dealershipId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BuyerOutreach` ADD CONSTRAINT `BuyerOutreach_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyerOutreach` ADD CONSTRAINT `BuyerOutreach_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
