import { useState } from 'react';
import { en } from '../i18n/en';

type CopyState = 'idle' | 'copied' | 'failed';

export function CopyButton({ text, what }: { text: string; what: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2000);
  };
  const label = state === 'copied' ? en.copy.copied : state === 'failed' ? en.copy.failed : en.copy.copy;
  return (
    <button type="button" className="copy-button" onClick={copy} aria-label={en.copy.label(what)} data-state={state}>
      <span aria-live="polite">{label}</span>
    </button>
  );
}

/** A shell or slash command with a copy button. */
export function CommandLine({ command }: { command: string }) {
  return (
    <div className="command">
      <code>{command}</code>
      <CopyButton text={command} what={command} />
    </div>
  );
}
