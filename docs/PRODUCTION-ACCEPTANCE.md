# Property Lens production acceptance

**Evidence snapshot:** 2026-09-29 IST  
**Verified default-branch commit:** `7117f64fa9cfe6d188809df6d20ef7b55283b49e`

This document records what is verified, what is implemented but not yet proven in unattended operation, and what remains an owner or data-quality requirement. It deliberately does not treat a configured scheduler as evidence that a scheduled cycle has executed.

## Acceptance summary

| Area | Status | Evidence or remaining requirement |
| --- | --- | --- |
| GitHub Pages deployment | Passed | Production workflow [36478714282](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36478714282) passed for the exact `main` commit. |
| Live production health | Passed | Six public assets passed exact-SHA verification; 61/61 published records are fresh. |
| Release quality gates | Passed | PR quality workflows pass syntax, data, unit, responsive browser and accessibility checks. |
| Branch protection | Passed | `main` requires `quality`, enforces linear history, and disallows force pushes and deletions. |
| Active scheduler | Configured | One active ChatGPT cloud heartbeat is configured for every two hours. |
| Competing scheduler | Removed | The repository feed workflow is manual-only; it has no cron trigger and cannot compete with the cloud task. |
| Protected publisher | Implemented | Data-only PR creation, bounded retries, duplicate-PR handling and squash auto-merge are implemented. |
| Genuine unattended cycles | Not yet proven | At least two independent cloud runs must produce discovery evidence, a data-only PR, protected merge, Pages deployment and exact-SHA health evidence. |
| Market benchmark coverage | Incomplete | 14 of 61 properties currently have supported comparable estimates; coverage is concentrated in Vizag. |
| Operational notifications | Partially verified | Task and GitHub failure-notification settings require account-level confirmation; repository files cannot prove them. |

## Current scores

These are evidence-based readiness estimates, not code-coverage measurements.

| Dimension | Progress |
| --- | ---: |
| Application implementation | 92% |
| Verification evidence | 84% |
| Deployment readiness | 99% |
| Scheduler implementation | 93% |
| End-to-end unattended automation | 55% |
| Market-comparison coverage | 23% |
| Overall production readiness | 82% |

The overall score remains below 100% because the missing evidence is operational and data-quality evidence, not because the current Pages deployment is unhealthy.

## Release evidence

- [PR #23: make feed discovery manual only](https://github.com/varunjakkampudi-tech/property-lens/pull/23)
- [PR #23 quality run](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36478429833)
- [PR #23 production deployment](https://github.com/varunjakkampudi-tech/property-lens/actions/runs/36478714282)
- Production URL: https://varunjakkampudi-tech.github.io/property-lens/

## Remaining acceptance gates

Keep [issue #7](https://github.com/varunjakkampudi-tech/property-lens/issues/7) open until two genuine unattended data-changing cycles are recorded, including the publisher credential path and release notifications. Keep [issue #8](https://github.com/varunjakkampudi-tech/property-lens/issues/8) open until comparable evidence is expanded and published transparently across the remaining cities and property types.

The cloud task must continue to obey public-source access rules: no login-wall or CAPTCHA bypass, no robots or rate-limit bypass, no fabricated facts, and no claim of exhaustive coverage. A no-op is a valid run when no permitted, evidence-backed lead is available, but it is not evidence of a data-changing deployment.
