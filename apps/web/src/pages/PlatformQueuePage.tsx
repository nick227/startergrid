import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { InlineCallout } from '@/components/operator';
import { Button } from '@/components/ui/Button.tsx';

type Props = OperatorPageBaseProps & {
  platformSlug: string;
  platformName?: string;
};

export default function PlatformQueuePage({
  nav,
  platformSlug,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-orange-200 bg-orange-50">
        <InlineCallout title="Legacy View" tone="warning">
          <p className="text-sm mt-1 mb-3">
            This legacy queue view is deprecated. Operational issues are now managed directly from the Platforms dashboard.
          </p>
          <div className="flex gap-3">
            <Button size="sm" variant="primary" onClick={() => nav.goToPlatformDetail(platformSlug)}>Manage Platform</Button>
            <Button size="sm" variant="secondary" onClick={() => nav.goToPlatforms()}>Back to all Platforms</Button>
          </div>
        </InlineCallout>
      </div>
      <div className="flex-1 min-h-[400px] bg-white" />
    </div>
  );
}
