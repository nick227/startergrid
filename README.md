# 🚗 Auto Dealer Sales Portal

> **A centralized "DistroKid for Auto Dealerships"—manage, syndicate, and compare inventory across 31+ online platforms from a single hub.**

The Auto Dealer Sales Portal is a pragmatic, integration-first utility built specifically for automotive inventory. Dealerships today struggle with fragmented online platforms. Our platform acts as a unified hub: you connect a dealership's inventory once, and we handle the validation, VIN decoding, and automated syndication to every major advertising channel and marketplace.

---

## 🌟 Executive Summary

**The Core Utility:** Auto dealerships need a centralized place to manage their online sales presence without constantly logging into different portals. We built a system heavily integrated with auto-specific standards (including rigorous VIN validation and decoding) to standardize inventory data and push it out securely.

**Pragmatic Operations:** We ingest messy Dealer Management System (DMS) data, standardize it to a canonical auto schema, run pre-flight validation against platform-specific rules, and automatically route it to 31+ distinct platforms. While the platform is extensible to other verticals, its core DNA and included marketplaces are explicitly designed around automotive inventory.

---

## 📈 Platform Value & Investor Highlights

- **The "DistroKid" Model for Dealerships:** By supporting 31+ platforms out-of-the-box (including Google, Meta, TikTok, CarGurus, and Cars.com), we provide a centralized distribution network. Dealers upload once, and we handle the complex endpoint requirements everywhere else.
- **Unified Inventory & Marketplace:** The entire stack is deeply integrated with auto data—from strict VIN decoding to our own first-party consumer marketplace designed exclusively for vehicle shopping.
- **Actionable Performance Intelligence:** We ingest return signals (leads, clicks, impressions) from the distributed platforms to create a feedback loop. Dealers can directly compare platform effectiveness and understand inventory movement against local benchmarks.
- **Enterprise-Ready Infrastructure:** Built on a strict, scalable modern TypeScript stack (**Node 22, Prisma 6, Fastify**) utilizing Role-Based Access Control (RBAC) to ensure dealer data is strictly siloed and secure.

---

## 🤝 Dealership Value Proposition

- **Centralized Management:** A single dashboard to monitor exactly where vehicles are listed, which platforms are healthy, and where data errors (like missing photos or pricing issues) need fixing.
- **Stop Guessing on Spend:** Performance Intelligence embedded in the portal allows dealers to compare the ROI of different platforms and adjust their ad spend based on actual local benchmarks.
- **Automated Heavy Lifting:** Dealers no longer have to format CSVs for 30 different platforms. We handle all platform-specific formatting, validation rules, and endpoint error handling.

---

## 🏗️ The Platform Ecosystem

Our ecosystem is split into purpose-built applications tailored to specific users:

### ⚙️ 1. Sync Engine (`src/`)
**Target User:** Backend / System Pipelines
**Live API Health:** [https://auto-dealer-operator-ui-production.up.railway.app/api/health](https://auto-dealer-operator-ui-production.up.railway.app/api/health)
*The Brains of the Operation.* The core data pipeline that ingests inventory, standardizes it, validates readiness across 31 platforms, and generates exact feed artifacts.

### 🛠️ 2. Operator Platform (`apps/web/`)
**Target User:** Internal Team (Operators)
**Live Portal:** [https://auto-dealer-operator-ui-production.up.railway.app/app/](https://auto-dealer-operator-ui-production.up.railway.app/app/)
*Mission Control.* The primary interface for our internal operations team to manage dealership accounts, oversee onboarding, monitor global sync health, and manage API credentials securely.

### 🏢 3. Dealership Platform
**Target User:** Client Dealerships
**Live Portal:** [https://auto-dealer-operator-ui-production.up.railway.app/app/](https://auto-dealer-operator-ui-production.up.railway.app/app/)
*The Dealer's Command Center.* A dedicated portal empowering dealers to manage their specific inventory, track sales, resolve missing data, and view their Performance Intelligence directly.

### 🛍️ 4. Consumer Marketplace (`apps/marketplace/`)
**Target User:** Car Buyers / Consumers
**Live Marketplace:** [https://auto-dealer-operator-ui-production.up.railway.app/marketplace/](https://auto-dealer-operator-ui-production.up.railway.app/marketplace/)
*The Aggregated Showroom.* A comprehensive, multi-dealer marketplace that allows consumers to search our entire connected inventory network.

### 🛒 5. Auto-Specific Carvana Clone
**Target User:** Car Buyers / Consumers (Digital Retailing)
**Live Experience:** [https://auto-dealer-operator-ui-production.up.railway.app/marketplace/](https://auto-dealer-operator-ui-production.up.railway.app/marketplace/)
*The Future of Online Buying.* A specialized consumer-facing front-end providing a fully digital, end-to-end car buying and financing experience.

### 🚀 6. Splash UI (`apps/splash/`)
**Target User:** Prospects / General Public
**Live Site:** [https://auto-dealer-operator-ui-production.up.railway.app/](https://auto-dealer-operator-ui-production.up.railway.app/)
*The Front Door.* A highly optimized marketing landing page designed to drive awareness, capture leads, and acquire new dealership clients.

---

## 🌐 Our Unrivaled Reach: 31 Supported Platforms

*We maximize visibility by pushing inventory to every corner of the internet.*

### 🏠 Owned (2)
- **Dealer Storefront:** White-label web feeds powering dealer-branded sites.
- **Auto Marketplace:** Our first-party marketplace index. Strict eligibility (soldAt null, priceCents > 0) with zero internal/VIN data exposure.

### 📡 Feedable (16)
*Active, automated inventory syndication.*
- **Search & Local:** Google Vehicle Ads, Microsoft Advertising Automotive Ads, Google Business Profile, Apple Business Location Publishing, Nextdoor Ads API.
- **Social & Discovery:** Meta Automotive Inventory Ads, TikTok Automotive Ads, TikTok Shop, Pinterest Shopping Ads Catalogs, Reddit Dynamic Product Ads, Snapchat Dynamic Product Ads, X Dynamic Product Ads, LinkedIn Lead Gen Forms.
- **Marketplaces:** eBay Motors, Facebook Marketplace, Facebook Business Page.

### 🤝 Assisted (11)
*Platforms where we manage partner-assisted feeds and onboarding.*
- **Major Automotive:** CarGurus Dealer Marketplace, Autotrader / Cox Automotive, Cars.com / Cars Commerce, TrueCar Dealer Network, CARFAX for Dealers.
- **Specialty/Powersports:** RV Trader, Cycle Trader, ATV Trader, Trailer Trader, Boat Trader, YachtWorld, Boats.com.

### 🔗 Partner-dependent (2)
*Platforms reliant on external CRM routing.*
- **TrueCar Dealer Network:** Portal/support-assisted setup.
- **ADF/XML Lead Routing:** Industry-standard payload routing for CRM endpoints.

---

## ⚡ Quick Start (For Developers)

```bash
npm install

# Copy and edit .env (MySQL credentials)
cp .env.example .env

# Apply migrations, then seed platform profiles + demo dealers
npm run db:migrate
npm run db:seed

# Full pipeline reset — use this to verify everything works!
npm run demo:reset
```

**After running `demo:reset`:**
✅ Core platforms evaluated and marked GREEN
✅ Feed artifacts successfully written to `./exports/`
✅ Proof folder manifest built
✅ `poc:green`, `poc:risk`, and `poc:portal` all pass

---

## 💻 Local Development Environment

When running the full local stack via `npm run dev:all`, multiple UIs and the backend API start concurrently:

- 🟢 **API Server** (`http://localhost:3000`)
- 🔵 **Operator Platform** (`http://localhost:5173`)
- 🟠 **Dealership Platform**
- 🟣 **Consumer Marketplace / Carvana Clone** (`http://localhost:5174`)
- 🟡 **Splash UI** (`http://localhost:5175`)

To start all of these simultaneously:
```bash
npm run dev:all
```

Alternatively, to run just the API and Operator Console:
```bash
npm run server:start
npm run ui:dev

# Run Tests and Typecheck
npm test
npm run typecheck
```

---

## 📚 Deep Dive Documentation

- 📖 `docs/handoff.md` - **Start here.** Current state, setup, architecture.
- 🎯 `docs/mvp-scope-and-milestones.md` - Milestones and revenue validation.
- 💼 `docs/go-to-market-playbook.md` - Sales motion and ICP.
- 💰 `docs/pricing-and-unit-economics.md` - Revenue model and financial projections.
