# Productization Record

Last updated: 2026-08-08

## Repository assessment

The repository was intended to centralize GitHub Actions workflows for projects under the former Helix branding. At baseline, the tracked tree contained only `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, and `.gitignore`. The latest commit (`87f1151`) had deleted all five advertised workflow files with the message `Remove workflows temporarily for push`, while the README still labeled the product production ready.

The removed initial workflows were not reusable: they used `push`, `pull_request`, `schedule`, or tag triggers and did not declare `workflow_call`. Several important checks and every package-publication command suppressed failures. External actions used mutable major, `main`, or `master` references; release jobs accepted long-lived registry tokens; and the repository had no tests or CI protecting workflow syntax.

## Chosen product

Samsarix Workflows is a focused library of callable GitHub Actions CI workflows for maintainers of modern uv, pip-compatible Python, and npm repositories. Its product wedge is predictable, low-configuration CI with explicit contracts, conservative permissions, pinned action dependencies, bounded runtime and concurrency, and testable examples. The code is ready for independent use, but the GitHub repository is currently private, so external distribution still depends on repository visibility and Actions-access settings.

It is independently useful because any GitHub repository can call it; it has no dependency on the former `helix-unified` application, private Samsarix services, credentials, a database, or cloud infrastructure.

### Target user and primary use case

The target user is a maintainer who wants consistent pull-request CI across one or more uv, pip-compatible Python, or npm repositories without copying a full workflow into each repository.

Primary journey:

1. Copy the appropriate caller example into `.github/workflows/ci.yml`.
2. Grant only `contents: read` and select a released workflow ref.
3. Push or open a pull request.
4. The reusable workflow checks out the caller, installs dependencies, runs configured quality/test/build commands across a bounded version matrix, and writes an explicit job summary.
5. A failed named step identifies the command to reproduce locally; the user fixes it and reruns the workflow.

### Deliberate non-goals

- Publishing packages, creating releases, or deploying infrastructure.
- Managing credentials, environments, branch protection, or repository settings.
- Pretending one generic security scan replaces GitHub code scanning, Dependabot, or ecosystem-specific tools.
- Supporting package managers other than uv, pip-compatible Python projects, and npm in the first release.
- Reproducing any application functionality from the former `helix-unified` application.

## Product and architecture decisions

- Provide separate `uv-ci.yml`, `python-ci.yml`, and `node-ci.yml` workflow contracts; avoid an opaque auto-detecting workflow.
- Use `workflow_call` only for product workflows. The caller owns triggers and concurrency.
- Default Python to 3.12 and 3.14 (supported floor plus current stable) and Node to the 22/24 LTS lines. Matrices are JSON inputs so maintainers can match their support policy.
- Treat command inputs as trusted repository configuration. Pass them through environment variables to `bash -c`; never interpolate `inputs` or event payloads directly into generated shell source.
- Use GitHub-hosted Ubuntu runners by default, read-only token permissions, non-persisted checkout credentials, full action commit SHAs, fail-closed steps, 20-minute per-job timeouts, and a caller-configurable default concurrency bound of two matrix jobs.
- Keep repository tooling private and minimal: Node's built-in test runner plus the locked `yaml` parser. CI also verifies an actionlint release archive by SHA-256 before execution.
- Dogfood all reusable workflows against minimal fixture repositories in this repository's CI; the uv fixture exercises an exact tool version and locked sync/test path, the Python fixture exercises the default editable `.[dev]` install and pytest command, and Node exercises all default npm phases.
- Dependency-license review found ISC for the locked `yaml` validator dependency and MIT for actionlint and the referenced GitHub-owned setup/checkout actions; the repository itself remains under its existing BSL terms.

## Assumptions

- Callers review changes to their workflow files and do not populate command inputs from pull-request titles, issue text, branch names, or other untrusted event data.
- GitHub-hosted runners are acceptable for the first release. A caller-selected runner label is trusted configuration.
- Python callers use a `pyproject.toml` and provide their test tools through a `dev` extra, or override the commands.
- Node callers commit `package-lock.json` and support `npm ci`.
- Existing BSL 1.1 terms reflect owner intent. The 2026 Samsarix branding pass updates the licensor, product name, commercial contact, and verified pricing URL without interpreting the usage threshold or other terms.

## Bounded ecosystem research

- [GitHub's reusable-workflow contract](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows) requires `on.workflow_call`, inputs/secrets are explicit, and callers invoke a reusable workflow as a job.
- [GitHub documents](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations) that permissions can only be maintained or reduced through nested reusable workflows, and its [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) supports explicit least-privilege `GITHUB_TOKEN` permissions.
- GitHub recommends full commit-SHA pins for actions. Current checked pins resolve to checkout `v6.0.2`, setup-python `v6.2.0`, and setup-node `v6.4.0` in their official Git repositories.
- GitHub's [starter-workflows](https://github.com/actions/starter-workflows) repository provides copyable templates, while [SLSA's generators](https://github.com/slsa-framework/slsa-github-generator) focus on provenance and [StepSecurity](https://github.com/step-security/harden-runner) focuses on runner monitoring. This repository therefore stays in the narrower reusable CI-contract layer.
- Broad linters such as [MegaLinter](https://github.com/oxsecurity/megalinter) and GitHub Actions analyzers such as [zizmor](https://github.com/zizmorcore/zizmor) already cover language aggregation and workflow vulnerability discovery. Samsarix should compose with those tools rather than duplicate them.
- GitHub's matrix strategy supports [`max-parallel`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations), giving callers a native way to control concurrent runner spend.
- Astral recommends the official [`setup-uv`](https://github.com/astral-sh/setup-uv) action and locked `uv run` in CI. The selected action release is immutable and is still referenced by full commit SHA.
- GitHub Dependabot now supports the [`uv` ecosystem](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), so the committed fixture lock can be maintained without treating it as pip.
- As of 2026-07-28, [Node 22 and 24 are LTS and Node 26 is Current](https://nodejs.org/en/about/previous-releases); [Python 3.14 is the current stable feature line while 3.12 remains security-supported](https://www.python.org/downloads/).

## Baseline command results

| Command/check | Baseline result |
| --- | --- |
| `git status --short --branch --untracked-files=all` | Pass; clean `master` tracking `origin/master`. |
| `git fsck --full --no-reflogs` | Pass; no integrity errors. |
| `rg --files --hidden -g !.git/**` | Five tracked files; no workflows, manifests, tests, examples, or CI. |
| Install | Not defined; no package manifest or lockfile. |
| Lint/type-check/test/build/start | Not defined; no executable product or scripts. |
| README journey | Fail; every advertised workflow path was absent. |

Final command results are recorded below as they are run; results must not be inferred from configuration.

## Findings and priorities

### P0

- [x] Restore an executable product: every workflow advertised at baseline was absent.
- [x] Make product workflows genuinely reusable with `workflow_call`.
- [x] Verify the final workflow files with repository checks and actionlint.
- [ ] Exercise the product through its caller-level uv, pip, and npm fixture journeys on GitHub-hosted runners (owner/external gate until pushed).

### P1

- [x] Remove fail-open lint, type-check, security, and publication behavior from the core path.
- [x] Replace mutable action references with full commit-SHA pins.
- [x] Add explicit least-privilege permissions, disabled checkout credential persistence, and timeouts.
- [x] Remove token-based package publication and release side effects from product scope.
- [x] Add a lockfile-backed validator, negative security tests, and repository CI.
- [x] Replace the inaccurate README and contribution instructions.
- [x] Finish the standard repository security scan and adversarial final review.

### P2

- [x] Add a first-class locked uv workflow and consumer fixture.
- [ ] Add pnpm/Yarn workflows only after demand is demonstrated.
- [ ] Add release automation for immutable `v0` tag movement after owner policy is defined.
- [x] Repair the truncated Code of Conduct using the owner-provided Samsarix enforcement contact and the existing Contributor Covenant 2.1 basis.

## Implementation checklist

- [x] Python reusable CI contract.
- [x] Node/npm reusable CI contract.
- [x] uv reusable CI contract with locked sync/test defaults.
- [x] Fail/skip semantics for install, lint, type check, tests, and build.
- [x] Matrix defaults, caller overrides, and concurrency budgets.
- [x] Read-only permissions and supply-chain pins.
- [x] Job summaries and bounded timeouts.
- [x] Deterministic repository tooling manifest.
- [x] Structural/security validator with negative tests.
- [x] CI consumer smoke fixtures.
- [x] Generated lockfiles.
- [x] Accurate README and contribution guide.
- [x] Samsarix LLC branding, working support/contact endpoints, and complete conduct guidance.
- [x] Owner-approved root security policy with private reporting and scanner boundaries.
- [x] Dependabot configuration and structured issue/pull-request intake.
- [x] Local and independent workflow verification.

## Release acceptance criteria

- `npm ci`, `npm run check`, and `npm test` pass from a clean checkout.
- actionlint passes all `.github/workflows/*.yml` files.
- The repository CI calls all three reusable workflows successfully on GitHub-hosted runners.
- README quick starts match the released workflow contracts and use an immutable release reference for production guidance.
- No locally actionable P0 remains and all owner-controlled gates are explicit.
- The owner confirms license/commercial-use wording and creates the first release/tag.

## Completed work

- Defined the narrow product and removed release/deployment/security-dashboard scope.
- Added Python and npm workflow contracts, validation tooling, negative tests, CI, fixtures, examples, and changelog.
- Replaced the stale README and contribution guide with the implemented contracts, error/retry behavior, trust boundary, cost model, limitations, and release process.
- Verified the workflow set with the repository validator, Node tests, Python fixture, and independently downloaded actionlint `v1.7.12` after matching its published SHA-256.
- Tightened the adversarial review gaps: Python CI now dogfoods its default onboarding path, and the validator also rejects mutable external reusable-workflow jobs plus bracket-notation shell interpolation.
- Completed a standard 22-file source security scan with explicit per-file coverage, no unresolved candidates, and no reportable findings. The generated report remains an external scan artifact rather than a tracked product file.
- Rebranded product-facing names, internal runtime labels, and external references for Samsarix LLC and the canonical `Deathcharge/samsarix-workflows` coordinate.
- Replaced stale contact and pricing endpoints, completed community enforcement guidance, and added automated dependency and contribution intake configuration.
- Created a protected feature branch; no pre-existing user changes existed.

## Deferred and externally blocked work

- The current uv/concurrency release candidate still requires a pushed branch or pull request and a successful GitHub-hosted workflow run.
- Creating `v0.1.0`, moving a compatibility `v0` tag, and publishing a GitHub Release are owner-controlled release actions.
- Branch protection and required checks are repository-owner settings.
- The BSL production-use threshold refers to `API calls or equivalent usage metric`, which is ambiguous for a workflow library and still requires owner/legal clarification. The Samsarix pricing page and commercial contact now resolve.
- The canonical GitHub coordinate is `Deathcharge/samsarix-workflows`, but the repository is private. Independent callers require repository access and an Actions policy that permits access; public distribution requires an explicit owner visibility decision.
- GitHub private vulnerability reporting remains an optional repository setting; the approved root security policy provides `support@samsarix.com` as the working private channel.

## Known risks

- A caller can intentionally execute arbitrary code through command inputs; this is part of the workflow contract and must remain restricted to trusted workflow configuration.
- Full-SHA action pins reduce tag-retargeting risk but require deliberate update maintenance.
- Matrix size directly multiplies GitHub Actions minutes. Defaults create two jobs per called workflow, each capped at 20 minutes and no more than two running concurrently; callers can reduce versions, `max-parallel`, and timeout.
- GitHub-hosted behavior cannot be perfectly reproduced locally; actionlint and consumer fixtures reduce but do not eliminate that platform gate.
- The repository CI downloads actionlint from a versioned release and verifies a pinned SHA-256; GitHub availability remains an external dependency.

## Distribution and sustainability

The intended distribution is a tagged GitHub repository. Consumers reference a workflow path at an immutable commit SHA for maximum integrity; the owner may maintain a convenient moving `v0` tag with documented trust tradeoffs. The current private repository is suitable for permitted internal callers but not yet general public distribution. No hosted service or operating infrastructure is required.

Sustainability should remain maintenance-based: small reviewed releases, Dependabot update proposals, and optionally commercial support consistent with the existing license after the owner clarifies its workflow-specific usage metric. There is no credible basis for subscriptions, usage billing, or paid infrastructure at this stage.

## Final verification results

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --offline` | Pass; installed the one integrity-locked validator dependency. |
| `npm run check` | Pass; validated all four `.github/workflows` files and all three required product contracts. |
| `npm test` / `node --test` | Pass; fourteen tests cover repository contracts, examples, documentation links, GitHub metadata, concurrency wiring, locked uv defaults, action pins, reusable-job pins, and dot/bracket shell interpolation. |
| `python -m pip install -e .[dev]` in a fresh fixture venv | Pass on Python 3.14.6; built the editable fixture and installed pinned pytest `9.1.1`. |
| `python -m pytest` in the installed fixture | Pass; one test collected and passed on Python 3.14.6. |
| uv `0.12.0` `sync --locked` and `run --locked pytest` | Pass on Python 3.14.6; the exact build backend produced the editable fixture and one test passed without changing `uv.lock`. |
| Node fixture `npm ci`, lint, typecheck, test, and build defaults | Pass; every default phase exited 0 and one Node test passed. |
| actionlint `v1.7.12` over workflows and caller examples | Pass; exit 0 after the downloaded Windows archive matched published SHA-256 `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`. |
| `npm audit --audit-level=moderate` | Pass; reported `found 0 vulnerabilities`. |
| `git diff --check` | Pass at the pre-commit verification point; rerun after final documentation edits. |

### Remaining work ordered by value

1. Owner/external P0 gate: push the branch or open a pull request and require all four `Validate workflows` jobs (`repository`, `python-smoke`, `uv-smoke`, `node-smoke`) to pass on GitHub-hosted runners.
2. Owner/distribution P0 gate: configure repository visibility and reusable-workflow Actions access for the intended caller audience.
3. Owner/external P1 gate: create immutable `v0.1.0` only from the verified commit, optionally maintain a documented `v0` compatibility tag, and configure required status checks.
4. Owner/legal P1 gate: clarify the BSL production-use metric for a workflow invocation before inviting commercial adoption.
5. Adoption P1 gate: record at least one real caller at an immutable ref and its maintenance/compatibility outcome.
6. P2 after user evidence: consider pnpm/Yarn, artifacts/test reports, and additional runner operating systems; do not add them speculatively.

### Release disposition

Release candidate with named external gates. No locally actionable P0 remains: local installation and validation pass, uv, pip, and npm consumer journeys pass, and the source audit found no credential pattern. It is not release-ready until the GitHub-hosted caller jobs pass and the owner completes the distribution, tag, and workflow-specific license decisions; GitHub private vulnerability reporting remains an optional follow-up.
