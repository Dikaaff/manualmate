'use client';

import { useRef, useState } from 'react';
import type { AnalysisResult, ServiceState } from '../types';
import { GroundingOverlay } from './GroundingOverlay';
import {
  AlertIcon,
  CameraIcon,
  ChevronDownIcon,
  LockIcon,
  ScanIcon,
  ShieldIcon,
  SparkIcon,
  XIcon,
} from './icons';

const HINTS = ['Chair', 'Table', 'Shelf', 'Cabinet', 'Electrical panel'];

type UploadPanelProps = {
  preview: string | null;
  hint: string;
  busy: boolean;
  serviceState: ServiceState;
  canAnalyze: boolean;
  error: string | null;
  result: AnalysisResult | null;
  onFile: (file: File) => void;
  onHint: (value: string) => void;
  onAnalyze: () => void;
  onReset: () => void;
};

export function UploadPanel({
  preview,
  hint,
  busy,
  serviceState,
  canAnalyze,
  error,
  result,
  onFile,
  onHint,
  onAnalyze,
  onReset,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  const markerLabel = result
    ? result.regions.length === 0
      ? 'No marker'
      : `${result.regions.length} marker${result.regions.length === 1 ? '' : 's'}`
    : '';

  const note =
    serviceState === 'checking'
      ? 'Checking the analysis service.'
      : serviceState === 'unavailable'
        ? 'The model is not configured. Only the safety preflight can return a result.'
        : canAnalyze
          ? 'Sent to the model once. Not stored on the server.'
          : preview
            ? 'This is a saved result. Add a new photo to run the model again.'
            : 'A photo is required.';

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <span className="card-step">
            <CameraIcon /> 01 · Capture
          </span>
          <h2>Photo to inspect</h2>
          <p>A clear, well-lit photo of the whole object. The model reads only what you upload.</p>
        </div>
        <span className="badge">Input</span>
      </div>

      <div className="card-body">
        <div
          className={`photo-zone${dragging ? ' dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <GroundingOverlay
              src={preview}
              regions={result?.regions ?? []}
              blocked={Boolean(result?.blocked)}
              analyzed={Boolean(result)}
              alt="Uploaded furniture photo used for inspection"
            />
          ) : (
            <button
              type="button"
              className="dropzone"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <span className="dropzone-icon" aria-hidden="true">
                <CameraIcon />
              </span>
              <strong>Drop a furniture photo</strong>
              <p>JPG, PNG, or WebP. Up to 8 MB. One object, well lit, whole frame.</p>
              <span className="dropzone-cta">Browse files</span>
              <span className="dropzone-hint">
                <span>Whole object</span>
                <span>Good light</span>
                <span>Close-up of the joint</span>
              </span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInput}
          hidden
        />

        <div className="photo-tools">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <CameraIcon />
            {preview ? 'Replace' : 'Choose photo'}
          </button>
          {preview && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onReset}>
              <XIcon />
              Clear
            </button>
          )}
          {result && (
            <span className={`marker-chip ${result.grounding.status}`}>
              <ScanIcon style={{ width: 11, height: 11, marginRight: 4, verticalAlign: '-1px' }} />
              {markerLabel}
            </span>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="inspection-hint">
            Optional hint
            <span>What is wrong?</span>
          </label>
          <input
            id="inspection-hint"
            className="input"
            value={hint}
            maxLength={200}
            disabled={busy}
            onChange={(event) => onHint(event.currentTarget.value)}
            placeholder="e.g. wobbly chair, loose table leg"
          />
          <div className="chips">
            {HINTS.map((item) => {
              const selected = hint.toLowerCase() === item.toLowerCase();
              return (
                <button
                  type="button"
                  key={item}
                  className={`chip${selected ? ' selected' : ''}${item === 'Electrical panel' ? ' danger' : ''}`}
                  disabled={busy}
                  aria-pressed={selected}
                  onClick={() => onHint(selected ? '' : item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="submit-row">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            disabled={busy || !preview || !canAnalyze}
            onClick={onAnalyze}
          >
            {busy ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Analyzing photo…
              </>
            ) : (
              <>
                <SparkIcon />
                Analyze photo
              </>
            )}
          </button>
          <span className="hint-note">
            {serviceState === 'ready' ? <LockIcon /> : <ShieldIcon />}
            {note}
          </span>
        </div>

        {error && (
          <div className="alert" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <details className="disclosure">
          <summary>
            How to capture a useful photo
            <ChevronDownIcon />
          </summary>
          <p>
            Fill the frame with the object, keep the whole item visible, and add one close-up of the suspect joint
            or fastener. Avoid blur, glare, and heavy shadows. Do not photograph electrical panels or other blocked
            categories for repair advice.
          </p>
        </details>
      </div>
    </section>
  );
}
