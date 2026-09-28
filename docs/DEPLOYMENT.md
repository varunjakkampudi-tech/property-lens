# Deployment and release verification

**Production:** https://varunjakkampudi-tech.github.io/property-lens/  
**Workflow:** [Production E2E and deploy Property Lens](../.github/workflows/pages.yml)  
**Trigger:** A push to `main` or an explicit `workflow_dispatch`. Pull requests run [quality checks](../.github/workflows/quality.yml) without publishing.

## Initial GitHub Pages configuration

In **Settings → Pages**, choose **GitHub Actions** as the build/deployment source. The deployment job needs the repository's configured Pages environment and the workflow's `pages: write` and `id-token: write` permissions. Do not store secrets in the public repository or browser JavaScript.

## Local release validation

```bash
npm ci
npx playwright install chromium
npm run test:quality
```

Playwright starts the allowlisted local server automatically. The workflow uses Node.js 22, validates source/data/unit tests, installs Chromium, runs desktop and 375/390/430px mobile E2E and axe, then builds a clean `_site` artifact containing only the public site files.

## Exact-commit deployment verification

1. Merge the reviewed change to `main` after PR checks pass.
2. Find the Pages workflow run whose `head_sha` matches the merged commit.
3. Require `status=completed` and `conclusion=success`, including the **Verify live website and deployed commit** step.
4. The workflow checks the live `deploy-version.txt` against the expected SHA, plus homepage, `data/properties.js`, `assets/mobile-location.js`, `assets/core.js`, `assets/design-refresh.css` and `assets/icons.svg`.
5. If the run is queued, cancelled, failed or still running, do **not** report a successful deployment. Inspect its failing step and preserve the last known good release.

The workflow retains Playwright screenshots, traces and HTML reports as short-lived artifacts for debugging. A successful workflow is stronger evidence than a green local build because it verifies the public Pages CDN after deployment.

## Daily production health and freshness

The read-only [Daily production health](../.github/workflows/production-health.yml) workflow runs every day at approximately 08:47 IST (GitHub may delay scheduled jobs) and supports manual `workflow_dispatch`. It verifies the exact default-branch SHA against the live `deploy-version.txt`, checks the homepage and five critical public assets, and assesses source-check freshness per city. A city with published leads and no source check within 14 days causes the health run to fail. The workflow does not mutate leads, infer seller availability or circumvent the scheduled research task's GitHub write restrictions. Its unit tests run in the PR and production release quality gates.

A failing daily health check is an operational alert, not evidence that an individual property is sold. Investigate the exact SHA, source-check dates and failing asset; perform a real source review before changing `verifiedOn`. Do not fabricate dates to clear the check.

## GitHub repository protections (owner configuration)

For an enforceable production release policy, configure a GitHub ruleset or branch protection for `main` in **Settings → Rules → Rulesets** or **Settings → Branches**, subject to your account's available controls. Require pull requests for application/workflow changes, the **Pull request quality / quality** status check, and prevent force pushes/deletions. Keep Pages publishing limited to the tested `main` workflow. Allow the explicitly authorized data publisher only the minimal exception necessary for reviewed data-only updates; never grant it a blanket quality-gate bypass. Check GitHub Actions permissions and GitHub Pages source in repository settings. These administrative settings cannot be established or verified by changing repository files alone.

## Ongoing data updates

The active two-hour ChatGPT discovery task may update only `data/properties.js` and `data/review-queue.json`. Every material data PR triggers the same quality and deployment gates, with squash auto-merge after the required `quality` check passes. The GitHub Actions feed workflow is a separate inactive alternative until an approved feed is configured; it must not compete with the ChatGPT publisher.

See [Lead operations](LEAD-OPERATIONS.md) and [Architecture](ARCHITECTURE.md).
