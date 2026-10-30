import Link from 'next/link';
import { ArrowRightIcon, ScanIcon } from './components/icons';

export default function NotFound() {
  return (
    <main className="centered">
      <section className="centered-card">
        <span className="state-icon" aria-hidden="true">
          <ScanIcon />
        </span>
        <h1>Page not found</h1>
        <p>The page you requested does not exist. Head back to the inspection workspace.</p>
        <Link className="btn btn-primary" href="/">
          Back to analysis
          <ArrowRightIcon />
        </Link>
      </section>
    </main>
  );
}
