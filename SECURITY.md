# Security Policy

## Private Vulnerability Reporting

Report suspected vulnerabilities privately to `support@samsarix.com` with the
subject prefix `[SECURITY] Samsarix Workflows`.

Do not open a public issue for suspected exploitable behavior. Include the
affected workflow or file, the exact tag or commit SHA, realistic impact,
minimal reproduction steps, and sanitized logs. Never send active credentials,
tokens, private repository contents, or unrelated personal information.

Samsarix LLC will validate the report and coordinate remediation and disclosure
when appropriate. No fixed response or remediation deadline is promised.

## Supported Versions

Before the first tagged release, reports are assessed against the latest commit
selected for the active release candidate. After `v0.1.0`, security fixes will
target the latest maintained `v0` release. Older tags, branches, and arbitrary
commit snapshots are not independently supported.

## System and Scope

Samsarix Workflows is a public library of reusable GitHub Actions CI workflows
for Python and Node.js/npm repositories. It does not operate a hosted service,
database, API, account system, or telemetry system.

Security review covers:

- reusable workflows under `.github/workflows/`;
- repository validation and test tooling;
- caller examples and consumer fixtures;
- repository CI and dependency-update configuration; and
- documentation when it defines a security boundary or unsafe usage pattern.

Samsarix LLC owns this repository policy.

## Threat Model and Trust Boundaries

Caller maintainers are trusted to control their workflow file, command inputs,
runtime matrix, working directory, and runner selection.

Pull-request source code, event metadata, dependency output, downloaded content,
and other contributor-controlled data are untrusted. These values must not
become generated shell source or expand the workflow's authority.

The workflow runs in the caller repository's GitHub Actions context with a
read-only token. GitHub Actions, GitHub-hosted runners, and full-SHA-pinned
external actions remain external dependencies.

Important assets are caller repository contents, workflow integrity, GitHub
tokens and credentials, private log content, dependency integrity, and billed
runner capacity.

## Security Invariants

- Top-level permissions grant only `contents: read`.
- Reusable workflows do not declare or inherit secrets.
- Checkout credentials are not persisted for caller commands.
- External actions and reusable workflows use full commit SHA references.
- Event data and workflow inputs are not interpolated directly into shell source.
- Trusted command inputs pass through environment variables and fail closed.
- Runner jobs declare timeouts and use conservative default matrices.
- Validation must reject regressions in these properties.
- Logs and job summaries must not intentionally expose credentials or secrets.

## Reportable Findings and Severity Context

Reportable findings include:

- command execution influenced by untrusted event or pull-request metadata;
- expansion of token permissions or unintended secret access;
- persisted or exfiltrated credentials;
- mutable or bypassable supply-chain references;
- reliable fail-open behavior in required validation or test steps;
- validator bypasses that permit a documented invariant to regress; and
- unintended compute amplification reachable without a trusted maintainer
  deliberately selecting the expanded workload.

Issues that let an untrusted contributor affect caller repository integrity or
obtain credentials receive the highest priority. Availability, runner-cost, and
defense-in-depth findings are evaluated according to realistic reachability and
impact.

## Out of Scope, Exclusions, and Accepted Risk

The following are not findings in this repository by themselves:

- arbitrary behavior intentionally placed in a `*-command` input by a trusted
  caller maintainer;
- caller workflows that construct trusted inputs from untrusted data contrary
  to the documented contract;
- vulnerabilities solely in caller application code or caller dependencies;
- compromise or unsafe configuration of a caller-managed self-hosted runner;
- GitHub platform or third-party issues that do not depend on this repository's
  integration; and
- behavior for unsupported ecosystems or operating systems.

A vulnerability in a dependency or pinned action remains in scope when the
currently referenced version creates a reachable weakness in this product.
There are no additional accepted-risk suppressions.

## Known Limitations and Compensating Controls

Command inputs intentionally contain shell language and therefore require
maintainer-level trust. GitHub-hosted behavior cannot be reproduced perfectly
locally. The repository compensates with locked validation tooling, negative
tests, consumer fixtures, full-SHA action pins, actionlint, read-only
permissions, non-persisted checkout credentials, and job timeouts.

Full-SHA pins require ongoing maintenance; Dependabot may propose updates, but
each proposal still requires review. GitHub private vulnerability reporting is
an optional additional channel and is not required to use the private support
address above.
