/** @deprecated Legacy route — redirects to Platforms. */
import { useEffect } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';

type Props = OperatorPageBaseProps;

export default function SyncPage({ nav }: Props) {
  useEffect(() => {
    nav.goToPlatforms();
  }, [nav]);
  return null;
}
