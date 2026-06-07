import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HistoryListPanel } from '@/components/history/HistoryListPanel.tsx';

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
  return (
    <HistoryListPanel
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      platformSlug={platformSlug}
      platformName={platformName}
      showBackLink
    />
  );
}
