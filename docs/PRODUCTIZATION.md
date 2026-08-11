# Productization Record

Last updated: 2026-08-11

## Product decision

Samsarix Workflows is an independently useful library of callable GitHub Actions CI contracts for locked uv projects, pip-compatible Python projects, and npm projects. Its wedge is deliberately narrow: reviewed onboarding, conservative authority, predictable default runner use, and enough validation that maintainers can share CI without copying and auditing large workflow files in every repository.

The product requires no Samsarix service, account, API, database, credential, or hosted infrastructure. Samsarix LLC maintains the public `Deathcharge/samsarix-workflows` repository, documentation, security policy, and commercial licensing contact.

### Baseline repaired

At baseline the tracked tree contained documentation but none of its advertised workflow files. Earlier workflow history used repository triggers rather than `workflow_call`, mutable action references, long-lived publication credentials, and fail-open quality/publication commands. There was no executable repository validator or CI protecting the contract.

The productized repository now provides separate `uv-ci.yml`, `python-ci.yml`, and `node-ci.yml` contracts, caller examples, consumer fixtures, validation tooling, dependency maintenance, community files, and a repository pipeline that invokes the real reusable workflows.

## Target journey

The primary user is a maintainer who wants consistent pull-request CI across one or more repositories.

1. Select the uv, Python, or Node caller example.
2. Copy it to the caller's `.github/workflows/` directory.
3. Review the full commit-SHA reference and trusted command inputs.
4. Push or open a pull request.
5. Inspect separate matrix jobs and named install, quality, test, and build steps.
6. Reproduce a failure locally, fix it, and re-run only failed GitHub jobs.

The public examples pin commit `3a0309cd76820de898f4ff250cfbe01009c8598a`, which contains all documented product workflow contracts. Release notes provide the deliberate upgrade path.

## Product and architecture choices

- Keep ecosystem contracts separate instead of hiding behavior behind auto-detection.
- Let the caller own triggers, top-level concurrency, source, commands, and protection rules.
- Default to Ubuntu, Python 3.12/3.14, Node 22/24, two matrix jobs, two-way parallelism, and a 20-minute timeout per job.
- Treat command inputs as trusted maintainer configuration and mediate them through an environment variable to `bash -euo pipefail -c`.
- Grant at most `contents: read`; do not accept secrets or environments; remove checkout credentials before caller code runs.
- Pin external actions and caller examples to full commits.
- Reject step-level local actions so nested action code cannot evade repository validation.
- Run the independently downloaded, checksum-verified actionlint binary before repository-controlled npm code in CI.
- Keep tooling small: Node's built-in test runner and one integrity-locked YAML parser.
- Dogfood every product contract against a minimal caller fixture in hosted CI.

### Deliberate non-goals

- Publishing packages, creating caller releases, or deploying infrastructure.
- Managing caller credentials, environments, billing, or branch protection.
- Supporting Poetry, pnpm, Yarn, Windows, macOS, or self-hosted runners without user evidence.
- Replacing Dependabot, code scanning, provenance generators, runner monitoring, or language-specific linters.

## Competitive research boundary

- [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows) define the native caller-job contract; Samsarix builds a safer opinionated contract on that primitive.
- [GitHub workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [script-injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections) support explicit least privilege and environment-mediated untrusted values.
- GitHub's [starter workflows](https://github.com/actions/starter-workflows) are copyable templates; Samsarix instead centralizes an updateable, callable contract.
- SLSA generators, StepSecurity, MegaLinter, and zizmor address provenance, runner visibility, broad lint aggregation, or workflow analysis. Samsarix composes with those categories rather than duplicating them.
- GitHub matrices expose [`max-parallel`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations); the product couples it with small default matrices and timeouts for a visible default cost ceiling.
- Astral's official [`setup-uv`](https://github.com/astral-sh/setup-uv) and locked uv commands underpin the modern Python contract. Dependabot's supported [`uv` ecosystem](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories) maintains the committed fixture lock.

## Security review and remediation

A standard repository-wide Codex Security scan reviewed all 36 tracked files at commit `3a0309cd76820de898f4ff250cfbe01009c8598a`. The pre-fix scan found seven medium and two low validation/release-gate weaknesses; it did not find a current product workflow requesting write authority or consuming secrets.

The release-hardening branch closes all nine classes:

1. caller examples and README snippets now use a full commit SHA;
2. checksum-verified actionlint runs before repository-controlled setup or npm scripts;
3. job-level permissions cannot widen the token;
4. declared, inherited, or referenced secrets, environments, and workflow tokens are rejected;
5. checkout matching is case-insensitive;
6. every direct GitHub expression in shell source is rejected, including wrapped expressions and branch refs;
7. step-level local actions are rejected;
8. `continue-on-error`, disabled required steps, and common shell failure suppression are rejected; and
9. input types, default bounds, matrix cardinality, and exact timeout/concurrency wiring are asserted.

Regression tests exercise each bypass. Hosted CI remains the authoritative integration gate because local tools cannot reproduce GitHub's workflow engine.

## Distribution, license, and sustainability

The repository is publicly distributed, while the work is source-available under BSL 1.1 rather than open source before its Change Date. The normalized license keeps the standard BSL terms and defines the Additional Use Grant as 1,000 Workflow Calls per calendar month. One initial caller-job invocation or re-run is one Workflow Call; matrix expansion is not additional. The Change Date is June 16, 2027 and the Change License is Apache 2.0.

This product can remain lightweight: no runtime service exists to operate. Sustainability comes from reviewed maintenance, optional support, and commercial licensing above the Additional Use Grant. The license is a product decision, not legal advice; organizations relying on it should consult counsel.

## Acceptance gates

A commit is mergeable only when:

- `npm ci --ignore-scripts`, `npm run check`, and `npm test` pass;
- actionlint passes every repository workflow and caller example;
- the uv, Python, and Node fixture journeys pass locally where reproducible;
- dependency and credential scans are clean;
- all four hosted jobs pass for the exact pull-request head; and
- required review and repository-protection rules permit the exact commit to merge.

A release additionally requires a green post-merge default-branch run, an immutable version tag at that commit, accurate release notes, and a documented rollback revision. Exact hosted evidence belongs in the pull request and GitHub Release so this record does not claim future results.

## Next evidence-led work

1. Record at least one independent real caller using an immutable release commit.
2. Measure onboarding time, saved maintenance, failure clarity, and upgrade friction.
3. Add pnpm/Yarn, artifact/report upload, or non-Ubuntu runners only when caller demand justifies the expanded contract and test matrix.
4. Consider a moving `v0` compatibility tag only with explicit update and rollback semantics; continue recommending commit SHAs for strongest integrity.
