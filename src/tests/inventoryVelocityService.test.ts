import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateSuggestedPrice,
  getInventoryVelocity,
} from '../services/inventory/inventoryVelocityService.js';
import type { PrismaClient } from '@prisma/client';

describe('Inventory Velocity Service', () => {
  it('calculateSuggestedPrice returns MONITOR for fresh vehicles (0-14 days)', () => {
    const res = calculateSuggestedPrice(2500000, 2500000, 'FRESH', 5, 12);
    assert.equal(res.recommendationAction, 'MONITOR');
    assert.equal(res.suggestedPriceCents, null);
    assert.match(res.recommendationReason, /Fresh intake/i);
  });

  it('calculateSuggestedPrice recommends ADD_PHOTOS for 15-29 day vehicles with low photos', () => {
    const res = calculateSuggestedPrice(2500000, 2500000, 'REVIEW', 18, 3);
    assert.equal(res.recommendationAction, 'ADD_PHOTOS');
    assert.equal(res.suggestedPriceCents, null);
    assert.match(res.recommendationReason, /Upload 8\+ photos/i);
  });

  it('calculateSuggestedPrice recommends MONITOR_ENGAGEMENT for 15-29 day vehicles with ample photos', () => {
    const res = calculateSuggestedPrice(2500000, 2500000, 'REVIEW', 20, 10);
    assert.equal(res.recommendationAction, 'MONITOR_ENGAGEMENT');
    assert.equal(res.suggestedPriceCents, null);
  });

  it('calculateSuggestedPrice prevents repricing if price changed within 7 days', () => {
    const res = calculateSuggestedPrice(2500000, 2500000, 'AGING', 3, 10);
    assert.equal(res.recommendationAction, 'RECENTLY_ADJUSTED');
    assert.equal(res.suggestedPriceCents, null);
    assert.match(res.recommendationReason, /Price adjusted 3 days ago/i);
  });

  it('calculateSuggestedPrice calculates ~1.5% adjustment ending in $95 for AGING milestone', () => {
    // Current price $25,000 (2,500,000 cents)
    // 1.5% markdown is $375 -> target raw $24,625
    // Rounded to 95 ending: $24,595 (2,459,500 cents)
    const res = calculateSuggestedPrice(2500000, 2500000, 'AGING', 32, 10);
    assert.equal(res.recommendationAction, 'SUGGEST_PRICE_ADJUSTMENT');
    assert.ok(res.suggestedPriceCents);
    assert.ok(res.suggestedPriceCents < 2500000);
    assert.equal(res.suggestedPriceCents % 10000, 9500); // ends in 95 dollars
    assert.ok(res.suggestedMarkdownPercent && res.suggestedMarkdownPercent > 1 && res.suggestedMarkdownPercent < 3);
  });

  it('calculateSuggestedPrice calculates ~3.0% adjustment ending in $95 for CRITICAL milestone', () => {
    // Current price $30,000 (3,000,000 cents)
    // 3.0% markdown is $900 -> target raw $29,100
    // Rounded to 95 ending: $29,095 (2,909,500 cents)
    const res = calculateSuggestedPrice(3000000, 3000000, 'CRITICAL', 50, 10);
    assert.equal(res.recommendationAction, 'CRITICAL_PRICE_ADJUSTMENT');
    assert.ok(res.suggestedPriceCents);
    assert.ok(res.suggestedPriceCents < 3000000);
    assert.equal(res.suggestedPriceCents % 10000, 9500);
    assert.ok(res.suggestedMarkdownPercent && res.suggestedMarkdownPercent >= 2.5);
  });

  it('calculateSuggestedPrice enforces safeguards against severe drops and minimum floor', () => {
    // Price near floor $600 (60,000 cents)
    const res = calculateSuggestedPrice(60000, 60000, 'CRITICAL', 60, 10);
    assert.ok(res.suggestedPriceCents);
    assert.ok(res.suggestedPriceCents >= 50000); // Cannot drop below $500 floor
  });

  it('getInventoryVelocity aggregates milestones and computes capital at risk', async () => {
    const now = Date.now();
    const dayMs = 86400000;

    const mockVehicles = [
      {
        id: 'v1',
        stockNumber: 'STK-01',
        vin: 'VIN01',
        year: 2023,
        make: 'Toyota',
        model: 'RAV4',
        trim: 'LE',
        mileage: 15000,
        priceCents: 2800000,
        originalPriceCents: 2800000,
        createdAt: new Date(now - 5 * dayMs), // Fresh (5d)
        priceLastChangedAt: null,
        media: [{ id: 'm1' }, { id: 'm2' }],
      },
      {
        id: 'v2',
        stockNumber: 'STK-02',
        vin: 'VIN02',
        year: 2021,
        make: 'Ford',
        model: 'F-150',
        trim: 'XLT',
        mileage: 45000,
        priceCents: 3500000,
        originalPriceCents: 3500000,
        createdAt: new Date(now - 22 * dayMs), // Review (22d)
        priceLastChangedAt: null,
        media: [],
      },
      {
        id: 'v3',
        stockNumber: 'STK-03',
        vin: 'VIN03',
        year: 2020,
        make: 'Honda',
        model: 'Civic',
        trim: 'EX',
        mileage: 55000,
        priceCents: 1900000,
        originalPriceCents: 1900000,
        createdAt: new Date(now - 38 * dayMs), // Aging (38d)
        priceLastChangedAt: null,
        media: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }, { id: 'm4' }, { id: 'm5' }, { id: 'm6' }, { id: 'm7' }, { id: 'm8' }],
      },
      {
        id: 'v4',
        stockNumber: 'STK-04',
        vin: 'VIN04',
        year: 2019,
        make: 'Chevrolet',
        model: 'Equinox',
        trim: 'LT',
        mileage: 68000,
        priceCents: 1600000,
        originalPriceCents: 1600000,
        createdAt: new Date(now - 52 * dayMs), // Critical (52d)
        priceLastChangedAt: null,
        media: [{ id: 'm1' }],
      },
    ];

    const mockDb = {
      vehicle: {
        findMany: async () => mockVehicles,
      },
    } as unknown as PrismaClient;

    const res = await getInventoryVelocity(mockDb, 'dealer_123');
    assert.equal(res.summary.totalInStock, 4);
    assert.equal(res.summary.freshCount, 1);
    assert.equal(res.summary.reviewCount, 1);
    assert.equal(res.summary.agingCount, 1);
    assert.equal(res.summary.criticalCount, 1);
    // Capital at risk is aging ($19,000) + critical ($16,000) = $35,000 (3,500,000 cents)
    assert.equal(res.summary.totalCapitalAtRiskCents, 3500000);
    assert.equal(res.summary.totalInventoryValueCents, 9800000);
    assert.ok(res.summary.averageDaysOnLot >= 28 && res.summary.averageDaysOnLot <= 31);
    assert.equal(res.vehicles.length, 4);

    const agingVeh = res.vehicles.find(v => v.stockNumber === 'STK-03');
    assert.ok(agingVeh);
    assert.equal(agingVeh.milestone, 'AGING');
    assert.equal(agingVeh.recommendationAction, 'SUGGEST_PRICE_ADJUSTMENT');

    const reviewVeh = res.vehicles.find(v => v.stockNumber === 'STK-02');
    assert.ok(reviewVeh);
    assert.equal(reviewVeh.milestone, 'REVIEW');
    assert.equal(reviewVeh.recommendationAction, 'ADD_PHOTOS');
  });
});
