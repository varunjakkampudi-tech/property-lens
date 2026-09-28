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

## When discovery succeeds but publication is blocked

If the hourly ChatGPT task reports a **GitHub write safety-gate denial**, there is no new commit and therefore no Pages run to repair. The task must retain a reviewable source-backed data patch and report publication as blocked. Apply the patch through an explicitly authorized GitHub write session or configure a separate authorized repository publisher. Do not claim the existing successful Pages deployment includes uncommitted leads.

For a successful commit, the push-to-`main` workflow performs all validation and live exact-SHA checks automatically. A pending or failed workflow is not a verified release.

## Ongoing data updates

After the final code release, the hourly discovery task may update only `data/properties.js` and `data/review-queue.json`. Every material data commit triggers the same quality and deployment gates. The ChatGPT hourly task is **separate** from GitHub Actions and can only perform repository writes when its connected tools and permissions permit.

See [Lead operations](LEAD-OPERATIONS.md) and [Architecture](ARCHITECTURE.md).
