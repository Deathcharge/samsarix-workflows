# Contributing to Samsarix Workflows

Samsarix Workflows is intentionally small. Contributions should improve the Python or npm reusable CI contracts, their validation, or their verified documentation without adding deployment, credentials, or unrelated platform scope.

## Set up

Prerequisites:

- Git 2.39 or newer;
- Node.js 20 or newer;
- npm with lockfile support;
- Python 3.12 or newer when changing the Python fixture.

```bash
git clone https://github.com/Deathcharge/samsarix-workflows.git
cd helix-workflows
npm ci
npm run check
npm test
```

Create a focused branch, make the smallest coherent change, and rerun all three commands. A pull request must also pass the GitHub-hosted `Validate workflows` pipeline, including actionlint and both consumer smoke jobs.

## Workflow contract rules

- Product workflows live directly in `.github/workflows/` and declare only `on.workflow_call`.
- Keep permissions at `contents: read` unless a separate, evidence-backed product contract genuinely requires more. Do not add `secrets: inherit`.
- Pin every external action to a full 40-character commit SHA and record the human release version in a comment.
- Set `persist-credentials: false` on checkout.
- Set a bounded timeout on every runner job.
- Never interpolate `inputs` or `github.event` values directly into a `run` script. Trusted command inputs must travel through an environment variable.
- Do not suppress failing quality, test, build, security, release, or publication commands with `continue-on-error`, `|| true`, or redirected errors.
- Keep defaults conservative in runner minutes and network usage.
- Add or update a consumer fixture when behavior changes.
- Update README input tables, examples, `CHANGELOG.md`, and `docs/PRODUCTIZATION.md` in the same pull request when the public contract changes.

## Tests

`npm run check` validates repository-specific security and contract invariants. `npm test` runs negative validator tests and fixture tests. The repository CI additionally runs actionlint and invokes both reusable workflows as real caller jobs.

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
