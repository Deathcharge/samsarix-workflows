# Samsarix Workflows

Reusable, least-privilege GitHub Actions CI for modern Python (pip or uv) and npm projects.

Maintained by [Samsarix LLC](https://samsarix.com).

Samsarix Workflows gives maintainers one reviewed CI contract they can call from many repositories. It checks out the caller repository, prepares a bounded runtime matrix, runs the caller's trusted install/quality/test/build commands, fails on the first broken step in each job, and writes a short job summary.

**Maturity:** release candidate. The workflow files, local validators, negative security tests, and fixture commands pass locally. Every release candidate must also pass this repository's `Validate workflows` pipeline on GitHub-hosted runners before merge and release.

This repository is independently usable and requires no Samsarix service, account, API, database, or secret. Its canonical GitHub coordinate is `Deathcharge/samsarix-workflows`.

## Choose a workflow

| Workflow | Intended caller | Default matrix | Required project convention |
| --- | --- | --- | --- |
| [`uv-ci.yml`](.github/workflows/uv-ci.yml) | Locked uv project or workspace | Python 3.12 and 3.14 | committed `uv.lock`; the default dev group contains pytest |
| [`python-ci.yml`](.github/workflows/python-ci.yml) | pip-compatible Python package or application | Python 3.12 and 3.14 | `pyproject.toml`; the default install expects a `dev` extra containing pytest |
| [`node-ci.yml`](.github/workflows/node-ci.yml) | npm package or application | Node.js 22 and 24 | committed `package-lock.json` and a working `npm test` script |

All workflows use Ubuntu GitHub-hosted runners by default. They request only `contents: read`, do not receive secrets, do not persist checkout credentials, cap each matrix job at 20 minutes, and run at most two matrix jobs concurrently by default.

## Quick start

Prerequisites:

- a GitHub repository with GitHub Actions enabled;
- a supported uv, pip-compatible Python, or npm project matching the conventions above;
- permission to add a caller file under `.github/workflows/`.

For a project with a committed `uv.lock`, copy [`examples/uv-caller.yml`](examples/uv-caller.yml). It defaults to `uv sync --locked` and `uv run --locked pytest`, so missing or stale lockfiles fail closed.

For a pip-compatible Python project, copy [`examples/python-caller.yml`](examples/python-caller.yml) into the caller repository:

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
    uses: Deathcharge/samsarix-workflows/.github/workflows/python-ci.yml@3a0309cd76820de898f4ff250cfbe01009c8598a
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
    uses: Deathcharge/samsarix-workflows/.github/workflows/node-ci.yml@3a0309cd76820de898f4ff250cfbe01009c8598a
```

The examples pin commit `3a0309cd76820de898f4ff250cfbe01009c8598a`, the immutable revision containing the documented workflow contracts. Review release notes and update this SHA deliberately. A moving major tag may be more convenient, but a commit SHA is more resistant to reference retargeting.

The public repository can be called from other GitHub repositories without a Samsarix account. The caller still owns its GitHub Actions availability, policy, runner use, and billing.

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
| `max-parallel` | number | `2` | Maximum matrix jobs that run concurrently; it does not reduce total runner-minutes. |
| `timeout-minutes` | number | `20` | Maximum time for each matrix job. |

Example for a project using a requirements file and the standard library test runner:

```yaml
jobs:
  ci:
    uses: Deathcharge/samsarix-workflows/.github/workflows/python-ci.yml@3a0309cd76820de898f4ff250cfbe01009c8598a
    with:
      python-versions: '["3.13", "3.14"]'
      cache-dependency-path: requirements-dev.txt
      install-command: python -m pip install -r requirements-dev.txt
      test-command: python -m unittest discover -s tests
```

## uv contract

| Input | Type | Default | Behavior |
| --- | --- | --- | --- |
| `python-versions` | JSON string | `["3.12", "3.14"]` | Python matrix consumed by `fromJSON`; malformed JSON fails before commands run. |
| `uv-version` | string | `0.12.0` | Exact uv release installed by the pinned official setup action. |
| `runs-on` | string | `ubuntu-latest` | Runner label selected by trusted workflow configuration. |
| `working-directory` | string | `.` | uv project or workspace directory. |
| `cache-dependency-glob` | string | `**/uv.lock` | Repository-relative glob used for the uv cache key. |
| `sync-command` | string | `uv sync --locked` | Exact locked sync; empty skips synchronization. |
| `lint-command` | string | empty | Empty skips linting. |
| `typecheck-command` | string | empty | Empty skips type checking. |
| `test-command` | string | `uv run --locked pytest` | Runs tests without changing the lockfile; empty skips tests. |
| `build-command` | string | empty | Empty skips building. |
| `fail-fast` | boolean | `false` | Whether the first failed version cancels other matrix jobs. |
| `max-parallel` | number | `2` | Maximum matrix jobs that run concurrently. |
| `timeout-minutes` | number | `20` | Maximum time for each matrix job. |

The setup action and uv executable are versioned separately. Update `uv-version` deliberately when a caller's `[tool.uv].required-version` changes.

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
| `max-parallel` | number | `2` | Maximum matrix jobs that run concurrently; it does not reduce total runner-minutes. |
| `timeout-minutes` | number | `20` | Maximum time for each matrix job. |

Monorepo example:

```yaml
jobs:
  web:
    uses: Deathcharge/samsarix-workflows/.github/workflows/node-ci.yml@3a0309cd76820de898f4ff250cfbe01009c8598a
    with:
      working-directory: apps/web
      cache-dependency-path: apps/web/package-lock.json
```

For a repository with a uv backend and npm frontend, copy [`examples/polyglot-caller.yml`](examples/polyglot-caller.yml). The jobs stay independently retryable and can run in parallel without hiding either ecosystem behind auto-detection.

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

- `npm run check` parses every workflow and caller example. It verifies the reusable contracts, exact default budgets, read-only workflow and job permissions, secret/token isolation, full action SHAs, checkout credential removal, and fail-closed shell behavior. It also rejects local action indirection and direct GitHub-expression interpolation in shell scripts.
- `npm test` runs adversarial validator regressions, documentation/contract assertions, and the Node consumer fixture through Node's built-in test runner.
- [`validate.yml`](.github/workflows/validate.yml) first downloads actionlint `v1.7.12` into a fresh runner-temporary directory, verifies the archive SHA-256, and runs it before repository-controlled npm code. It then repeats repository checks and calls all three reusable workflows against minimal consumer fixtures.

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
- The default matrix has a configured ceiling of 40 runner-minutes per workflow call (two versions × 20 minutes), with at most two jobs running concurrently; actual billed time depends on GitHub's plan, runner, and command duration. Reduce the version array or timeout to lower the ceiling. Reduce `max-parallel` to limit concurrent capacity, not total runner-minutes.
- Dependencies are downloaded by the caller's package manager and GitHub setup actions. Review lockfiles and dependency sources in each caller repository.

Follow [`SECURITY.md`](SECURITY.md) and report suspected vulnerabilities through GitHub's private **Report a vulnerability** form or to `support@samsarix.com` with the subject prefix `[SECURITY] Samsarix Workflows`. Do not include credentials or sensitive logs in a public issue.

## Limitations

- Only Ubuntu, pip-compatible Python projects, locked uv projects, and npm lockfiles are covered in the first release.
- Poetry, pnpm, Yarn, Windows, macOS, service containers, coverage upload, package publication, deployment, and provenance generation are out of scope.
- Callers cannot append steps to a job that calls a reusable workflow; create a separate dependent job when extra behavior is needed.
- GitHub-hosted execution cannot be perfectly reproduced locally. A branch push or pull request is required for the final smoke test.
- This is source-available software under BSL 1.1, not open-source software before the Change Date. Organizations should review the license and obtain counsel for commercial reliance.

## Releases and updates

[`CHANGELOG.md`](CHANGELOG.md) records the `v0.1.0` scope. Every release follows this process:

1. merge after `Validate workflows` passes on GitHub;
2. create an immutable version tag and GitHub Release from the verified default-branch commit;
3. optionally maintain a documented moving compatibility tag;
4. update consumers deliberately, preferably through reviewed dependency-update pull requests.

This repository does not publish to npm, PyPI, GitHub Packages, or any cloud service.

## Contributing and support

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the required local checks and workflow contract rules and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations. Use [GitHub Issues](https://github.com/Deathcharge/samsarix-workflows/issues) for reproducible bugs and narrowly scoped feature requests, `support@samsarix.com` for private support or security matters, and `contact@samsarix.com` for general or commercial inquiries. Do not send secrets in issues.

## License

Samsarix LLC distributes this source under the Business Source License 1.1. The Additional Use Grant permits up to 1,000 Workflow Calls per calendar month; one initial caller-job invocation or re-run is one call, while its matrix expansion is not. On June 16, 2027, or the earlier date required by BSL 1.1, the applicable version converts to Apache License 2.0. This is source-available rather than open source before that conversion. Read [`LICENSE`](LICENSE); this summary is not legal advice and does not replace the license.
