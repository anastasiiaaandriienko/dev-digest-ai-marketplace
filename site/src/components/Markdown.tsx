import { useEffect, useState } from 'react';
import { loadBody } from '../lib/data';
import { renderMarkdown, type MarkdownSource } from '../lib/markdown';
import { en } from '../i18n/en';

/** Renders sanitized Markdown. The HTML comes only from renderMarkdown (marked + DOMPurify). */
export function MarkdownHtml({ markdown, source }: { markdown: string; source: MarkdownSource }) {
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown, source) }} />;
}

/** Fetches a generated body file and renders it. */
export function MarkdownBody({ path, source }: { path: string; source: MarkdownSource }) {
  const [state, setState] = useState<{ md: string | null; error: boolean }>({ md: null, error: false });
  useEffect(() => {
    let alive = true;
    setState({ md: null, error: false });
    loadBody(path)
      .then((md) => alive && setState({ md, error: false }))
      .catch(() => alive && setState({ md: null, error: true }));
    return () => {
      alive = false;
    };
  }, [path]);

  if (state.error) return <p className="muted" role="alert">{en.states.bodyError}</p>;
  if (state.md === null) return <p className="muted" role="status">{en.states.loading}</p>;
  return <MarkdownHtml markdown={state.md} source={source} />;
}
