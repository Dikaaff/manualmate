# ManualMate three-minute demo script

## 0:00–0:20 — The problem

“A photo analyzer can describe an object, but that is not enough for repair guidance. ManualMate is designed to stop when the photo, category, or proposed action is unsafe.”

## 0:20–0:55 — Safe furniture path

Upload a clear chair photo and add “wobbly rear-left leg.” Show the marker, model self-rating, grounded status, and checklist. Point to the decision trace: preflight, vision model, safety, grounding, finalize.

## 0:55–1:25 — Verifiability

Zoom into the marker and explain that coordinates are normalized, bounds-checked, deduplicated, and rendered over the original upload. Show the repair brief and the visible-only disclaimer.

## 1:25–2:05 — Safety stop

Submit an electrical-panel or exposed-wiring photo. Show that the server blocks it, strips tools/parts/steps, and directs the user to a professional. Explain that this happens before or after the model and is enforced server-side.

## 2:05–2:35 — Honest failure

Show the unconfigured state or a deliberately invalid image. Explain that missing credentials, malformed output, low confidence, and bad grounding produce a stop or retake request—never a canned answer.

## 2:35–3:00 — Model and close

“The app uses the vision model API with a strict JSON contract, Zod validation, safety gates, and local-only history. ManualMate is not diagnosing a defect; it is producing a cautious, grounded next inspection step.”
