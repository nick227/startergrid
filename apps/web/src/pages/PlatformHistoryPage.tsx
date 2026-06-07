import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HistoryListPanel } from '@/components/history/HistoryListPanel.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

type Props = OperatorPageBaseProps & {
  platformSlug: string;
  platformName?: string;
};

export default function PlatformHistoryPage({
  dealerId,
  nav,
  activeTab,
  platformSlug,
  platformName,
}: Props) {
  const { route } = useOperatorRoute();
  return (
    <HistoryListPanel
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      platformSlug={platformSlug}
      platformName={platformName}
      showBackLink
      initialAssetRef={route.assetRef ?? undefined}
    />
  );
}
