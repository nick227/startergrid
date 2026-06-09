-- PlatformCatalogSync: stores external catalog ID per dealer per platform (Meta, Google, TikTok, etc.)
CREATE TABLE `PlatformCatalogSync` (
    `id`            VARCHAR(191) NOT NULL,
    `dealershipId`  VARCHAR(191) NOT NULL,
    `platformSlug`  VARCHAR(80)  NOT NULL,
    `catalogId`     VARCHAR(120) NOT NULL,
    `metadataJson`  JSON         NULL,
    `lastSyncAt`    DATETIME(3)  NULL,
    `lastSyncCount` INT          NULL,
    `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)  NOT NULL,

    UNIQUE INDEX `PlatformCatalogSync_dealershipId_platformSlug_key`(`dealershipId`, `platformSlug`),
    INDEX `PlatformCatalogSync_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlatformCatalogSync` ADD CONSTRAINT `PlatformCatalogSync_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
