# Verification Map

This file maps each product claim to code and tests. Nothing here depends on a canned demo response.

## Reproduce

```powershell
npm ci
npm run verify
npm run build
```

Expected: typecheck passes, 34 tests pass, production build succeeds.

With a real key:

```powershell
Copy-Item .env.example .env.local
# set MODEL_API_KEY
npm run dev
npm run smoke -- http://localhost:3000 .\chair.jpg "wobbly chair"
```

The smoke output shows the provider, model, block state, safety category and source, grounding status, region boxes, and step titles.

## 1. A real model runs on the photo

| Evidence | Location |
| --- | --- |
| Meta endpoint and API key header | `app/lib/meta.ts` (`attemptOnce`) |
| Real image bytes sent as base64 `inlineData` | `app/lib/meta.ts` |
| Structured JSON mode + schema | `app/lib/meta.ts` (`responseMimeType` / `responseSchema`) |
| Prompt priorities: safety, grounding, repair | `app/lib/model-schema.ts` (`systemPrompt`) |
| Zod validation of the model output | `app/lib/model-schema.ts` (`rawAnalysisSchema`) |
| One retry on malformed JSON, then a live model cascade | `app/lib/meta.ts`, `app/lib/config.ts` |
| Missing key refuses to analyze | `app/lib/meta.ts`, `app/lib/analysis.ts` |
| Full pipeline test against a mock Meta server | `tests/meta-integration.test.ts` |

`tests/meta-integration.test.ts` starts a local HTTP server, asserts the URL, API key header, base64 payload, `thinkingLevel: "low"`, and canonical JSON schema mode, then returns an answer that flows through safety and grounding. It also covers malformed-JSON retry, invalid-key mapping, and model fallback. It runs offline.

The real key is only needed for the live smoke test and for using the product.

## 2. Visual grounding matches the photo

| Evidence | Location |
| --- | --- |
| Model must return `[ymin, xmin, ymax, xmax]` in 0-1000 | `app/lib/model-schema.ts` |
| Reject non-finite, too small, full-frame, duplicate boxes | `app/lib/grounding.ts` |
| Report `verified / partial / ungrounded` | `app/lib/grounding.ts` |
| Draw boxes as percentages over the actual `<img>` | `app/components/GroundingOverlay.tsx` |
| No marker when no box survives | `app/components/GroundingOverlay.tsx`, `app/components/ResultPanel.tsx` |
| Tests | `tests/grounding.test.ts` |

The overlay uses `top`, `left`, `width`, and `height` percentages. The image is `width: 100%; height: auto`, so there is no letterboxing and the marker stays aligned at any viewport size.

`Marker valid` means valid coordinates inside the photo. The UI asks the user to confirm the area visually.

## 3. Safety is consistent and server-enforced

| Check | Location | Test |
| --- | --- | --- |
| Preflight hint block before the model | `app/lib/safety.ts` (`preflightHint`) | `tests/safety.test.ts` |
| Model's own `blocked` / `category` | `evaluateSafety` | `tests/safety.test.ts` |
| Hazardous object category | `evaluateSafety` | `tests/safety.test.ts` |
| Keyword backstop on the observation | `evaluateSafety` | `tests/safety.test.ts` |
| Dangerous action in the checklist | `evaluateSafety` (`DANGEROUS_ACTION`) | `tests/safety.test.ts` |
| Self-rating floor (below 30 = unclear) | `evaluateSafety` | `tests/safety.test.ts` |
| Server-side strip of tools, parts, steps | `app/lib/analysis.ts` (`finalizeAnalysis`) | `tests/analysis.test.ts` |

The preflight path does not need a key. Click the **Electrical panel** hint chip and analyze: the response has `"provider": "safety-pregate"`, empty repair fields, and a professional referral.

Unclear results return `nextStep: "retake"` and ask for a better photo instead of a referral.

## 4. End-to-end flow

| Step | Location |
| --- | --- |
| Upload, drag/drop, client validation | `app/components/UploadPanel.tsx`, `app/lib/client-image.ts` |
| Downscale to 1280 px, build history image and thumb | `app/lib/client-image.ts` |
| Multipart POST | `app/page.tsx` (`analyze`) |
| Signature, size, rate limit | `app/api/analyze/route.ts`, `app/lib/upload.ts` |
| Honest in-progress state with elapsed seconds | `app/page.tsx`, `app/components/ResultPanel.tsx` |
| Marker overlay | `app/components/GroundingOverlay.tsx` |
| Checklist with stop conditions | `app/components/ResultPanel.tsx` |
| Copy repair brief | `app/lib/brief.ts`, `app/components/ResultPanel.tsx` |
| Local history, 8 entries, refresh-safe | `app/page.tsx`, `app/components/HistoryView.tsx` |
| Blocked path | `ResultPanel.tsx`, `analysis.ts` |

The progress panel shows only what is known: a request is in flight and how long it has taken. It does not fake per-stage completion.

## 5. Failure behavior

| Case | Expected |
| --- | --- |
| No `MODEL_API_KEY` | Header shows `SERVICE UNAVAILABLE`; analysis is disabled; API returns 503. |
| Invalid key | 502 `auth`; UI shows a retryable error. |
| Malformed model JSON | One retry, then 502 `invalid_output`. |
| Invalid file | 415 `invalid_image`; upload is rejected before the model. |
| Electrical hint | Blocked before the model; no tools, parts, or steps. |
| Low self-rating | Blocked as unclear; asks for a retake. |

## 6. Artifacts

| Artifact | Location |
| --- | --- |
| README with setup, model rationale, API, privacy, limits | `README.md` |
| Architecture, sequence, safety state machine, failure table | `docs/ARCHITECTURE.md` |
| CI: typecheck, 34 tests, build | `.github/workflows/ci.yml` |
| Smoke test script for a running server | `scripts/smoke.mjs` |
| Environment template | `.env.example` |
| Secret hygiene | `.gitignore`, server-only key access |

## What is not proven

State this honestly if asked:

- Semantic accuracy of the model on a labeled furniture-defect dataset. No such dataset is included.
- Distributed rate limiting. The limiter is in-memory per instance.
- Pixel-perfect segmentation. The model returns boxes, not masks.
- Repairs for hazardous categories. Those are intentionally blocked.
- Cross-device history. History is browser-local by design.
