-- Add codeVerifier column to OAuthState for PKCE flows (e.g. X OAuth2)
ALTER TABLE `OAuthState` ADD COLUMN `codeVerifier` VARCHAR(256) NULL;
