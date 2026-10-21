import { useEffect, useRef, useState, type FormEvent } from 'react';
import { href } from '../lib/router';
import { applyTheme, readTheme, type Theme } from '../lib/theme';
import { en } from '../i18n/en';

export function Header({ query, repository }: { query: string; repository: string | null }) {
  const [value, setValue] = useState(query);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(query), [query]);
  useEffect(() => applyTheme(theme), [theme]);

  // "/" focuses the search box unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    window.location.hash = href({ name: 'search', q: value.trim(), type: 'all' });
  };

  return (
    <header className="header">
      <a className="skip-link" href="#main">
        {en.nav.skipToContent}
      </a>
      <a className="brand" href={href({ name: 'home' })}>
        {en.appTitle}
      </a>
      <form className="search-form" role="search" onSubmit={submit}>
        <input
          ref={input}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={en.search.placeholder}
          title={en.search.shortcutHint}
          aria-keyshortcuts="/"
          aria-label={en.search.label}
        />
        <button type="submit">{en.search.submit}</button>
      </form>
      <nav className="nav" aria-label={en.nav.mainLabel}>
        <a href={href({ name: 'whats-new' })}>{en.nav.whatsNew}</a>
        <a href={href({ name: 'getting-started' })}>{en.nav.gettingStarted}</a>
        {repository && (
          <a href={repository} target="_blank" rel="noopener noreferrer">
            {en.nav.repository}
          </a>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? en.theme.toLight : en.theme.toDark}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </nav>
    </header>
  );
}
