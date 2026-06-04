import { PageShell } from './PageShell.tsx';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';

type Props = OperatorPageBaseProps & {
  dealerName?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
  headerAction?: React.ReactNode;
  footerPad?: boolean;
  hideDealerId?: boolean;
  children: React.ReactNode;
};

export function OperatorPage({
  dealerId,
  dealerName,
  activeTab,
  nav,
  onRefresh,
  refreshing,
  lastRefresh,
  headerAction,
  footerPad,
  hideDealerId,
  children,
}: Props) {
  return (
    <PageShell
      dealerId={dealerId}
      dealerName={dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={onRefresh}
      refreshing={refreshing}
      lastRefresh={lastRefresh}
      headerAction={headerAction}
      footerPad={footerPad}
      hideDealerId={hideDealerId}
    >
      {children}
    </PageShell>
  );
}
