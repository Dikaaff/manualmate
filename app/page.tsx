'use client';

import { useEffect, useState } from 'react';
import { HistoryView } from './components/HistoryView';
import { ResultPanel } from './components/ResultPanel';
import { SafetyView } from './components/SafetyView';
import { UploadPanel } from './components/UploadPanel';
import {
  CameraIcon,
  HistoryIcon,
  LockIcon,
  ScanIcon,
  ShieldIcon,
} from './components/icons';
import { prepareImage, validateClientFile, type PreparedImage } from './lib/client-image';
import type { AnalysisResult, HealthResponse, HistoryEntry, ServiceState } from './types';

type View = 'analysis' | 'history' | 'safety';

const HISTORY_KEY = 'manualmate-history-v3';
const HISTORY_LIMIT = 8;

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.image === 'string' &&
    typeof entry.thumb === 'string' &&
    Boolean(entry.result)
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>('analysis');
  const [hint, setHint] = useState('');
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: HealthResponse | null) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({ ok: false, configured: false, provider: 'unconfigured', model: 'none', version: '' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const startedAt = Date.now();
    setElapsedMs(0);
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => window.clearInterval(timer);
  }, [busy]);

  function saveEntry(entry: HistoryEntry) {
    setHistory((previous) => {
      const next = [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      } catch {
        const smaller = next.slice(0, 3);
        try {
          window.localStorage.setItem(HISTORY_KEY, JSON.stringify(smaller));
          return smaller;
        } catch {
          return [];
        }
      }
    });
  }

  async function handleFile(file: File) {
    const clientError = validateClientFile(file);
    if (clientError) {
      setError(clientError);
      return;
    }

    setError(null);
    setResult(null);

    try {
      const next = await prepareImage(file);
      setPrepared(next);
      setPreview(next.dataUrl);
    } catch (prepareError) {
      setPrepared(null);
      setPreview(null);
      setError(prepareError instanceof Error ? prepareError.message : 'The photo could not be prepared.');
    }
  }

  async function analyze() {
    if (!prepared || busy) return;

    setBusy(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65_000);

    try {
      const form = new FormData();
      form.append('image', prepared.blob, 'inspection.jpg');
      form.append('hint', hint);

      const response = await fetch('/api/analyze', { method: 'POST', body: form, signal: controller.signal });
      const payload = (await response.json().catch(() => null)) as
        | { result?: AnalysisResult; error?: string }
        | null;

      if (!response.ok || !payload?.result) {
        throw new Error(payload?.error || `Analysis failed (${response.status}).`);
      }

      const nextResult = payload.result;
      setResult(nextResult);

      saveEntry({
        id: nextResult.id,
        createdAt: nextResult.createdAt,
        objectLabel: nextResult.objectLabel,
        observation: nextResult.observation,
        blocked: nextResult.blocked,
        safetyCategory: nextResult.safety.category,
        image: prepared.historyImage,
        thumb: prepared.thumb,
        result: nextResult,
      });
    } catch (analysisError) {
      if (analysisError instanceof DOMException && analysisError.name === 'AbortError') {
        setError('The analysis timed out. The model may be busy; try again.');
      } else {
        setError(analysisError instanceof Error ? analysisError.message : 'The analysis failed.');
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  function resetPhoto() {
    setPrepared(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setHint('');
  }

  function openHistoryEntry(entry: HistoryEntry) {
    setPrepared(null);
    setPreview(entry.image);
    setResult(entry.result);
    setError(null);
    setHint('');
    setView('analysis');
  }

  function clearHistory() {
    if (!window.confirm('Clear all saved analyses from this browser?')) return;
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Storage can be unavailable in private mode.
    }
  }

  function focusWorkspace() {
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const serviceState: ServiceState = health === null ? 'checking' : health.configured ? 'ready' : 'unavailable';
  const serviceLabel =
    serviceState === 'ready' ? 'Model online' : serviceState === 'checking' ? 'Checking' : 'Offline';

  return (
    <div className="app-shell">
      <header className="appbar">
        <div className="appbar-inner">
          <button type="button" className="brand" onClick={() => setView('analysis')} aria-label="ManualMate home">
            <span className="brand-mark" aria-hidden="true">
              <ShieldIcon />
            </span>
            <span className="brand-text">
              <span className="brand-name">ManualMate</span>
              <span className="brand-sub">Furniture inspection</span>
            </span>
          </button>

          <nav className="tabs" aria-label="Primary">
            <TabButton
              active={view === 'analysis'}
              icon={<CameraIcon />}
              label="Analyze"
              onClick={() => setView('analysis')}
            />
            <TabButton
              active={view === 'history'}
              icon={<HistoryIcon />}
              label="History"
              count={history.length}
              onClick={() => setView('history')}
            />
            <TabButton
              active={view === 'safety'}
              icon={<ShieldIcon />}
              label="Safety"
              onClick={() => setView('safety')}
            />
          </nav>

          <span className={`service ${serviceState}`} title={health?.model ? `Model: ${health.model}` : undefined}>
            <span className="service-dot" aria-hidden="true" />
            <span>{serviceLabel}</span>
            {serviceState === 'ready' && health?.model && <code className="service-model">{health.model}</code>}
          </span>
        </div>
      </header>

      <main className="main">
        {view === 'analysis' && (
          <section>
            <section className="hero">
              <div className="hero-copy">
                <span className="overline">Visual inspection · 01</span>
                <h1>
                  See it first.
                  <br />
                  <span className="hero-accent">Fix it safely.</span>
                </h1>
                <p className="lede">
                  Upload one clear photo. The vision model reads it, the server checks it against a safety gate,
                  and every marker is validated before a checklist reaches you.
                </p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary btn-lg" onClick={focusWorkspace}>
                    <CameraIcon />
                    Start an inspection
                  </button>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => setView('safety')}>
                    <ShieldIcon />
                    Safety boundaries
                  </button>
                </div>
                <ul className="assurances">
                  <li>
                    <ShieldIcon /> Safety gate before guidance
                  </li>
                  <li>
                    <ScanIcon /> Markers validated
                  </li>
                  <li>
                    <LockIcon /> Photos never stored
                  </li>
                </ul>
              </div>

              <aside className="hero-panel" aria-label="Inspection protocol">
                <div className="hero-panel-top">
                  <span className="hero-panel-label">
                    <ShieldIcon /> Inspection protocol
                  </span>
                  <span className={`hero-live ${serviceState}`}>
                    <span className="live-dot" aria-hidden="true" />
                    {serviceLabel}
                  </span>
                </div>
                <p className="hero-panel-title">
                  Photo in.
                  <br />
                  Gate on.
                  <br />
                  Steps out.
                </p>
                <dl className="hero-panel-rows">
                  <div>
                    <dt>Engine</dt>
                    <dd>{health?.model && health.model !== 'none' ? health.model : 'Meta vision'}</dd>
                  </div>
                  <div>
                    <dt>Safety gate</dt>
                    <dd>6 checks</dd>
                  </div>
                  <div>
                    <dt>History</dt>
                    <dd>Local only</dd>
                  </div>
                </dl>
              </aside>
            </section>

            {health && !health.configured && (
              <div className="banner">
                <ShieldIcon />
                <span>
                  <strong>Analysis service is not configured.</strong>
                  <span>
              Set <code>MODEL_API_KEY</code> on the server and restart. No analysis runs without a model, and
                    no result is fabricated.
                  </span>
                </span>
              </div>
            )}

            <div className="work-grid" id="workspace">
              <UploadPanel
                preview={preview}
                hint={hint}
                busy={busy}
                serviceState={serviceState}
                canAnalyze={Boolean(prepared)}
                error={error}
                result={result}
                onFile={handleFile}
                onHint={setHint}
                onAnalyze={analyze}
                onReset={resetPhoto}
              />
              <ResultPanel
                result={result}
                busy={busy}
                elapsedMs={elapsedMs}
                error={error}
                onRetry={analyze}
                onOpenSafety={() => setView('safety')}
                onNewAnalysis={resetPhoto}
              />
            </div>
          </section>
        )}

        {view === 'history' && (
          <HistoryView
            history={history}
            onOpen={openHistoryEntry}
            onClear={clearHistory}
            onNew={() => {
              resetPhoto();
              setView('analysis');
            }}
          />
        )}

        {view === 'safety' && <SafetyView onBack={() => setView('analysis')} />}
      </main>

      <footer className="site-foot">
        <div className="site-foot-inner">
          <strong>ManualMate</strong>
          <span className="site-foot-sep" aria-hidden="true" />
          <span>Visual inspection, not a diagnosis. Stop when in doubt.</span>
          <span className="site-foot-spacer" />
          <span>History stays in this browser</span>
        </div>
      </footer>

      <nav className="mobile-tabs" aria-label="Primary mobile">
        <TabButton
          mobile
          active={view === 'analysis'}
          icon={<CameraIcon />}
          label="Analyze"
          onClick={() => setView('analysis')}
        />
        <TabButton
          mobile
          active={view === 'history'}
          icon={<HistoryIcon />}
          label="History"
          count={history.length}
          onClick={() => setView('history')}
        />
        <TabButton
          mobile
          active={view === 'safety'}
          icon={<ShieldIcon />}
          label="Safety"
          onClick={() => setView('safety')}
        />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  count,
  mobile,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${mobile ? 'mobile-tab' : 'tab'}${active ? ' active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && <span className={mobile ? 'mobile-tab-count' : 'tab-count'}>{count}</span>}
    </button>
  );
}
