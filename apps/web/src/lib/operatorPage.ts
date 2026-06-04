import type { OperatorNavHandlers, OperatorTab } from './operatorNav.ts';

export type OperatorPageBaseProps = {
  dealerId: string;
  nav: OperatorNavHandlers;
  activeTab: OperatorTab;
};
