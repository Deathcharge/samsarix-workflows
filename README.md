# Samsarix Workflows

Reusable, least-privilege GitHub Actions CI for modern Python and npm projects.

Maintained by [Samsarix LLC](https://samsarix.com).

Samsarix Workflows gives maintainers one reviewed CI contract they can call from many repositories. It checks out the caller repository, prepares a bounded runtime matrix, runs the caller's trusted install/quality/test/build commands, fails on the first broken step in each job, and writes a short job summary.

**Maturity:** release candidate. The workflow files, local validators, negative security tests, and fixture commands pass locally. The final external gate is a successful run of this repository's `Validate workflows` pipeline on GitHub-hosted runners, followed by the owner-created first release tag.

This repository is independently usable and requires no Samsarix service, account, API, database, or secret. Its canonical GitHub coordinate is `Deathcharge/samsarix-workflows`.

## Choose a workflow

| Workflow | Intended caller | Default matrix | Required project convention |
| --- | --- | --- | --- |
| [`python-ci.yml`](.github/workflows/python-ci.yml) | Python package or application | Python 3.12 and 3.14 | `pyproject.toml`; the default install expects a `dev` extra containing pytest |
| [`node-ci.yml`](.github/workflows/node-ci.yml) | npm package or application | Node.js 22 and 24 | committed `package-lock.json` and a working `npm test` script |

Both workflows use Ubuntu GitHub-hosted runners by default. They request only `contents: read`, do not receive secrets, do not persist checkout credentials, and cap each matrix job at 20 minutes.

## Quick start

Prerequisites:

- a GitHub repository with GitHub Actions enabled;
- a supported Python or Node project matching the conventions above;
- permission to add a caller file under `.github/workflows/`.

For Python, copy [`examples/python-caller.yml`](examples/python-caller.yml) into the caller repository:

```bash
mkdir -p .github/workflows
cp examples/python-caller.yml .github/workflows/ci.yml
```

The resulting caller is:

```yaml
name: Python CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    uses: Deathcharge/samsarix-workflows/.github/workflows/python-ci.yml@master
    with:
      lint-command: python -m ruff check .
      typecheck-command: python -m mypy .
      build-command: python -m build
```

For npm, use [`examples/node-caller.yml`](examples/node-caller.yml):

```yaml
name: Node CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    uses: Deathcharge/samsarix-workflows/.github/workflows/node-ci.yml@master
```

`@master` is the evaluation reference until the first release exists. For production use, replace it with the full 40-character commit SHA from a successful release, for example `@0123456789abcdef0123456789abcdef01234567`. A future moving `@v0` tag may be more convenient but is less tamper-resistant than a commit SHA.

Push the caller file or open a pull request. GitHub shows one job per requested runtime. Failed install, lint, type-check, test, and build phases remain separate named steps, so the failing command is visible and reproducible locally. Fix the command and use GitHub's **Re-run failed jobs** action; there is no hidden retry loop.

## Python contract

Inputs are passed under the caller job's `with` key.

| Input | Type | Default | Behavior |
| --- | --- | --- | --- |
| `python-versions` | JSON string | `["3.12", "3.14"]` | Matrix consumed by `fromJSON`; malformed JSON fails before commands run. |
| `runs-on` | string | `ubuntu-latest` | Runner label selected by trusted workflow configuration. |
| `working-directory` | string | `.` | Directory for install, quality, test, and build commands. |
| `cache-dependency-path` | string | `**/pyproject.toml` | File or glob hashed for setup-python's pip cache. |
| `install-command` | string | `python -m pip install -e '.[dev]'` | Empty skips installation. |
| `lint-command` | string | empty | Empty skips linting. |
| `typecheck-command` | string | empty | Empty skips type checking. |
| `test-command` | string | `python -m pytest` | Empty skips tests intentionally. |
| `build-command` | string | empty | Empty skips building. |
| `fail-fast` | boolean | `false` | Whether the first failed version cancels other matrix jobs. |
| `timeout-minutes` | number | `20` | Maximum time for each matrix job. |

Example for a project using a requirements file and the standard library test runner:

```yaml
jobs:
  ci:
    uses: Deathcharge/samsarix-workflows/.github/workflows/python-ci.yml@master
    with:
      python-versions: '["3.13", "3.14"]'
      cache-dependency-path: requirements-dev.txt
      install-command: python -m pip install -r requirements-dev.txt
      test-command: python -m unittest discover -s tests
```

## Node contract

| Input | Type | Default | Behavior |
| --- | --- | --- | --- |
| `node-versions` | JSON string | `["22", "24"]` | Supported Node.js LTS matrix consumed by `fromJSON`. |
| `runs-on` | string | `ubuntu-latest` | Runner label selected by trusted workflow configuration. |
| `working-directory` | string | `.` | Directory for npm commands. |
| `cache-dependency-path` | string | `**/package-lock.json` | Lockfile or glob hashed for setup-node's npm cache. |
| `install-command` | string | `npm ci` | Empty skips installation. |
| `lint-command` | string | `npm run lint --if-present` | Missing script is intentionally skipped; a present failing script fails the job. |
| `typecheck-command` | string | `npm run typecheck --if-present` | Same fail/skip contract as lint. |
| `test-command` | string | `npm test` | Required by default; empty skips tests intentionally. |
| `build-command` | string | `npm run build --if-present` | Missing script is skipped; a present failing build fails. |
| `fail-fast` | boolean | `false` | Whether the first failed version cancels other matrix jobs. |
| `timeout-minutes` | number | `20` | Maximum time for each matrix job. |

Monorepo example:

```yaml
jobs:
  web:
    uses: Deathcharge/samsarix-workflows/.github/workflows/node-ci.yml@master
    with:
      working-directory: apps/web
      cache-dependency-path: apps/web/package-lock.json
```

## Command trust boundary

The `*-command` inputs intentionally execute shell commands. They are configuration for repository maintainers who already control both the caller workflow and the source being built. The reusable workflows place each command in an environment variable and execute it with `bash -euo pipefail -c`; they never splice the command into generated shell source.

Never construct a command input from a pull-request title or body, issue text, branch name, commit message, label, API response, or other untrusted event data. Do not pass secrets in command strings because GitHub may display commands and process output in logs.

## Development and verification

Repository maintainers need Node.js 20 or newer and npm. Consumers do not install this repository's tooling.

```bash
npm ci
npm run check
npm test
```

- `npm run check` parses every workflow, verifies both reusable contracts exist, enforces read-only permissions, requires timeouts and full action SHAs, checks checkout credential persistence, and rejects direct event/input interpolation in shell scripts.
- `npm test` runs the validator's negative tests and the Node consumer fixture through Node's built-in test runner.
- [`validate.yml`](.github/workflows/validate.yml) repeats those checks, downloads actionlint `v1.7.12` from its versioned release, verifies the archive SHA-256, runs actionlint, and calls both reusable workflows against minimal consumer fixtures.

There is no service to start and no distributable package to build. The release artifact is the tagged Git tree containing `.github/workflows/*.yml`.

## Architecture

The caller repository owns events, concurrency, source code, dependency manifests, commands, and any branch-protection policy. GitHub loads the selected reusable workflow revision and runs its matrix jobs in the caller's security context. `actions/checkout` therefore checks out the caller repository, not this workflow repository.

Repository validation has two independent layers:

1. a small locked Node/YAML validator for product-specific invariants and regression tests;
2. actionlint in GitHub CI for the broader GitHub Actions schema and expression language.

The workflows have no database, network service, telemetry, user accounts, or retained application data.

## Security, privacy, reliability, and cost

- External actions are pinned to full commits with their release versions recorded in comments.
- The `GITHUB_TOKEN` is read-only and checkout credentials are removed before caller commands run.
- No secrets are declared or inherited. Private dependency authentication is deliberately caller-owned and not part of the first-release contract.
- Commands fail closed. Optional steps are skipped only when their input is explicitly empty or, for npm lint/type-check/build, when the named script is absent.
- Every job has a timeout; the matrix uses `fail-fast: false` by default so one runtime does not hide compatibility results from another.
- Logs and summaries are stored by GitHub under the caller's retention settings. Samsarix Workflows collects nothing independently.
- Default cost is two runner jobs per called workflow. The hard ceiling is 40 runner-minutes per workflow call (two versions × 20 minutes); actual billed time depends on GitHub's plan, runner, and command duration. Reduce the version array and timeout for tighter budgets.
- Dependencies are downloaded by the caller's package manager and GitHub setup actions. Review lockfiles and dependency sources in each caller repository.

Follow [`SECURITY.md`](SECURITY.md) and report suspected vulnerabilities privately to `support@samsarix.com` with the subject prefix `[SECURITY] Samsarix Workflows`. Do not include credentials or sensitive logs in a public issue. GitHub private vulnerability reporting can be enabled later as an additional owner-controlled channel.

## Limitations

- Only Ubuntu, pip-compatible Python projects, and npm lockfiles are covered in the first release.
- Poetry, uv, pnpm, Yarn, Windows, macOS, service containers, coverage upload, package publication, deployment, and provenance generation are out of scope.
- Callers cannot append steps to a job that calls a reusable workflow; create a separate dependent job when extra behavior is needed.
- GitHub-hosted execution cannot be perfectly reproduced locally. A branch push or pull request is required for the final smoke test.
- The existing BSL production-use metric is ambiguous for workflow invocations; organizations considering commercial production use should obtain owner/legal clarification.

## Releases and updates

There is no published tag yet. [`CHANGELOG.md`](CHANGELOG.md) records the proposed `v0.1.0` scope. The owner-controlled release process is:

1. merge after `Validate workflows` passes on GitHub;
2. create immutable tag `v0.1.0` and a GitHub Release;
3. optionally move a documented compatibility tag `v0` to that commit;
4. update consumers deliberately, preferably through reviewed dependency-update pull requests.

This repository does not publish to npm, PyPI, GitHub Packages, or any cloud service.

## Contributing and support

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the required local checks and workflow contract rules and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations. Use [GitHub Issues](https://github.com/Deathcharge/samsarix-workflows/issues) for reproducible bugs and narrowly scoped feature requests, `support@samsarix.com` for private support or security matters, and `contact@samsarix.com` for general or commercial inquiries. Do not send secrets in issues.

## License

The repository contains a Business Source License 1.1 grant from Samsarix LLC with a change date of June 16, 2027, after which the stated change license is Apache License 2.0. The license text includes additional production-use terms. Read [`LICENSE`](LICENSE) and obtain owner/legal advice for commercial use. The branding update changes identifying and contact information without interpreting the license terms.
