/** @deprecated Legacy route — redirects to Platforms (account setup lives in channel drawer). */
import { useEffect } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';

type Props = OperatorPageBaseProps;

export default function AccountManagementPage({ nav }: Props) {
  useEffect(() => {
    nav.goToPlatforms();
  }, [nav]);
  return null;
}
