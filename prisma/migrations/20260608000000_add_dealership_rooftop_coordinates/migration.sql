-- Add nullable rooftop coordinates to DealershipProfile.
-- Populated later by geocoding backfill (GEO-00b) after provider is chosen.
-- Not exposed in public marketplace API until GEO-01 radius search ships.
ALTER TABLE `DealershipProfile`
    ADD COLUMN `rooftopLat` DOUBLE NULL,
    ADD COLUMN `rooftopLng` DOUBLE NULL;
