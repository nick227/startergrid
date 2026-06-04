import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  minWidth?: string;
};

export function Table({ children, minWidth = 'min-w-[900px]' }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth}`}>{children}</table>
    </div>
  );
}
