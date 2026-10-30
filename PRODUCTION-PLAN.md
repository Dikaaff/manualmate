# ManualMate - Product Plan

## Product

A single-purpose furniture inspection tool. The user uploads a photo; a vision model reads it, marks the first area to inspect, and returns a cautious checklist. Hazardous or unclear cases stop before guidance.

The product is not a demo and has no fixture mode. The model is a required dependency.

## Current scope

- Low-risk household furniture only: chairs, tables, shelves, cabinets, desks, sofas, beds, drawers.
- One photo and one optional hint per analysis.
- No accounts, no server-side image storage, no database.
- History is browser-local (8 entries).
- English UI.
- Web app deployed on Vercel.

## Non-goals for this version

- Structural, electrical, gas, plumbing, vehicle, medical, weapon, or chemical repair guidance.
- Diagnosis or certification.
- Multi-photo sessions or video.
- Marketplace or technician booking.
- Cross-device history or team workspaces.

## Acceptance criteria

The product is ready when:

1. The server refuses to analyze without a model key; no fallback result exists.
2. A real uploaded photo is sent to the model and the returned JSON is validated.
3. The marker is drawn from validated normalized coordinates over that photo.
4. A blocked category returns no tools, parts, or steps, enforced server-side.
5. A low-confidence result asks for a retake instead of inventing guidance.
6. History survives refresh and can be cleared.
7. `npm run verify` and `npm run build` pass.
8. No secret appears in client code or the repository.
9. The deployed URL works in an incognito window.
10. Invalid file types and oversized files show actionable errors.

## Milestones

### Now: real core

- [x] Meta adapter with structured output, timeout, retry, and error mapping.
- [x] Zod validation and a strict JSON schema.
- [x] Six-check safety gate and server-side strip.
- [x] Grounding validation and honest status.
- [x] Browser-local history.
- [x] 34 automated tests and CI.
- [x] Labeled 30-case safety/grounding acceptance set with baseline metrics.
- [x] Visible decision trace from preflight through finalization.
- [x] Remove fixture mode and demo artifacts.
- [ ] Live smoke test with a real key and three real photos.
- [ ] Prompt and schema tuning based on those photos.

### Next: product hardening

- [ ] Authentication and cloud history (only if users need cross-device).
- [ ] Shared rate limiting (Upstash or Vercel KV).
- [ ] Structured logging and error monitoring.
- [ ] Accessibility audit with keyboard and screen reader.
- [ ] PWA manifest and install flow.
- [ ] Store/Play packaging only if there is a real distribution need.

### Later: evaluation

- [x] Labeled acceptance set of 30 cases with allowed, blocked, and grounding labels.
- [ ] Measure marker overlap and checklist usefulness.
- [ ] Human review protocol for safety regressions.

## Risks

| Risk | Mitigation |
| --- | --- |
| Model invents a defect | Conservative prompt, low self-rating handling, visual confirmation copy. |
| Model returns invalid boxes | Grounding validator drops them; UI shows no marker. |
| Unsafe category slips through | Six checks plus server-side strip; overblocking is acceptable. |
| Key missing in deployment | Health endpoint and UI clearly disable analysis. |
| Cost spikes | One call per request, 10/minute limiter, no retries on success. |
| Privacy concerns | No server storage; photos sent to Meta once; local history only. |

## Deployment

1. Set `MODEL_API_KEY` in Vercel.
2. Deploy with `vercel --prod`.
3. Check `/api/health` returns `configured: true`.
4. Run the smoke script against the deployed URL with a real photo.
5. Confirm the header says `MODEL READY`.

## Open decision

If the product needs accounts and cross-device history, add Supabase auth and storage. That is a deliberate scope increase, not a fix for the current core.
