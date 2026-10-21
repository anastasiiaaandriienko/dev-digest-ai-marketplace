import { href } from '../lib/router';
import { en } from '../i18n/en';

export function NotFound({ message }: { message?: string }) {
  return (
    <section>
      <h1>{en.states.notFoundTitle}</h1>
      {message && <p>{message}</p>}
      <p>
        <a href={href({ name: 'home' })}>{en.states.backHome}</a>
      </p>
    </section>
  );
}
