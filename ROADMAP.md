# Samsarix Workflows roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **internal infrastructure**. Use this to improve the portfolio through immutable, reviewed automation or internal deployments. It must not become a hidden runtime dependency for customer-facing products.
Planned repository identity: `Deathcharge/samsarix-workflows` (ready).

Current disposition: Merge the productization branch after exact-head verification and rollback-ref creation; release and adoption remain separate decisions.

## Stabilize the productized default

- Keep the default branch buildable from a clean checkout and preserve exact-head CI evidence.
- Keep Samsarix LLC branding, package identity, license metadata, and compatibility aliases internally consistent.
- Preserve the pre-productization default under a rollback ref before merging; do not delete legacy history.
- Review priority: resolve private visibility/BSL then merge PR 1 validate hosted jobs create immutable ref and adopt in one Python and Node consumer.

## Release candidate

- Adopt it in one repository through an immutable revision.
- Document permissions, rollback, failure isolation, and ownership.
- Measure maintenance saved before expanding portfolio-wide.

Current hardening backlog:

- `@master` examples are broken until draft PR #1 merges; there is no immutable release reference.
- Private visibility conflicts with the stated public-library audience and can block callers.
- No production consumer, adoption evidence, compatibility history, or release/version policy in practice.
- BSL production terms use an ill-fitting “API calls or equivalent usage” threshold.
- Arbitrary command inputs and runner/cache/version customization preserve a broad trusted configuration surface.

## Samsarix adoption

- Define a public API, event, schema, artifact, or deployment contract before connecting to Samsarix Unified.
- Add a consumer-owned contract fixture covering authentication, privacy, limits, errors, and version compatibility.
- Make one implementation canonical; remove or freeze duplicate behavior only after parity and rollback are proven.
- Record an owner, support level, compatibility window, and measurable adoption signal.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
