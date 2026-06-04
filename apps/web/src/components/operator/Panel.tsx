import { Skeleton } from '../ui/Skeleton.tsx';
import { ErrorState } from './ErrorState.tsx';
import { SectionCard } from './SectionCard.tsx';

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  skeletonRows?: number;
  children: React.ReactNode;
};

export function Panel({
  title,
  subtitle,
  action,
  loading,
  error,
  onRetry,
  skeletonRows = 4,
  children,
}: Props) {
  return (
    <SectionCard title={title} subtitle={subtitle} action={action} noPadding>
      {error && onRetry ? (
        <ErrorState compact message={error} onRetry={onRetry} label={title} />
      ) : null}
      {!error && loading && !children ? (
        <Skeleton rows={skeletonRows} />
      ) : (
        children
      )}
    </SectionCard>
  );
}
