import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { QueueListPanel } from '@/components/queue/QueueListPanel.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

type Props = OperatorPageBaseProps & {
  platformSlug: string;
  platformName?: string;
};

export default function PlatformQueuePage({
  dealerId,
  nav,
  activeTab,
  platformSlug,
  platformName,
}: Props) {
  const { route } = useOperatorRoute();
  return (
    <QueueListPanel
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
