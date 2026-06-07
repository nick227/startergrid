import { useState, useEffect, useMemo } from 'react';
import { parseOperatorRoute, buildOperatorNav, normalizeOperatorHash } from '@/lib/routes.ts';
import type { OperatorRoute } from '@/lib/routes.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { tabFromPage } from '@/lib/operatorNav.ts';

export function useOperatorRoute(): {
  route: OperatorRoute;
  nav: OperatorNavHandlers | null;
  activeTab: ReturnType<typeof tabFromPage>;
  selectDealer: (id: string) => void;
} {
  const [route, setRoute] = useState<OperatorRoute>(parseOperatorRoute);

  useEffect(() => {
    normalizeOperatorHash();
    const onHashChange = () => setRoute(parseOperatorRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const nav = useMemo(
    () => (route.dealerId ? buildOperatorNav(route.dealerId) : null),
    [route.dealerId]
  );

  const activeTab = tabFromPage(route.page);

  const selectDealer = (id: string) => {
    window.location.hash = `#/${id}/platforms`;
  };

  return { route, nav, activeTab, selectDealer };
}
