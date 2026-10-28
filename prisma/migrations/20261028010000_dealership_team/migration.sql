-- CreateTable
CREATE TABLE `TeamThread` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `authorEmail` VARCHAR(255) NOT NULL,
    `assigneeId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `reference` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamThread_dealershipId_createdAt_idx`(`dealershipId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamComment` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `authorEmail` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TeamComment_threadId_createdAt_idx`(`threadId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamThread` ADD CONSTRAINT `TeamThread_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamComment` ADD CONSTRAINT `TeamComment_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `TeamThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

