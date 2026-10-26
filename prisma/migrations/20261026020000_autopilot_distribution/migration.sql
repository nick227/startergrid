-- CreateTable
CREATE TABLE `AutopilotPolicy` (
    `dealershipId` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(12) NOT NULL DEFAULT 'OFF',
    `version` INTEGER NOT NULL DEFAULT 1,
    `includedChannels` JSON NOT NULL,
    `excludedVehicleIds` JSON NOT NULL,
    `safeguards` JSON NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`dealershipId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributionTarget` (
    `id` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(80) NOT NULL,
    `generation` INTEGER NOT NULL DEFAULT 1,
    `desiredHash` VARCHAR(64) NOT NULL,
    `snapshot` JSON NOT NULL,
    `operation` VARCHAR(16) NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `reasonCode` VARCHAR(80) NULL,
    `nextAction` TEXT NULL,
    `owner` VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `evidence` JSON NULL,
    `verifiedSnapshot` JSON NULL,
    `approvedHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DistributionTarget_dealershipId_status_idx`(`dealershipId`, `status`),
    INDEX `DistributionTarget_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    UNIQUE INDEX `distribution_target_scope`(`dealershipId`, `vehicleId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributionIncident` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `dealershipId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(80) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `batchId` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `reasonCode` VARCHAR(80) NOT NULL,
    `severity` VARCHAR(16) NOT NULL,
    `businessImpact` TEXT NOT NULL,
    `owner` VARCHAR(30) NOT NULL,
    `ownerId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `nextAction` TEXT NOT NULL,
    `technicalEvidence` JSON NOT NULL,
    `state` VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    `verificationState` VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistributionIncident_key_key`(`key`),
    INDEX `DistributionIncident_dealershipId_state_idx`(`dealershipId`, `state`),
    INDEX `DistributionIncident_targetId_idx`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
