-- PlatformAccount.dealerEnabled and autoSyncReadyInventory exist in schema.prisma
-- (fb15345) but were never migrated. Default false would disable every existing
-- account, so backfill matches resolveDealerPlatformEnabled(null, desiredChannels, slug)
-- plus the consumer-marketplace always-on seed.

ALTER TABLE `PlatformAccount`
  ADD COLUMN `dealerEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `autoSyncReadyInventory` BOOLEAN NOT NULL DEFAULT false;

UPDATE `PlatformAccount` AS `pa`
INNER JOIN `DealershipProfile` AS `dp` ON `dp`.`id` = `pa`.`dealershipId`
SET `pa`.`dealerEnabled` = TRUE
WHERE `pa`.`platformSlug` = 'consumer-marketplace'
   OR JSON_CONTAINS(`dp`.`desiredChannels`, JSON_QUOTE(`pa`.`platformSlug`));

UPDATE `PlatformAccount`
SET `autoSyncReadyInventory` = TRUE
WHERE `platformSlug` = 'consumer-marketplace';
