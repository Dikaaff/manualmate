'use client';

import type { HistoryEntry } from '../types';
import { blockedCategoryLabel } from '../lib/safety';
import { ArrowRightIcon, CameraIcon, ClockIcon, HistoryIcon } from './icons';

export function HistoryView({
  history,
  onOpen,
  onClear,
  onNew,
}: {
  history: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onClear: () => void;
  onNew: () => void;
}) {
  return (
    <section>
      <div className="page-head">
        <div>
          <span className="overline">Activity · local only</span>
          <h1>A second look.</h1>
          <p className="lede">
            Saved in this browser only — up to 8 recent inspections. Photos are kept as small thumbnails and never
            sent to a server after analysis.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-secondary" disabled={history.length === 0} onClick={onClear}>
            Clear history
          </button>
          <button type="button" className="btn btn-primary" onClick={onNew}>
            <CameraIcon />
            New analysis
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <span className="card-step">
              <HistoryIcon /> Recent
            </span>
            <h2>Inspections</h2>
            <p>{history.length ? `${history.length} saved in this browser` : 'Nothing saved yet'}</p>
          </div>
          <span className="badge">{history.length}/8</span>
        </div>

        {history.length === 0 ? (
          <div className="state">
            <span className="state-icon" aria-hidden="true">
              <HistoryIcon />
            </span>
            <strong>No analyses yet</strong>
            <p>Run one inspection and it will appear here, even after a refresh.</p>
            <div className="state-actions">
              <button type="button" className="btn btn-primary" onClick={onNew}>
                <CameraIcon />
                Start an inspection
              </button>
            </div>
          </div>
        ) : (
          <div className="history-grid">
            {history.map((entry) => (
              <button type="button" className="history-card" key={entry.id} onClick={() => onOpen(entry)}>
                <span className="history-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.thumb} alt="" />
                  <span className={`history-state${entry.blocked ? ' stop' : ''}`}>
                    {entry.blocked ? 'Stopped' : 'Observed'}
                  </span>
                </span>
                <span className="history-body">
                  <span className="history-title">
                    <strong>{entry.objectLabel}</strong>
                    <span className="history-cat">{blockedCategoryLabel(entry.safetyCategory)}</span>
                  </span>
                  <span className="history-obs">{entry.observation}</span>
                  <span className="history-meta">
                    <ClockIcon />
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </span>
                  <span className="history-open">
                    Open result <ArrowRightIcon />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
