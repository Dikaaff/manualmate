'use client';

import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  LockIcon,
  ShieldAlertIcon,
  ShieldIcon,
  XIcon,
} from './icons';

export function SafetyView({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <div className="page-head">
        <div>
          <span className="overline">Guardrails · always on</span>
          <h1>When in doubt, stop.</h1>
          <p className="lede">
            ManualMate only guides low-risk furniture work. A blocked request returns no tools, parts, or steps —
            by design, and before the result leaves the server.
          </p>
        </div>
        <span className="page-stamp danger">
          <ShieldAlertIcon /> Stop is a feature
        </span>
      </div>

      <div className="safety-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="card-step">
                <CheckIcon /> Allowed
              </span>
              <h2>Low-risk furniture</h2>
              <p>Visual checks and reversible tightening.</p>
            </div>
            <span className="badge ready">Allowed</span>
          </div>
          <ul className="safety-list">
            <li>
              <CheckIcon /> Wood furniture and bolted or screwed joints.
            </li>
            <li>
              <CheckIcon /> Chairs, tables, shelves, cabinets, desks, and drawers.
            </li>
            <li>
              <CheckIcon /> Visual checks before asking for help.
            </li>
            <li>
              <CheckIcon /> Reversible tightening with hand tools.
            </li>
          </ul>
        </section>

        <section className="card danger-card">
          <div className="card-head">
            <div>
              <span className="card-step">
                <LockIcon /> Blocked
              </span>
              <h2>Always out of scope</h2>
              <p>No automated repair steps, ever.</p>
            </div>
            <span className="badge stop">Blocked</span>
          </div>
          <ul className="safety-list">
            <li>
              <XIcon /> Electricity, wiring, outlets, batteries, and live panels.
            </li>
            <li>
              <XIcon /> Gas, fuel, chemicals, asbestos, mold, and high heat.
            </li>
            <li>
              <XIcon /> Pressurized pipes, hydraulics, compressors, and plumbing.
            </li>
            <li>
              <XIcon /> Load-bearing structure, walls, ceilings, roofs, and ladders.
            </li>
            <li>
              <XIcon /> Vehicles, medical devices, weapons, and unclear subjects.
            </li>
          </ul>
        </section>
      </div>

      <div className="safety-detail">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="card-step">
                <ShieldIcon /> How the gate works
              </span>
              <h2>Six deterministic checks</h2>
              <p>Every check wraps the model — none of them trusts it.</p>
            </div>
            <span className="badge">6 checks</span>
          </div>
          <ol className="gate-list">
            <li className="gate-item">
              <span className="gate-num">01</span>
              <div>
                <strong>Preflight on the hint</strong>
                <p>A blocked keyword stops the request before the model runs.</p>
              </div>
            </li>
            <li className="gate-item">
              <span className="gate-num">02</span>
              <div>
                <strong>Model safety field</strong>
                <p>The model must classify the image and may stop itself.</p>
              </div>
            </li>
            <li className="gate-item">
              <span className="gate-num">03</span>
              <div>
                <strong>Object category</strong>
                <p>A hazardous category blocks even when the model claims safety.</p>
              </div>
            </li>
            <li className="gate-item">
              <span className="gate-num">04</span>
              <div>
                <strong>Keyword backstop</strong>
                <p>The observation is scanned for hazard terms after generation.</p>
              </div>
            </li>
            <li className="gate-item">
              <span className="gate-num">05</span>
              <div>
                <strong>Dangerous action scan</strong>
                <p>Steps that describe unsafe work block the entire result.</p>
              </div>
            </li>
            <li className="gate-item">
              <span className="gate-num">06</span>
              <div>
                <strong>Confidence floor</strong>
                <p>Below a 30/100 self-rating, the result is treated as unclear and blocked.</p>
              </div>
            </li>
          </ol>
          <p className="card-footnote">
            A blocked result is stripped of tools, parts, and steps on the server before it leaves the API.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="card-step">
                <AlertIcon /> Grounding limits
              </span>
              <h2>Markers are validated, not trusted</h2>
              <p>Approximate boxes, honest labels.</p>
            </div>
            <span className="badge warn">Honest</span>
          </div>
          <ul className="safety-list plain">
            <li>Every box is checked for valid coordinates, size, and image bounds.</li>
            <li>Full-frame or unusable boxes are discarded and labeled as partial.</li>
            <li>If no box survives, the result is marked ungrounded instead of showing a fake marker.</li>
            <li>Model boxes are approximate. Confirm the marked area visually.</li>
            <li>Confidence is the model&apos;s self-rating, not a probability of correctness.</li>
          </ul>
        </section>
      </div>

      <div className="safety-foot">
        <ShieldIcon />
        <div>
          <strong>Before following a step</strong>
          <span>Make sure the object is not in use and sits on a stable surface.</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeftIcon />
          Back to analysis
        </button>
      </div>
    </section>
  );
}
