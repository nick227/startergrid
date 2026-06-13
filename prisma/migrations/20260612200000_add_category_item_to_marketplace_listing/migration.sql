-- AlterTable: make vehicleId nullable on MarketplaceListing
ALTER TABLE `MarketplaceListing` MODIFY COLUMN `vehicleId` VARCHAR(191) NULL;

-- AlterTable: add categoryItemId FK column
ALTER TABLE `MarketplaceListing` ADD COLUMN `categoryItemId` VARCHAR(191) NULL;

-- CreateIndex: unique constraint for (categoryItemId, platformSlug)
CREATE UNIQUE INDEX `MarketplaceListing_categoryItemId_platformSlug_key`
  ON `MarketplaceListing`(`categoryItemId`, `platformSlug`);

-- CreateIndex: regular index on categoryItemId for FK lookups
CREATE INDEX `MarketplaceListing_categoryItemId_idx`
  ON `MarketplaceListing`(`categoryItemId`);

-- AddForeignKey: categoryItemId → CategoryInventoryItem
ALTER TABLE `MarketplaceListing`
  ADD CONSTRAINT `MarketplaceListing_categoryItemId_fkey`
  FOREIGN KEY (`categoryItemId`)
  REFERENCES `CategoryInventoryItem`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
