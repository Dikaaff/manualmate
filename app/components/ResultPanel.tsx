'use client';

import { useEffect, useState } from 'react';
import type { AnalysisResult, GroundingStatus } from '../types';
import { buildBrief } from '../lib/brief';
import { blockedCategoryLabel } from '../lib/safety';
import {
  AlertIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  FileTextIcon,
  LockIcon,
  RotateIcon,
  ScanIcon,
  ShieldIcon,
  SparkIcon,
  WrenchIcon,
} from './icons';

const GROUNDING_LABELS: Record<GroundingStatus, string> = {
  verified: 'Marker valid',
  partial: 'Marker partial',
  ungrounded: 'No marker',
};

type ResultPanelProps = {
  result: AnalysisResult | null;
  busy: boolean;
  elapsedMs: number;
  error: string | null;
  onRetry: () => void;
  onOpenSafety: () => void;
  onNewAnalysis: () => void;
};

function groundingLabel(status: GroundingStatus): string {
  return GROUNDING_LABELS[status];
}

export function ResultPanel({
  result,
  busy,
  elapsedMs,
  error,
  onRetry,
  onOpenSafety,
  onNewAnalysis,
}: ResultPanelProps) {
  const [checked, setChecked] = useState<boolean[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    setChecked([]);
    setCopyState('idle');
  }, [result?.id]);

  function toggle(index: number) {
    setChecked((previous) => {
      const next = [...previous];
      next[index] = !next[index];
      return next;
    });
  }

  async function copyBrief() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildBrief(result));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState('idle'), 2200);
  }

  const completed = result ? result.steps.filter((_, index) => checked[index]).length : 0;
  const progress = result && result.steps.length ? Math.round((completed / result.steps.length) * 100) : 0;
  const confidenceTone = !result ? 'low' : result.confidence >= 70 ? 'high' : result.confidence >= 40 ? 'medium' : 'low';
  const statusLabel = busy ? 'Running' : result?.blocked ? 'Stopped' : result ? 'Ready' : 'Waiting';
  const statusClass = busy ? 'run' : result?.blocked ? 'stop' : result ? 'ready' : '';

  return (
    <section className="card result-card" aria-live="polite">
      <div className="card-head">
        <div>
          <span className="card-step">
            <ScanIcon /> 02 · Assessment
          </span>
          <h2>Observation</h2>
          <p>Grounded marker, model self-rating, and the ordered checklist.</p>
        </div>
        <span className={`badge ${statusClass}`}>{statusLabel}</span>
      </div>

      {busy && (
        <div className="pipeline" role="status">
          <div className="pipeline-head">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Reading the photo</strong>
              <p>
                Upload, model call, safety gate, and grounding validation · {Math.floor(elapsedMs / 1000)}s elapsed
              </p>
            </div>
          </div>
          <p className="pipeline-note">
            A result appears only after the server validates the model output. A failed call never falls back to
            invented steps.
          </p>
          <div className="skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {!busy && error && (
        <div className="state error-state">
          <span className="state-icon" aria-hidden="true">
            <AlertIcon />
          </span>
          <strong>Analysis did not finish</strong>
          <p>{error}</p>
          <div className="state-actions">
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              <RotateIcon />
              Try again
            </button>
            <button type="button" className="btn btn-secondary" onClick={onOpenSafety}>
              <ShieldIcon />
              Safety boundaries
            </button>
          </div>
        </div>
      )}

      {!busy && !error && !result && (
        <div className="state">
          <span className="state-icon" aria-hidden="true">
            <ScanIcon />
          </span>
          <strong>No observation yet</strong>
          <p>
            Upload a photo to run the model. The server checks safety and validates the marker before any checklist
            reaches you.
          </p>
          <ul className="state-list">
            <li>
              <CameraIcon /> Photo downscaled in your browser
            </li>
            <li>
              <ShieldIcon /> Safety gate before guidance
            </li>
            <li>
              <ScanIcon /> Marker validated against the image
            </li>
          </ul>
        </div>
      )}

      {!busy && !error && result && (
        <div className="result">
          <div className="result-toolbar">
<span className={`badge ${result.provider === 'meta' ? 'live' : 'stop'}`}>
{result.provider === 'meta' ? <SparkIcon /> : <ShieldIcon />}
{result.provider === 'meta' ? 'Model result' : 'Safety preflight'}
            </span>
<span className="meta-text">{result.provider === 'meta' ? result.model : 'no model call'}</span>
{result.provider === 'meta' && <span className="meta-text">· {result.latencyMs} ms</span>}
            <span className={`badge ${result.grounding.status}`}>{groundingLabel(result.grounding.status)}</span>
          </div>

          <div className="decision-trace" aria-label="Analysis decision trace">
            <div className="decision-trace-head">
              <span>Decision trace</span>
              <span className="meta-text">server validated</span>
            </div>
            <ol>
              <li className="complete"><span>01</span><strong>Preflight</strong><small>photo and hazard gate</small></li>
              <li className={result.provider === 'meta' ? 'complete' : 'skipped'}><span>02</span><strong>Model</strong><small>{result.provider === 'meta' ? result.model : 'skipped'}</small></li>
              <li className={result.blocked ? 'blocked-step' : 'complete'}><span>03</span><strong>Safety</strong><small>{result.blocked ? 'stopped' : 'passed'}</small></li>
              <li className={result.grounding.status === 'ungrounded' ? 'blocked-step' : 'complete'}><span>04</span><strong>Grounding</strong><small>{groundingLabel(result.grounding.status)}</small></li>
              <li className={result.blocked ? 'blocked-step' : 'complete'}><span>05</span><strong>Finalize</strong><small>{result.blocked ? 'no guidance' : 'checklist ready'}</small></li>
            </ol>
          </div>

          {result.blocked ? (
            <div className="blocked">
              <div className="blocked-top">
                <span className="blocked-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <div>
                  <span className="blocked-kicker">
                    {result.safety.nextStep === 'retake' ? 'No reliable guidance' : 'Stopped before guidance'}
                  </span>
                  <h3>{blockedCategoryLabel(result.safety.category)}</h3>
                </div>
              </div>
              <p>{result.safety.reason}</p>
              <div className="contact">
                <small>{result.safety.nextStep === 'retake' ? 'Next step' : 'Contact'}</small>
                <strong>
                  {result.safety.nextStep === 'retake'
                    ? 'Retake the photo in brighter light, fill the frame with the object, and add a close-up of the suspect area.'
                    : result.safety.professional}
                </strong>
              </div>
              <p className="blocked-note">
                No tools, parts, or repair steps are shown for this category. {result.grounding.note}
              </p>
              <button type="button" className="btn btn-secondary" onClick={onOpenSafety}>
                <ShieldIcon />
                View safety boundaries
              </button>
            </div>
          ) : (
            <>
              <div className="observation">
                <span className="observation-label">
                  <SparkIcon /> What the model sees
                </span>
                <strong>{result.observation}</strong>
                <p>{result.objectLabel} · visual observation, not a diagnosis.</p>
                <div className="meter">
                  <div className="meter-head">
                    <span>Model self-rating</span>
                    <span>{result.confidence}/100</span>
                  </div>
                  <div className={`meter-track ${confidenceTone}`}>
                    <span style={{ width: `${Math.max(2, result.confidence)}%` }} />
                  </div>
                </div>
              </div>

              <div className={`note-card ${result.grounding.status}`}>
                <ShieldIcon />
                <div>
                  <strong>{groundingLabel(result.grounding.status)}</strong>
                  <span>{result.grounding.note}</span>
                </div>
              </div>

              <div className="facts">
                <div className="fact">
                  <span className="fact-label">
                    <CameraIcon /> Object
                  </span>
                  <strong>{result.objectLabel}</strong>
                </div>
                <div className="fact">
                  <span className="fact-label">
                    <WrenchIcon /> Difficulty
                  </span>
                  <strong>{result.difficulty}</strong>
                </div>
                <div className="fact">
                  <span className="fact-label">
                    <ClockIcon /> Time
                  </span>
                  <strong>{result.estimatedTime}</strong>
                </div>
              </div>

              <div className="kit">
                <div className="fact">
                  <span className="fact-label">
                    <WrenchIcon /> Prepare
                  </span>
                  <p>{result.tools.length ? result.tools.join(' / ') : 'No tools listed'}</p>
                </div>
                <div className="fact">
                  <span className="fact-label">
                    <FileTextIcon /> Parts
                  </span>
                  <p>{result.parts.length ? result.parts.join(' / ') : 'No parts listed'}</p>
                </div>
              </div>

              <div className="check-head">
                <h3>Repair checklist</h3>
                <span className="check-count">
                  {completed}/{result.steps.length}
                </span>
              </div>
              <div className="progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="checklist">
                {result.steps.map((step, index) => (
                  <label key={`${step.title}-${index}`} className={`check${checked[index] ? ' checked' : ''}`}>
                    <input type="checkbox" checked={Boolean(checked[index])} onChange={() => toggle(index)} />
                    <span className="check-box" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <span className="check-num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="check-copy">
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                      {step.safety && <em>Stop if: {step.safety}</em>}
                    </span>
                  </label>
                ))}
              </div>

              <div className="notice">
                <AlertIcon />
                <span>{result.note}</span>
              </div>

              <div className="result-actions">
                <button type="button" className="btn btn-primary" onClick={copyBrief}>
                  {copyState === 'copied' ? (
                    <>
                      <CheckIcon />
                      Brief copied
                    </>
                  ) : copyState === 'error' ? (
                    <>
                      <AlertIcon />
                      Copy failed
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      Copy repair brief
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onNewAnalysis}>
                  <RotateIcon />
                  Analyze another photo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
