# Contributing to Samsarix Workflows

Samsarix Workflows is intentionally focused. Contributions should improve the uv, pip-compatible Python, or npm reusable CI contracts, their validation, or their verified documentation without adding deployment, credentials, or unrelated platform scope.

## Set up

Prerequisites:

- Git 2.39 or newer;
- Node.js 20 or newer;
- npm with lockfile support;
- Python 3.12 or newer when changing the Python fixture.
- uv 0.12.0 when changing the locked uv fixture.

```bash
git clone https://github.com/Deathcharge/samsarix-workflows.git
cd samsarix-workflows
npm ci
npm run check
npm test
```

Create a focused branch, make the smallest coherent change, and rerun all three commands. A pull request must also pass the GitHub-hosted `Validate workflows` pipeline, including actionlint and all consumer smoke jobs.

## Workflow contract rules

- Product workflows live directly in `.github/workflows/` and declare only `on.workflow_call`.
- Keep workflow and job permissions at no more than `contents: read`. Do not declare or inherit secrets, reference `secrets` or `github.token`, or select a protected environment.
- Pin every external action to a full 40-character commit SHA and record the human release version in a comment.
- Pin every external reusable-workflow caller to a reviewed full commit SHA.
- Set `persist-credentials: false` on checkout.
- Set a bounded timeout on every runner job.
- Bound every reusable matrix with numeric `max-parallel` and `timeout-minutes` inputs, exact job wiring, and defaults of no more than two jobs and 40 configured runner-minutes.
- Never interpolate a GitHub expression directly into a `run` script. Trusted command inputs must travel through an environment variable.
- Do not use step-level local actions; all executed action code must be visible to full-SHA and checkout validation.
- Do not suppress failing quality, test, build, security, release, or publication commands with `continue-on-error`, `|| true`, or redirected errors.
- Keep defaults conservative in runner minutes and network usage.
- Add or update a consumer fixture when behavior changes.
- Update README input tables, examples, `CHANGELOG.md`, and `docs/PRODUCTIZATION.md` in the same pull request when the public contract changes.

## Tests

`npm run check` validates repository-specific security and contract invariants. `npm test` runs negative validator tests and fixture tests. The repository CI additionally runs actionlint and invokes all reusable workflows as real caller jobs.

When fixing a bug, add the smallest regression test that fails before the fix. Do not make the validator accept invalid workflows merely to silence a check; fix the workflow or document a narrow, tested exception.

## Pull requests

Include:

- the user problem and why it belongs in this product;
- the workflow contract change, if any;
- exact commands run and their results;
- expected runner-minute or dependency impact;
- security or permission changes;
- any GitHub-only behavior that could not be reproduced locally.

Avoid drive-by dependency upgrades, generated formatting churn, and unrelated documentation rewrites. Maintainers may request that broad features start as an issue so the product boundary remains coherent.

## Security reports

Follow [`SECURITY.md`](SECURITY.md). Do not disclose credentials, private workflow logs, or suspected exploitable behavior in a public issue. Email `support@samsarix.com` with the subject prefix `[SECURITY] Samsarix Workflows`; include only the minimum detail needed to begin a private investigation.

## Conduct and license

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Contributions are accepted under the repository's existing [`LICENSE`](LICENSE); contributors should not change license terms without explicit owner approval. General project questions may be sent to `contact@samsarix.com`.
