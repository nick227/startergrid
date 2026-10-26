-- V5 dealership record, onboarding, access, lead workflow

-- Expand OperatorRole before any data rewrite
ALTER TABLE `OperatorAccount`
  MODIFY COLUMN `role` ENUM(
    'SUPER_ADMIN',
    'OPERATOR',
    'DEALER_OPERATOR',
    'DEALER_OWNER',
    'DEALER_STAFF',
    'INTERNAL_SUPPORT'
  ) NOT NULL DEFAULT 'OPERATOR';

ALTER TABLE `OperatorAccount`
  ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `firstLoginAt` DATETIME(3) NULL,
  ADD COLUMN `suspendedAt` DATETIME(3) NULL;

ALTER TABLE `OperatorDealerAccess`
  ADD COLUMN `accessRole` ENUM('DEALER_OWNER', 'DEALER_STAFF', 'INTERNAL_SUPPORT')
    NOT NULL DEFAULT 'INTERNAL_SUPPORT';

ALTER TABLE `DealershipProfile`
  ADD COLUMN `primaryContactEmail` VARCHAR(255) NULL,
  ADD COLUMN `lifecycleStatus` ENUM('DRAFT', 'SETTING_UP', 'READY_TO_LAUNCH', 'ACTIVE', 'PAUSED', 'ARCHIVED')
    NOT NULL DEFAULT 'SETTING_UP',
  ADD COLUMN `internalOwnerId` VARCHAR(30) NULL,
  ADD COLUMN `waitingForStock` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `autopilotPreference` ENUM('OFF', 'ON', 'PAUSED') NOT NULL DEFAULT 'OFF',
  ADD COLUMN `setupVersion` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `launchCompletedAt` DATETIME(3) NULL,
  ADD COLUMN `handoffCompletedAt` DATETIME(3) NULL,
  ADD COLUMN `handoffCompletedBy` VARCHAR(30) NULL;

CREATE INDEX `DealershipProfile_lifecycleStatus_idx` ON `DealershipProfile`(`lifecycleStatus`);
CREATE INDEX `DealershipProfile_primaryContactEmail_idx` ON `DealershipProfile`(`primaryContactEmail`);
CREATE INDEX `DealershipProfile_internalOwnerId_idx` ON `DealershipProfile`(`internalOwnerId`);
CREATE INDEX `DealershipProfile_legalName_idx` ON `DealershipProfile`(`legalName`);

ALTER TABLE `Lead`
  ADD COLUMN `workflowStatus` ENUM('NEW', 'CONTACTED', 'APPOINTMENT', 'SOLD', 'LOST') NOT NULL DEFAULT 'NEW',
  ADD COLUMN `assigneeOperatorId` VARCHAR(30) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `statusUpdatedAt` DATETIME(3) NULL,
  ADD COLUMN `statusUpdatedBy` VARCHAR(30) NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

CREATE INDEX `Lead_dealershipId_workflowStatus_idx` ON `Lead`(`dealershipId`, `workflowStatus`);

CREATE TABLE `DealershipOnboardingStep` (
  `id` VARCHAR(191) NOT NULL,
  `dealershipId` VARCHAR(191) NOT NULL,
  `stepKey` ENUM('CREATE', 'ACCESS', 'VEHICLES', 'CHANNELS', 'HANDOFF') NOT NULL,
  `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED', 'NEEDS_RECHECK') NOT NULL DEFAULT 'NOT_STARTED',
  `ownerKind` ENUM('YOU', 'OUR_TEAM', 'SYSTEM', 'PARTNER', 'DEALER') NOT NULL DEFAULT 'OUR_TEAM',
  `ownerOperatorId` VARCHAR(30) NULL,
  `incompleteReason` VARCHAR(255) NULL,
  `evidenceJson` JSON NULL,
  `completedAt` DATETIME(3) NULL,
  `completedBy` VARCHAR(30) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DealershipOnboardingStep_dealershipId_stepKey_key`(`dealershipId`, `stepKey`),
  INDEX `DealershipOnboardingStep_dealershipId_idx`(`dealershipId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OperatorInvitation` (
  `id` VARCHAR(191) NOT NULL,
  `dealershipId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `accessRole` ENUM('DEALER_OWNER', 'DEALER_STAFF', 'INTERNAL_SUPPORT') NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `acceptedByAccountId` VARCHAR(30) NULL,
  `revokedAt` DATETIME(3) NULL,
  `deliveryStatus` ENUM('PENDING', 'SENT', 'FAILED', 'EXPIRED', 'ACCEPTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
  `deliveryError` VARCHAR(255) NULL,
  `invitedBy` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `OperatorInvitation_tokenHash_key`(`tokenHash`),
  INDEX `OperatorInvitation_dealershipId_idx`(`dealershipId`),
  INDEX `OperatorInvitation_email_idx`(`email`),
  INDEX `OperatorInvitation_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DealershipActivityEvent` (
  `id` VARCHAR(191) NOT NULL,
  `dealershipId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(30) NOT NULL,
  `actorEmail` VARCHAR(255) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `detail` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `DealershipActivityEvent_dealershipId_createdAt_idx`(`dealershipId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DealershipOnboardingStep`
  ADD CONSTRAINT `DealershipOnboardingStep_dealershipId_fkey`
  FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OperatorInvitation`
  ADD CONSTRAINT `OperatorInvitation_dealershipId_fkey`
  FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DealershipActivityEvent`
  ADD CONSTRAINT `DealershipActivityEvent_dealershipId_fkey`
  FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Explicit role migration
UPDATE `OperatorAccount` SET `role` = 'INTERNAL_SUPPORT' WHERE `role` = 'OPERATOR';
UPDATE `OperatorAccount` SET `role` = 'DEALER_OWNER' WHERE `role` = 'DEALER_OPERATOR';

UPDATE `OperatorDealerAccess` a
  INNER JOIN `OperatorAccount` o ON o.id = a.operatorAccountId
  SET a.accessRole = CASE
    WHEN o.role IN ('DEALER_OWNER', 'DEALER_OPERATOR') THEN 'DEALER_OWNER'
    ELSE 'INTERNAL_SUPPORT'
  END;

UPDATE `DealershipProfile`
  SET `primaryContactEmail` = JSON_UNQUOTE(JSON_EXTRACT(`primaryContact`, '$.email'))
  WHERE `primaryContactEmail` IS NULL
    AND JSON_EXTRACT(`primaryContact`, '$.email') IS NOT NULL;

-- Existing rooftops stay Active so they are not forced through setup
UPDATE `DealershipProfile` SET `lifecycleStatus` = 'ACTIVE';
