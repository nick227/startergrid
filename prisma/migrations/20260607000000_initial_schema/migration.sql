-- CreateTable
CREATE TABLE `OperatorAccount` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'OPERATOR', 'DEALER_OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OperatorAccount_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperatorDealerAccess` (
    `id` VARCHAR(191) NOT NULL,
    `operatorAccountId` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `grantedBy` VARCHAR(30) NOT NULL,

    INDEX `OperatorDealerAccess_operatorAccountId_idx`(`operatorAccountId`),
    INDEX `OperatorDealerAccess_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `OperatorDealerAccess_operatorAccountId_dealershipId_key`(`operatorAccountId`, `dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperatorSession` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `operatorAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,

    UNIQUE INDEX `OperatorSession_tokenHash_key`(`tokenHash`),
    INDEX `OperatorSession_operatorAccountId_idx`(`operatorAccountId`),
    INDEX `OperatorSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(160) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketplaceUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceSession` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `marketplaceUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,

    UNIQUE INDEX `MarketplaceSession_tokenHash_key`(`tokenHash`),
    INDEX `MarketplaceSession_marketplaceUserId_idx`(`marketplaceUserId`),
    INDEX `MarketplaceSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `marketplaceUserId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketplaceFavorite_marketplaceUserId_idx`(`marketplaceUserId`),
    UNIQUE INDEX `MarketplaceFavorite_marketplaceUserId_vehicleId_key`(`marketplaceUserId`, `vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealershipProfile` (
    `id` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(160) NOT NULL,
    `dbaName` VARCHAR(160) NULL,
    `businessCategory` ENUM('AUTOMOTIVE', 'SONGS', 'EBOOKS', 'WATCHES', 'SNEAKERS', 'COLLECTIBLES', 'APPAREL', 'VACATION_RENTALS', 'APARTMENTS', 'HOMES', 'COMMERCIAL_PROPERTY', 'BOATS', 'TRAILERS_POWERSPORTS_RV', 'PAWN', 'DIGITAL_ART', 'HEAVY_EQUIPMENT', 'FURNITURE', 'VIDEO_DISTRIBUTION') NOT NULL DEFAULT 'AUTOMOTIVE',
    `dealerLicense` VARCHAR(80) NULL,
    `rooftopAddress` JSON NOT NULL,
    `websiteUrl` VARCHAR(255) NULL,
    `primaryContact` JSON NOT NULL,
    `inventorySize` INTEGER NULL,
    `desiredChannels` JSON NOT NULL,
    `documents` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vin` VARCHAR(32) NOT NULL,
    `stockNumber` VARCHAR(80) NOT NULL,
    `year` INTEGER NOT NULL,
    `make` VARCHAR(80) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `trim` VARCHAR(120) NULL,
    `mileage` INTEGER NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `condition` VARCHAR(24) NOT NULL,
    `exteriorColor` VARCHAR(80) NOT NULL,
    `interiorColor` VARCHAR(80) NULL,
    `bodyStyle` VARCHAR(80) NULL,
    `drivetrain` VARCHAR(80) NULL,
    `fuelType` VARCHAR(80) NULL,
    `transmission` VARCHAR(80) NULL,
    `options` JSON NOT NULL,
    `starCore` JSON NOT NULL,
    `categoryPayload` JSON NULL,
    `soldAt` DATETIME(3) NULL,
    `removedAt` DATETIME(3) NULL,
    `reactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vehicle_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `Vehicle_dealershipId_stockNumber_key`(`dealershipId`, `stockNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleMedia` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `kind` VARCHAR(32) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `mimeType` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehicleMedia_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformProfile` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `name` VARCHAR(140) NOT NULL,
    `kind` ENUM('MARKETPLACE', 'AD_NETWORK', 'SOCIAL_CATALOG', 'DEALER_STOREFRONT', 'LEAD_ROUTER') NOT NULL,
    `integrationClass` ENUM('OWNED', 'FEEDABLE', 'ASSISTED', 'PARTNER_DEPENDENT') NOT NULL DEFAULT 'ASSISTED',
    `submissionMethods` JSON NOT NULL,
    `requiredDealershipFields` JSON NOT NULL,
    `requiredVehicleFields` JSON NOT NULL,
    `requiredMediaRules` JSON NOT NULL,
    `outputFormat` VARCHAR(80) NOT NULL,
    `schemaVersion` VARCHAR(80) NOT NULL,
    `lastVerifiedAt` DATETIME(3) NULL,
    `profileConfidence` VARCHAR(24) NOT NULL DEFAULT 'MEDIUM',
    `needsReview` BOOLEAN NOT NULL DEFAULT false,
    `sourceNote` TEXT NULL,
    `mockEndpoint` VARCHAR(255) NULL,
    `integrationUrls` JSON NULL,
    `sourceUrls` JSON NOT NULL,
    `testFixtures` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformProfile_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformApplication` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformId` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'PROFILE_MISSING_INFO', 'READY_TO_SUBMIT', 'SUBMITTED', 'DEALER_ACTION_NEEDED', 'PLATFORM_REVIEWING', 'APPROVED', 'FEED_TESTING', 'ACTIVE', 'REJECTED', 'PAUSED', 'PARTNER_REQUIRED') NOT NULL DEFAULT 'NOT_STARTED',
    `referralCode` VARCHAR(120) NULL,
    `missingFields` JSON NULL,
    `nextAction` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformApplication_platformId_idx`(`platformId`),
    UNIQUE INDEX `PlatformApplication_dealershipId_platformId_key`(`dealershipId`, `platformId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorizationPacket` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `authorizationKey` VARCHAR(120) NOT NULL,
    `scope` JSON NOT NULL,
    `verificationUrl` VARCHAR(512) NOT NULL,
    `revocationUrl` VARCHAR(512) NOT NULL,
    `dealershipSnapshot` JSON NOT NULL,
    `platformSnapshot` JSON NOT NULL,
    `inventorySnapshot` JSON NOT NULL,
    `packetPayload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AuthorizationPacket_authorizationKey_key`(`authorizationKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmissionAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `method` ENUM('MOCK_EMAIL', 'MOCK_FORM', 'MOCK_API', 'FEED_URL', 'SFTP', 'OAUTH', 'MANUAL_REP') NOT NULL,
    `destination` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PASS', 'WARN', 'FAIL') NOT NULL DEFAULT 'PASS',
    `response` JSON NULL,
    `receiptJson` JSON NULL,
    `mockAccepted` BOOLEAN NOT NULL DEFAULT false,
    `rejectionReasonsJson` JSON NULL,
    `artifactPath` VARCHAR(512) NULL,
    `environment` ENUM('MOCK', 'SANDBOX', 'PRODUCTION') NOT NULL DEFAULT 'MOCK',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SubmissionAttempt_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MockValidationRun` (
    `id` VARCHAR(191) NOT NULL,
    `platformId` VARCHAR(191) NOT NULL,
    `status` ENUM('PASS', 'WARN', 'FAIL') NOT NULL,
    `overallStatus` VARCHAR(24) NULL,
    `summary` VARCHAR(255) NOT NULL,
    `results` JSON NOT NULL,
    `platformResultsJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MockValidationRun_platformId_idx`(`platformId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `source` ENUM('DEALER_STOREFRONT', 'ADF_XML', 'PLATFORM_FORM', 'MANUAL') NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `contactName` VARCHAR(160) NULL,
    `contactEmail` VARCHAR(255) NULL,
    `contactPhone` VARCHAR(40) NULL,
    `message` TEXT NULL,
    `vehicleInterest` JSON NULL,
    `adfPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Lead_dealershipId_idx`(`dealershipId`),
    INDEX `Lead_platformSlug_idx`(`platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `kind` ENUM('PRICE_CHANGE', 'PHOTO_CHANGE', 'SOLD', 'REMOVED', 'RELISTED', 'DETAILS_CHANGE') NOT NULL,
    `previousValue` JSON NULL,
    `newValue` JSON NULL,
    `propagatedTo` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehicleUpdate_vehicleId_idx`(`vehicleId`),
    INDEX `VehicleUpdate_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleLifecycleEvent` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `fromState` VARCHAR(20) NOT NULL,
    `toState` VARCHAR(20) NOT NULL,
    `triggerKind` VARCHAR(40) NOT NULL,
    `source` VARCHAR(40) NOT NULL,
    `ingressRunId` VARCHAR(191) NULL,
    `statusChangedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehicleLifecycleEvent_vehicleId_idx`(`vehicleId`),
    INDEX `VehicleLifecycleEvent_dealershipId_createdAt_idx`(`dealershipId`, `createdAt`),
    INDEX `VehicleLifecycleEvent_ingressRunId_idx`(`ingressRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(40) NOT NULL,
    `setupFeeCents` INTEGER NOT NULL DEFAULT 0,
    `monthlyFeeCents` INTEGER NOT NULL DEFAULT 0,
    `activeFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activeTo` DATETIME(3) NULL,
    `status` VARCHAR(24) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DealerSubscription_dealershipId_key`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformProfileVersion` (
    `id` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `schemaVersion` VARCHAR(80) NOT NULL,
    `profileJson` JSON NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `seededAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformProfileVersion_platformSlug_idx`(`platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleCount` INTEGER NOT NULL,
    `snapshotJson` JSON NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventorySnapshot_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReadinessRun` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `inventorySnapshotId` VARCHAR(191) NOT NULL,
    `environment` ENUM('MOCK', 'SANDBOX', 'PRODUCTION') NOT NULL DEFAULT 'MOCK',
    `runMode` VARCHAR(24) NOT NULL,
    `overallStatus` VARCHAR(24) NOT NULL,
    `greenCount` INTEGER NOT NULL,
    `yellowCount` INTEGER NOT NULL,
    `redCount` INTEGER NOT NULL,
    `validatorVersion` VARCHAR(40) NOT NULL,
    `resultsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReadinessRun_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeneratedArtifact` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `format` VARCHAR(80) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `storagePath` VARCHAR(512) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `environment` ENUM('MOCK', 'SANDBOX', 'PRODUCTION') NOT NULL DEFAULT 'MOCK',
    `linkedRunId` VARCHAR(191) NULL,
    `linkedSubmissionId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GeneratedArtifact_dealershipId_idx`(`dealershipId`),
    INDEX `GeneratedArtifact_platformSlug_idx`(`platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformCredentialRef` (
    `id` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `dealershipId` VARCHAR(191) NULL,
    `environment` ENUM('MOCK', 'SANDBOX', 'PRODUCTION') NOT NULL,
    `credentialKey` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `lastValidatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformCredentialRef_platformSlug_idx`(`platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerNotification` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `payload` JSON NOT NULL,
    `deliveryStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DealerNotification_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `mode` ENUM('REAL_TIME', 'SCHEDULED', 'MANUAL', 'APPROVAL_REQUIRED') NOT NULL,
    `urgentRemoval` BOOLEAN NOT NULL DEFAULT true,
    `scheduleHint` VARCHAR(80) NULL,
    `minIntervalMinutes` INTEGER NULL,
    `lastDispatchedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SyncPolicy_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `SyncPolicy_dealershipId_platformSlug_key`(`dealershipId`, `platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishQueueItem` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `triggerKind` VARCHAR(40) NOT NULL,
    `status` ENUM('READY', 'BLOCKED', 'NEEDS_APPROVAL', 'SCHEDULED', 'CLAIMED', 'HELD', 'SENT', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'READY',
    `policyMode` ENUM('REAL_TIME', 'SCHEDULED', 'MANUAL', 'APPROVAL_REQUIRED') NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 5,
    `idempotencyKey` VARCHAR(120) NOT NULL,
    `scheduledFor` DATETIME(3) NULL,
    `approvalRequiredReason` VARCHAR(255) NULL,
    `blockReason` VARCHAR(255) NULL,
    `approvedBy` VARCHAR(160) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedBy` VARCHAR(160) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `heldBy` VARCHAR(160) NULL,
    `heldAt` DATETIME(3) NULL,
    `holdReason` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `claimedAt` DATETIME(3) NULL,
    `claimedBy` VARCHAR(120) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `nextAttemptAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PublishQueueItem_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PublishQueueItem_dealershipId_status_idx`(`dealershipId`, `status`),
    INDEX `PublishQueueItem_dealershipId_vehicleId_platformSlug_idx`(`dealershipId`, `vehicleId`, `platformSlug`),
    INDEX `PublishQueueItem_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncRun` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `triggeredBy` VARCHAR(80) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    `itemsTotal` INTEGER NOT NULL DEFAULT 0,
    `itemsSent` INTEGER NOT NULL DEFAULT 0,
    `itemsFailed` INTEGER NOT NULL DEFAULT 0,
    `itemsSkipped` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SyncRun_dealershipId_idx`(`dealershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncEvent` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `platformSlug` VARCHAR(80) NULL,
    `kind` ENUM('INVENTORY_CHANGE', 'VEHICLE_SOLD', 'VEHICLE_REMOVED', 'ARTIFACT_GENERATED', 'SUBMISSION_SENT', 'APPROVAL_GRANTED', 'APPROVAL_REJECTED', 'PARTNER_FOLLOWUP', 'ACCOUNT_UPDATED', 'POLICY_CHANGED', 'DISPATCH_CLAIMED', 'DISPATCH_FAILED', 'DISPATCH_RETRY', 'APPROVAL_REQUESTED', 'APPROVAL_HELD', 'APPROVAL_RELEASED', 'INVENTORY_IMPORT') NOT NULL,
    `payload` JSON NOT NULL,
    `syncRunId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SyncEvent_dealershipId_idx`(`dealershipId`),
    INDEX `SyncEvent_vehicleId_idx`(`vehicleId`),
    INDEX `SyncEvent_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySource` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `kind` ENUM('API', 'WEBHOOK', 'CSV', 'JSON', 'MANUAL', 'SCHEDULED_CHECK') NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
    `lastReceivedAt` DATETIME(3) NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `configJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventorySource_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `InventorySource_dealershipId_slug_key`(`dealershipId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IngressRun` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `sourceKind` ENUM('API', 'WEBHOOK', 'CSV', 'JSON', 'MANUAL', 'SCHEDULED_CHECK') NOT NULL,
    `status` ENUM('RECEIVED', 'PROCESSING', 'COMMITTED', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `receivedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `vehicleCount` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `blockedCount` INTEGER NOT NULL DEFAULT 0,
    `errorCount` INTEGER NOT NULL DEFAULT 0,
    `mappingJson` JSON NULL,
    `summaryJson` JSON NULL,
    `platformImpactJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IngressRun_dealershipId_idx`(`dealershipId`),
    INDEX `IngressRun_sourceId_idx`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAccount` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `state` ENUM('ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'PENDING_REVIEW', 'ACTIVE', 'BLOCKED', 'PARTNER_REQUIRED', 'SUSPENDED') NOT NULL DEFAULT 'ACCOUNT_NEEDED',
    `accountId` VARCHAR(120) NULL,
    `platformRepName` VARCHAR(160) NULL,
    `platformRepEmail` VARCHAR(255) NULL,
    `membershipStatus` VARCHAR(80) NULL,
    `nextAction` VARCHAR(255) NULL,
    `nextActionOwner` VARCHAR(80) NULL,
    `notes` TEXT NULL,
    `lastChecked` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformAccount_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `PlatformAccount_dealershipId_platformSlug_key`(`dealershipId`, `platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehiclePerformanceCache` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `stockNumber` VARCHAR(80) NOT NULL,
    `make` VARCHAR(80) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `year` INTEGER NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `condition` VARCHAR(10) NOT NULL,
    `daysOnline` INTEGER NOT NULL,
    `firstListedAt` DATETIME(3) NOT NULL,
    `comparableCount` INTEGER NOT NULL DEFAULT 0,
    `avgComparableDays` DOUBLE NULL,
    `medianComparableDays` DOUBLE NULL,
    `benchmarkConfidence` VARCHAR(16) NOT NULL DEFAULT 'INSUFFICIENT',
    `movementSignal` VARCHAR(16) NOT NULL,
    `platformAssistsJson` JSON NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehiclePerformanceCache_vehicleId_key`(`vehicleId`),
    INDEX `VehiclePerformanceCache_dealershipId_idx`(`dealershipId`),
    INDEX `VehiclePerformanceCache_dealershipId_movementSignal_idx`(`dealershipId`, `movementSignal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformPerformanceSummary` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `vehiclesListed` INTEGER NOT NULL DEFAULT 0,
    `vehiclesSold` INTEGER NOT NULL DEFAULT 0,
    `vehiclesRemoved` INTEGER NOT NULL DEFAULT 0,
    `avgDaysToMove` DOUBLE NULL,
    `medianDaysToMove` DOUBLE NULL,
    `avgDaysOnPlatform` DOUBLE NULL,
    `totalLeads` INTEGER NOT NULL DEFAULT 0,
    `leadsPerVehicle` DOUBLE NULL,
    `confidence` VARCHAR(16) NOT NULL,
    `sampleSize` INTEGER NOT NULL DEFAULT 0,
    `channelMetricsJson` JSON NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformPerformanceSummary_dealershipId_idx`(`dealershipId`),
    UNIQUE INDEX `PlatformPerformanceSummary_dealershipId_platformSlug_key`(`dealershipId`, `platformSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelEvent` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `platformSlug` VARCHAR(80) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `listingId` VARCHAR(80) NULL,
    `eventType` ENUM('VEHICLE_IMPRESSION', 'VEHICLE_DETAIL_VIEW', 'DEALER_PAGE_VIEW', 'INQUIRY_SUBMITTED', 'REPORTED_CLICK', 'REPORTED_VIEW', 'REPORTED_CONTACT') NOT NULL,
    `sourceConfidence` ENUM('OBSERVED_FIRST_PARTY', 'PLATFORM_REPORTED', 'MANUAL_IMPORTED', 'UNAVAILABLE') NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `metadataJson` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChannelEvent_dealershipId_idx`(`dealershipId`),
    INDEX `ChannelEvent_dealershipId_platformSlug_idx`(`dealershipId`, `platformSlug`),
    INDEX `ChannelEvent_dealershipId_platformSlug_eventType_idx`(`dealershipId`, `platformSlug`, `eventType`),
    INDEX `ChannelEvent_vehicleId_idx`(`vehicleId`),
    INDEX `ChannelEvent_occurredAt_idx`(`occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OperatorDealerAccess` ADD CONSTRAINT `OperatorDealerAccess_operatorAccountId_fkey` FOREIGN KEY (`operatorAccountId`) REFERENCES `OperatorAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperatorDealerAccess` ADD CONSTRAINT `OperatorDealerAccess_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperatorSession` ADD CONSTRAINT `OperatorSession_operatorAccountId_fkey` FOREIGN KEY (`operatorAccountId`) REFERENCES `OperatorAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceSession` ADD CONSTRAINT `MarketplaceSession_marketplaceUserId_fkey` FOREIGN KEY (`marketplaceUserId`) REFERENCES `MarketplaceUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceFavorite` ADD CONSTRAINT `MarketplaceFavorite_marketplaceUserId_fkey` FOREIGN KEY (`marketplaceUserId`) REFERENCES `MarketplaceUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceFavorite` ADD CONSTRAINT `MarketplaceFavorite_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleMedia` ADD CONSTRAINT `VehicleMedia_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformApplication` ADD CONSTRAINT `PlatformApplication_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformApplication` ADD CONSTRAINT `PlatformApplication_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `PlatformProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuthorizationPacket` ADD CONSTRAINT `AuthorizationPacket_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `PlatformApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmissionAttempt` ADD CONSTRAINT `SubmissionAttempt_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `PlatformApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MockValidationRun` ADD CONSTRAINT `MockValidationRun_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `PlatformProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleUpdate` ADD CONSTRAINT `VehicleUpdate_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleUpdate` ADD CONSTRAINT `VehicleUpdate_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleLifecycleEvent` ADD CONSTRAINT `VehicleLifecycleEvent_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleLifecycleEvent` ADD CONSTRAINT `VehicleLifecycleEvent_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerSubscription` ADD CONSTRAINT `DealerSubscription_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySnapshot` ADD CONSTRAINT `InventorySnapshot_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReadinessRun` ADD CONSTRAINT `ReadinessRun_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReadinessRun` ADD CONSTRAINT `ReadinessRun_inventorySnapshotId_fkey` FOREIGN KEY (`inventorySnapshotId`) REFERENCES `InventorySnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneratedArtifact` ADD CONSTRAINT `GeneratedArtifact_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneratedArtifact` ADD CONSTRAINT `GeneratedArtifact_linkedRunId_fkey` FOREIGN KEY (`linkedRunId`) REFERENCES `ReadinessRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformCredentialRef` ADD CONSTRAINT `PlatformCredentialRef_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerNotification` ADD CONSTRAINT `DealerNotification_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncPolicy` ADD CONSTRAINT `SyncPolicy_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishQueueItem` ADD CONSTRAINT `PublishQueueItem_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishQueueItem` ADD CONSTRAINT `PublishQueueItem_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncRun` ADD CONSTRAINT `SyncRun_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncEvent` ADD CONSTRAINT `SyncEvent_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncEvent` ADD CONSTRAINT `SyncEvent_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncEvent` ADD CONSTRAINT `SyncEvent_syncRunId_fkey` FOREIGN KEY (`syncRunId`) REFERENCES `SyncRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySource` ADD CONSTRAINT `InventorySource_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IngressRun` ADD CONSTRAINT `IngressRun_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IngressRun` ADD CONSTRAINT `IngressRun_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `InventorySource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAccount` ADD CONSTRAINT `PlatformAccount_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehiclePerformanceCache` ADD CONSTRAINT `VehiclePerformanceCache_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehiclePerformanceCache` ADD CONSTRAINT `VehiclePerformanceCache_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformPerformanceSummary` ADD CONSTRAINT `PlatformPerformanceSummary_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelEvent` ADD CONSTRAINT `ChannelEvent_dealershipId_fkey` FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelEvent` ADD CONSTRAINT `ChannelEvent_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

