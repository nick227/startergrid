/*
  Warnings:

  - You are about to drop the column `categoryItemId` on the `marketplacelisting` table. All the data in the column will be lost.
  - You are about to drop the `categoryinventoryitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categoryinventoryitemmedia` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `vehicleId` on table `marketplacelisting` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `categoryinventoryitem` DROP FOREIGN KEY `CategoryInventoryItem_dealershipId_fkey`;

-- DropForeignKey
ALTER TABLE `categoryinventoryitemmedia` DROP FOREIGN KEY `CategoryInventoryItemMedia_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `marketplacelisting` DROP FOREIGN KEY `MarketplaceListing_categoryItemId_fkey`;

-- DropForeignKey
ALTER TABLE `marketplacelisting` DROP FOREIGN KEY `MarketplaceListing_vehicleId_fkey`;

-- DropIndex
DROP INDEX `MarketplaceListing_categoryItemId_idx` ON `marketplacelisting`;

-- DropIndex
DROP INDEX `MarketplaceListing_categoryItemId_platformSlug_key` ON `marketplacelisting`;

-- AlterTable
ALTER TABLE `marketplacelisting` DROP COLUMN `categoryItemId`,
    MODIFY `vehicleId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `categoryinventoryitem`;

-- DropTable
DROP TABLE `categoryinventoryitemmedia`;

-- AddForeignKey
ALTER TABLE `MarketplaceListing` ADD CONSTRAINT `MarketplaceListing_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
