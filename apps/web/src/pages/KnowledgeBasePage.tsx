import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HelpContent } from '@/components/docs/HelpContent.tsx';

type StandaloneProps = {
  dealerId?: never;
  nav?: never;
  onBack?: () => void;
};

type OperatorProps = OperatorPageBaseProps & {
  onBack?: never;
};

type Props = StandaloneProps | OperatorProps;


export default function KnowledgeBasePage(props: Props) {
  if ('dealerId' in props && props.dealerId && props.nav) {
    const { dealerId, nav, activeTab } = props;
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} hideDealerId sectionLabel="Help">
        <HelpContent />
      </OperatorPage>
    );
  }

  const onBack = 'onBack' in props ? props.onBack : undefined;

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <HelpContent onBack={onBack} />
      </main>
    </div>
  );
}
