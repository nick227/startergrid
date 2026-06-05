import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type Props = {
  body: string;
  onDocLink: (docId: string) => void;
};

export function DocMarkdown({ body, onDocLink }: Props) {
  const components = useMemo<Components>(
    () => ({
      a: ({ href, children }) => {
        if (href?.startsWith('doc:')) {
          const docId = href.slice(4);
          return (
            <button type="button" onClick={() => onDocLink(docId)} className="doc-link">
              {children}
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="doc-link">
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        <div className="doc-table-wrap">
          <table className="doc-table">{children}</table>
        </div>
      ),
    }),
    [onDocLink]
  );

  return (
    <article className="doc-reader-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </article>
  );
}
