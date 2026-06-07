import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { QueueListPanel } from '@/components/queue/QueueListPanel.tsx';

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
  return (
    <QueueListPanel
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      platformSlug={platformSlug}
      platformName={platformName}
      showBackLink
    />
  );
}
