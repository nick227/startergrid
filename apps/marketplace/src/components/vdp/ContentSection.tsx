import type { VehicleContent } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';

type Props = { content: VehicleContent };

export function ContentSection({ content }: Props) {
  const blocks = [
    { title: 'Description', body: content.fullDescription },
    { title: 'Dealer notes', body: content.dealerNotes },
    { title: 'Disclaimer', body: content.disclaimer },
    { title: 'Legal', body: content.legalDisclosure },
  ].filter(block => block.body);

  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map(block => (
        <SectionCard key={block.title} title={block.title}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{block.body}</p>
        </SectionCard>
      ))}
    </>
  );
}
