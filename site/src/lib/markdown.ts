// Markdown → sanitized HTML. Repository content is untrusted: marked output is ALWAYS
// passed through DOMPurify before it reaches the DOM (see docs/SITE-SPEC.md).
import { Marked } from 'marked';
import createDOMPurify from 'dompurify';

const marked = new Marked({ gfm: true, async: false });

export interface MarkdownSource {
  /** `https://github.com/<owner>/<repo>`; relative links resolve against it. */
  repository: string | null;
  /** Repository-relative path of the rendered file, e.g. `plugins/x/README.md`. */
  sourcePath: string;
  /** Git ref used for links (default `main`). */
  ref?: string;
}

const SAFE_SCHEME = /^(https?:|mailto:)/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Absolute URL for a link in a rendered document, or null when it must be dropped. */
export function resolveLink(href: string, source: MarkdownSource, kind: 'link' | 'image' = 'link'): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#')) return trimmed;
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  if (ANY_SCHEME.test(trimmed) || trimmed.startsWith('//')) return null; // javascript:, data:, protocol-relative…
  if (!source.repository) return null;
  const ref = source.ref ?? 'main';
  const base =
    kind === 'image'
      ? `${source.repository.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${ref}/`
      : `${source.repository}/blob/${ref}/`;
  try {
    const resolved = new URL(trimmed, new URL(source.sourcePath, base));
    // Never let a relative path climb out of the repository URL.
    return resolved.href.startsWith(base) ? resolved.href : null;
  } catch {
    return null;
  }
}

export function renderMarkdown(markdown: string, source: MarkdownSource): string {
  const raw = marked.parse(markdown) as string;
  const purify = createDOMPurify(window);
  purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      const resolved = href === null ? null : resolveLink(href, source, 'link');
      if (resolved === null) node.removeAttribute('href');
      else {
        node.setAttribute('href', resolved);
        if (!resolved.startsWith('#')) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src');
      const resolved = src === null ? null : resolveLink(src, source, 'image');
      if (resolved === null || resolved.startsWith('#')) node.removeAttribute('src');
      else node.setAttribute('src', resolved);
      node.setAttribute('loading', 'lazy');
    }
  });
  return purify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['style', 'srcset'],
    ADD_ATTR: ['target'],
  });
}
