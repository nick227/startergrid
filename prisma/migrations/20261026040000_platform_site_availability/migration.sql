-- Remaining drift after 20261026030000 on a migrate-deploy database:
-- PlatformSiteAvailability was never created, and Lead.updatedAt kept a
-- DEFAULT from the additive ALTER that schema.prisma (@updatedAt, no @default)
-- does not declare. MODIFY (not ALTER COLUMN DROP DEFAULT) is required on MariaDB.

ALTER TABLE `Lead` MODIFY `updatedAt` DATETIME(3) NOT NULL;

CREATE TABLE `PlatformSiteAvailability` (
    `platformSlug` VARCHAR(80) NOT NULL,
    `siteEnabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(255) NULL,

    PRIMARY KEY (`platformSlug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
