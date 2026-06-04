import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  maxWidth?: string;
};

export function Modal({ children, maxWidth = 'max-w-3xl' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        {children}
      </div>
    </div>
  );
}
