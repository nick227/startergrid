export type InvoiceLineItem = {
  description: string;
  quantity: number | null;
  unitCents: number | null;
  totalCents: number;
};

export type Invoice = {
  dealershipId: string;
  dealerLegalName: string;
  period: string;
  type: 'SETUP' | 'MONTHLY';
  lineItems: InvoiceLineItem[];
  totalCents: number;
  generatedAt: string;
};

export type SetupInvoiceStats = {
  readinessRunCount: number;
  artifactCount: number;
  activePlatformCount: number;
  latestProofPath: string | null;
};

export type MonthlyInvoiceStats = {
  activePlatformCount: number;
  leadCount: number;
  vehicleUpdateCount: number;
  latestProofPath: string | null;
};

export type SubscriptionRef = {
  plan: string;
  setupFeeCents: number;
  monthlyFeeCents: number;
};

// ── Pure computation — testable without DB ───────────────────────────────────

export function computeSetupInvoice(
  dealershipId: string,
  dealerLegalName: string,
  subscription: SubscriptionRef,
  stats: SetupInvoiceStats,
  period: string
): Invoice {
  const lineItems: InvoiceLineItem[] = [
    {
      description: `Platform readiness assessment — ${stats.readinessRunCount} run${stats.readinessRunCount !== 1 ? 's' : ''}, ${stats.artifactCount} artifact${stats.artifactCount !== 1 ? 's' : ''}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    },
    {
      description: `Platform activation — ${stats.activePlatformCount} platform${stats.activePlatformCount !== 1 ? 's' : ''} submitted`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    }
  ];

  if (stats.latestProofPath) {
    lineItems.push({
      description: `Proof folder export — ${stats.latestProofPath}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    });
  }

  lineItems.push({
    description: `Setup fee — ${subscription.plan}`,
    quantity: 1,
    unitCents: subscription.setupFeeCents,
    totalCents: subscription.setupFeeCents
  });

  return {
    dealershipId,
    dealerLegalName,
    period,
    type: 'SETUP',
    lineItems,
    totalCents: subscription.setupFeeCents,
    generatedAt: new Date().toISOString()
  };
}

export function computeMonthlyInvoice(
  dealershipId: string,
  dealerLegalName: string,
  subscription: SubscriptionRef,
  stats: MonthlyInvoiceStats,
  period: string
): Invoice {
  const lineItems: InvoiceLineItem[] = [
    {
      description: `Monthly managed services — ${subscription.plan}`,
      quantity: 1,
      unitCents: subscription.monthlyFeeCents,
      totalCents: subscription.monthlyFeeCents
    },
    {
      description: `Active platforms this period: ${stats.activePlatformCount}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    },
    {
      description: `Leads captured this period: ${stats.leadCount}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    },
    {
      description: `Inventory updates this period: ${stats.vehicleUpdateCount}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    }
  ];

  if (stats.latestProofPath) {
    lineItems.push({
      description: `Proof folder reference — ${stats.latestProofPath}`,
      quantity: null,
      unitCents: null,
      totalCents: 0
    });
  }

  return {
    dealershipId,
    dealerLegalName,
    period,
    type: 'MONTHLY',
    lineItems,
    totalCents: subscription.monthlyFeeCents,
    generatedAt: new Date().toISOString()
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Parse YYYY-MM period string into start/end Date range for DB queries
export function periodToDateRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // exclusive upper bound
  return { start, end };
}
