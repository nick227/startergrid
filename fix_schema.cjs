const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const missingBlock = `
  REPORTED_VIEW
  REPORTED_CONTACT
}

enum SourceConfidence {
  OBSERVED_FIRST_PARTY
  PLATFORM_REPORTED
  MANUAL_IMPORTED
  UNAVAILABLE
}

enum VehicleUpdateKind {
  PRICE_CHANGE
  PHOTO_CHANGE
  SOLD
  REMOVED
  RELISTED
  DETAILS_CHANGE
}

enum Environment {
  MOCK
  SANDBOX
  PRODUCTION
}

// ─── Auth enums and models ────────────────────────────────────────────────────

enum OperatorRole {
  SUPER_ADMIN     // Full platform access; no dealer scoping restrictions
  OPERATOR        // Platform access scoped to assigned dealerships
  DEALER_OPERATOR // Read-only access to own dealership data (Phase D — defined now for schema stability)
}

model OperatorAccount {
  id           String       @id @default(cuid())
  email        String       @unique @db.VarChar(255)
  passwordHash String       @db.VarChar(255)
  role         OperatorRole @default(OPERATOR)
  isActive     Boolean      @default(true)
  avatarUrl    String?      @db.VarChar(512)
  lastLoginAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  sessions     OperatorSession[]
  dealerAccess OperatorDealerAccess[]
}

model OperatorDealerAccess {
  id                String   @id @default(cuid())
  operatorAccountId String
  dealershipId      String
  grantedAt         DateTime @default(now())
  grantedBy         String   @db.VarChar(30) // OperatorAccount.id of the granting account (audit only, loose ref)

  operator   OperatorAccount   @relation(fields: [operatorAccountId], references: [id], onDelete: Cascade)
  dealership DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)

  @@unique([operatorAccountId, dealershipId])
  @@index([operatorAccountId])
  @@index([dealershipId])
}

model OperatorSession {
  id                String    @id @default(cuid())
  tokenHash         String    @unique @db.VarChar(64) // SHA-256 hex of the raw opaque token
  operatorAccountId String
  createdAt         DateTime  @default(now())
  expiresAt         DateTime
  revokedAt         DateTime?
  ipAddress         String?   @db.VarChar(45)
  userAgent         String?   @db.VarChar(255)

  account OperatorAccount @relation(fields: [operatorAccountId], references: [id], onDelete: Cascade)

  @@index([operatorAccountId])
  @@index([expiresAt])
}

// Append-only log of privileged admin actions. Actor is a loose ref (audit rows
// must survive account deletion). Detail holds sanitized summaries only —
// never secrets or raw provider responses.
model AdminAuditLog {
  id         String   @id @default(cuid())
  action     String   @db.VarChar(80)
  actorId    String   @db.VarChar(30)
  actorEmail String   @db.VarChar(255)
  detail     Json?
  createdAt  DateTime @default(now())

  @@index([action, createdAt])
}

// ─── Marketplace user models ──────────────────────────────────────────────────
// Separate domain from operator auth. Tokens are not interchangeable.

model MarketplaceUser {
  id           String    @id @default(cuid())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @db.VarChar(255)
  displayName  String?   @db.VarChar(160)
  avatarUrl    String?   @db.VarChar(512)
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  sessions  MarketplaceSession[]
  favorites MarketplaceFavorite[]
}

model MarketplaceSession {
  id                String    @id @default(cuid())
  tokenHash         String    @unique @db.VarChar(64) // SHA-256 hex of the raw opaque token
  marketplaceUserId String
  createdAt         DateTime  @default(now())
  expiresAt         DateTime
  revokedAt         DateTime?
  ipAddress         String?   @db.VarChar(45)
  userAgent         String?   @db.VarChar(255)

  user MarketplaceUser @relation(fields: [marketplaceUserId], references: [id], onDelete: Cascade)

  @@index([marketplaceUserId])
  @@index([expiresAt])
}

model MarketplaceFavorite {
  id                String   @id @default(cuid())
  marketplaceUserId String
  vehicleId         String   // Vehicle.id (listing ID only — VIN is never stored here)
  savedAt           DateTime @default(now())

  user    MarketplaceUser @relation(fields: [marketplaceUserId], references: [id], onDelete: Cascade)
  vehicle Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@unique([marketplaceUserId, vehicleId])
  @@index([marketplaceUserId])
}

// ─── Core models ─────────────────────────────────────────────────────────────

model DealershipProfile {
  id               String           @id @default(cuid())
  legalName        String           @db.VarChar(160)
  dbaName          String?          @db.VarChar(160)
  logoUrl          String?          @db.VarChar(512)
  businessCategory BusinessCategory @default(AUTOMOTIVE)
  dealerLicense    String?          @db.VarChar(80)
  rooftopAddress  Json
  rooftopLat      Float?
  rooftopLng      Float?
  websiteUrl      String?  @db.VarChar(255)
  primaryContact  Json
  inventorySize   Int?
  desiredChannels Json
  documents       Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  vehicles                     Vehicle[]
  applications                 PlatformApplication[]
  leads                        Lead[]
  vehicleUpdates               VehicleUpdate[]
  vehicleLifecycleEvents       VehicleLifecycleEvent[]
  subscription                 DealerSubscription?
  inventorySnapshots           InventorySnapshot[]
  readinessRuns                ReadinessRun[]
  generatedArtifacts           GeneratedArtifact[]
  credentialRefs               PlatformCredentialRef[]
  notifications                DealerNotification[]
  platformSecrets              PlatformSecret[]
  syncPolicies                 SyncPolicy[]`;

// We have REPORTED_CLICK right before the break.
const prefix = schemaContent.substring(0, schemaContent.indexOf('REPORTED_CLICK') + 'REPORTED_CLICK'.length);
// The rest is publishQueue and below.
const suffix = schemaContent.substring(schemaContent.indexOf('publishQueue                 PublishQueueItem[]'));

const fixedContent = prefix + missingBlock + '\n  ' + suffix;

fs.writeFileSync(schemaPath, fixedContent);
console.log('Schema fixed!');
