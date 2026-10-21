import { describe, expect, it } from 'vitest';
import { renderMarkdown, resolveLink } from './markdown';

const source = { repository: 'https://github.com/acme/demo-market', sourcePath: 'plugins/x/README.md' };

function dom(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('renderMarkdown sanitizes untrusted content', () => {
  it('renders ordinary Markdown', () => {
    const el = dom(renderMarkdown('# Title\n\nSome **bold** text and `code`.\n\n| a | b |\n|---|---|\n| 1 | 2 |', source));
    expect(el.querySelector('h1')?.textContent).toBe('Title');
    expect(el.querySelector('strong')?.textContent).toBe('bold');
    expect(el.querySelector('table td')?.textContent).toBe('1');
  });

  it('removes scripts, event handlers, styles, iframes and forms', () => {
    const html = renderMarkdown(
      [
        '<script>alert(1)</script>',
        '<img src="x.png" onerror="alert(2)">',
        '<p style="color:red" onclick="alert(3)">hi</p>',
        '<iframe src="https://evil.example"></iframe>',
        '<form action="https://evil.example"><input name="q"></form>',
        '<style>body{display:none}</style>',
        '<svg><script>alert(4)</script></svg>',
      ].join('\n\n'),
      source,
    );
    expect(html).not.toMatch(/<script|onerror|onclick|<iframe|<form|<input|<style|style=|<svg/i);
    expect(html).not.toContain('alert(');
  });

  it('drops javascript:, data: and protocol-relative links', () => {
    const el = dom(
      renderMarkdown('[a](javascript:alert(1)) [b](data:text/html,<b>x</b>) [c](//evil.example/x) [d](JaVaScRiPt:alert(1))', source),
    );
    for (const a of el.querySelectorAll('a')) expect(a.getAttribute('href')).toBeNull();
  });

  it('resolves relative links to the file on GitHub and opens external links safely', () => {
    const el = dom(renderMarkdown('[changelog](CHANGELOG.md) [guide](../../CONTRIBUTING.md) [ext](https://example.com)', source));
    const [changelog, guide, ext] = [...el.querySelectorAll('a')];
    expect(changelog!.getAttribute('href')).toBe('https://github.com/acme/demo-market/blob/main/plugins/x/CHANGELOG.md');
    expect(guide!.getAttribute('href')).toBe('https://github.com/acme/demo-market/blob/main/CONTRIBUTING.md');
    expect(ext!.getAttribute('href')).toBe('https://example.com');
    for (const a of [changelog!, guide!, ext!]) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('keeps in-page anchors without target', () => {
    const a = dom(renderMarkdown('[top](#usage)', source)).querySelector('a')!;
    expect(a.getAttribute('href')).toBe('#usage');
    expect(a.hasAttribute('target')).toBe(false);
  });

  it('serves relative images from raw.githubusercontent.com', () => {
    const img = dom(renderMarkdown('![logo](assets/logo.png)', source)).querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://raw.githubusercontent.com/acme/demo-market/main/plugins/x/assets/logo.png');
  });
});

describe('resolveLink', () => {
  it('does not let a relative path climb out of the repository', () => {
    expect(resolveLink('../../../../other-repo/README.md', source)).toBeNull();
  });
  it('drops relative links when the repository is unknown', () => {
    expect(resolveLink('CHANGELOG.md', { repository: null, sourcePath: 'x.md' })).toBeNull();
  });
  it('keeps mailto links', () => {
    expect(resolveLink('mailto:team@example.com', source)).toBe('mailto:team@example.com');
  });
});
