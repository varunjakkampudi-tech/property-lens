# Property Lens production acceptance

**Evidence snapshot:** 2026-09-29 IST  
**Verified production data/runtime commit:** `310c5534ee0be6c4efb03dc3724b5f37153326b4`

Documentation-only follow-up commits may advance `main` after this runtime verification; each such release is independently checked by the production workflow.

This document records what is verified, what is implemented but not yet proven in unattended operation, and what remains an owner or data-quality requirement. It deliberately does not treat a configured scheduler as evidence that a scheduled cycle has executed.

## Acceptance summary

| Area | Status | Evidence or remaining requirement |
| --- | --- | --- |
| GitHub Pages deployment | Passed | Production workflow [36491506410](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36491506410) passed for the exact data/runtime commit `310c553`. |
| Live production health | Passed | Six public assets passed exact-SHA verification; 64/64 published records are fresh. |
| Release quality gates | Passed | PR quality workflows pass syntax, data, unit, responsive browser and accessibility checks. |
| Branch protection | Passed | `main` requires `quality`, enforces linear history, and disallows force pushes and deletions. |
| Active scheduler | Configured | One active ChatGPT cloud heartbeat is configured for every two hours. |
| Competing scheduler | Removed | The repository feed workflow is manual-only; it has no cron trigger and cannot compete with the cloud task. |
| Protected publisher | Implemented | Data-only PR creation, bounded retries, duplicate-PR handling and squash auto-merge are implemented. |
| Publisher no-feed smoke test | Passed | Manual run [36483418521](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36483418521) completed as `no_feed` with zero accepted/rejected records, no PR, and a persistent artifact. |
| Genuine unattended cycles | Not yet proven | At least two independent cloud runs must produce discovery evidence, a data-only PR, protected merge, Pages deployment and exact-SHA health evidence. |
| Market benchmark coverage | Incomplete | 14 of 64 properties currently have supported comparable estimates (21.9%); 50 records disclose direct listing evidence, but coverage is still concentrated in Vizag. |
| Workflow error history | Clear | The final inventory contained no failed or cancelled runs; successful runs were retained as release evidence. |
| Operational notifications | Partially verified | Task and GitHub failure-notification settings require account-level confirmation; repository files cannot prove them. |

## Current scores

These are evidence-based readiness estimates, not code-coverage measurements.

| Dimension | Progress |
| --- | ---: |
| Application implementation | 92% |
| Verification evidence | 84% |
| Deployment readiness | 100% |
| Scheduler implementation | 93% |
| End-to-end unattended automation | 55% |
| Market-comparison coverage | 23% |
| Overall production readiness | 82% |

The overall score remains below 100% because the missing evidence is operational and data-quality evidence, not because the current Pages deployment is unhealthy.

## Release evidence

- [PR #25: refresh direct listing evidence](https://github.com/varunjakkampudi-tech/property-lens/pull/25)
- [PR #25 quality run](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36480785724)
- [PR #25 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36481088532)
- [PR #29: correct stale Tanuku source classification](https://github.com/varunjakkampudi-tech/property-lens/pull/29)
- [PR #29 quality run](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36484655886)
- [PR #29 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36484969756)
- [PR #30: refresh production acceptance evidence](https://github.com/varunjakkampudi-tech/property-lens/pull/30)
- [PR #30 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36485639054)
- [PR #32: quarantine conflicting Eluru source](https://github.com/varunjakkampudi-tech/property-lens/pull/32)
- [PR #32 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36487810530)
- [PR #34: add verified Eluru listing evidence](https://github.com/varunjakkampudi-tech/property-lens/pull/34)
- [PR #34 quality run](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36489395756)
- [PR #34 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36489642362)
- [PR #36: add verified Bhimavaram listing evidence](https://github.com/varunjakkampudi-tech/property-lens/pull/36)
- [PR #36 quality run](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36491272580)
- [PR #36 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36491506410)
- [Manual publisher smoke test](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36483418521)
- Production URL: https://varunjakkampudi-tech.github.io/property-lens/

## Remaining acceptance gates

Keep [issue #7](https://github.com/varunjakkampudi-tech/property-lens/issues/7) open until two genuine unattended data-changing cycles are recorded, including the publisher credential path and release notifications. Keep [issue #8](https://github.com/varunjakkampudi-tech/property-lens/issues/8) open until comparable evidence is expanded and published transparently across the remaining cities and property types.

The cloud task must continue to obey public-source access rules: no login-wall or CAPTCHA bypass, no robots or rate-limit bypass, no fabricated facts, and no claim of exhaustive coverage. A no-op is a valid run when no permitted, evidence-backed lead is available, but it is not evidence of a data-changing deployment.
