import type { ReactNode } from 'react';
import { Banner } from './Banner.tsx';

type Props = {
  tone: 'success' | 'error';
  children: ReactNode;
  onDismiss: () => void;
};

/** Shared result for an action that finishes away from the control that started it. */
export function FeedbackNotice({ tone, children, onDismiss }: Props) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
      <Banner variant={tone} onDismiss={onDismiss}>{children}</Banner>
    </div>
  );
}
