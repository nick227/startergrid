import { Suspense } from 'react';
import { HomeBlockRegistry } from './HomeBlockRegistry.ts';

export type DynamicTemplateRendererProps = {
  layout: string[];
};

export function DynamicTemplateRenderer({ layout }: DynamicTemplateRendererProps) {
  return (
    <>
      {layout.map((blockName, index) => {
        const Block = HomeBlockRegistry[blockName];
        if (!Block) {
          console.warn(`Block ${blockName} not found in HomeBlockRegistry`);
          return null;
        }
        return (
          <section key={`${blockName}-${index}`} className="bg-white">
            <Suspense fallback={<div className="py-24 text-center text-silver-400">Loading section...</div>}>
              <Block />
            </Suspense>
          </section>
        );
      })}
    </>
  );
}
