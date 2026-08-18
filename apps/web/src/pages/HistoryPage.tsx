import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { InlineCallout } from '@/components/operator';
import { Button } from '@/components/ui/Button.tsx';

type Props = OperatorPageBaseProps;

export default function HistoryPage({ nav }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-orange-200 bg-orange-50">
        <InlineCallout title="Legacy View" tone="warning">
          <p className="text-sm mt-1 mb-3">
            This page is deprecated. Publish and sync history now lives under the "Audit Log" tab on Home,
            or per-platform under Platforms.
          </p>
          <div className="flex gap-3">
            <Button size="sm" variant="primary" onClick={() => nav.goToHome()}>Go to Home Dashboard</Button>
            <Button size="sm" variant="secondary" onClick={() => nav.goToPlatforms()}>Go to Platforms</Button>
          </div>
        </InlineCallout>
      </div>
      <div className="flex-1 min-h-[400px] bg-white" />
    </div>
  );
}
