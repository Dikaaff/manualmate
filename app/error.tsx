'use client';

import { AlertIcon, RotateIcon } from './components/icons';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="centered">
      <section className="centered-card">
        <span className="state-icon" aria-hidden="true">
          <AlertIcon />
        </span>
        <h1>Something went wrong</h1>
        <p>The page hit an unexpected error. Your saved results are still in this browser.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          <RotateIcon />
          Try again
        </button>
      </section>
    </main>
  );
}
