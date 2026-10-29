-- Additive: existing vehicle and unassigned leads are unchanged.
ALTER TABLE `Lead` ADD COLUMN `categoryItemId` VARCHAR(191) NULL;
CREATE INDEX `Lead_categoryItemId_idx` ON `Lead`(`categoryItemId`);
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_categoryItemId_fkey`
  FOREIGN KEY (`categoryItemId`) REFERENCES `CategoryInventoryItem`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
