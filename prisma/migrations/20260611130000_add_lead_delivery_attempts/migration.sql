CREATE TABLE `LeadDeliveryAttempt` (
    `id`                 VARCHAR(191) NOT NULL,
    `leadId`             VARCHAR(191) NOT NULL,
    `dealershipId`       VARCHAR(191) NOT NULL,
    `destinationType`    ENUM('EMAIL', 'ADF_XML_EMAIL', 'JSON_WEBHOOK') NOT NULL,
    `destinationLabel`   VARCHAR(120) NOT NULL,
    `destinationAddress` VARCHAR(255) NOT NULL,
    `status`             ENUM('PENDING', 'SENT', 'FAILED', 'RETRYING', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `attemptCount`       INT NOT NULL DEFAULT 0,
    `nextAttemptAt`      DATETIME(3) NULL,
    `lastAttemptAt`      DATETIME(3) NULL,
    `deliveredAt`        DATETIME(3) NULL,
    `httpStatus`         INT NULL,
    `errorCode`          VARCHAR(80) NULL,
    `errorMessage`       VARCHAR(255) NULL,
    `payloadFormat`      ENUM('EMAIL_SUMMARY', 'ADF_XML_1_0', 'MARKETPLACE_LEAD_JSON_V1') NOT NULL,
    `payloadBody`        LONGTEXT NOT NULL,
    `payloadChecksum`    VARCHAR(64) NOT NULL,
    `createdAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3) NOT NULL,

    INDEX `LeadDeliveryAttempt_leadId_idx`(`leadId`),
    INDEX `LeadDeliveryAttempt_dealershipId_idx`(`dealershipId`),
    INDEX `LeadDeliveryAttempt_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LeadDeliveryAttempt` ADD CONSTRAINT `LeadDeliveryAttempt_leadId_fkey`
    FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LeadDeliveryAttempt` ADD CONSTRAINT `LeadDeliveryAttempt_dealershipId_fkey`
    FOREIGN KEY (`dealershipId`) REFERENCES `DealershipProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

