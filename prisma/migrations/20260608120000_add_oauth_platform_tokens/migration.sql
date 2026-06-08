-- PlatformOAuthToken: one row per dealership+provider, covers all slugs for that provider
CREATE TABLE `PlatformOAuthToken` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenType` VARCHAR(20) NOT NULL DEFAULT 'Bearer',
    `scope` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `rawPayload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformOAuthToken_dealershipId_provider_key`(`dealershipId`, `provider`),
    INDEX `PlatformOAuthToken_dealershipId_idx`(`dealershipId`),
    INDEX `PlatformOAuthToken_provider_idx`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- OAuthState: temporary CSRF state rows, consumed at callback
CREATE TABLE `OAuthState` (
    `id` VARCHAR(191) NOT NULL,
    `state` VARCHAR(64) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `returnUrl` VARCHAR(500) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OAuthState_state_key`(`state`),
    INDEX `OAuthState_state_idx`(`state`),
    INDEX `OAuthState_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlatformOAuthToken` ADD CONSTRAINT `PlatformOAuthToken_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
