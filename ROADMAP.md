# Samsarix Workflows roadmap

This roadmap separates four gates: merge, release, publication, and flagship adoption. Passing one does not imply the next.

## Product boundary

Portfolio role: **independently useful reusable CI library**. The repository should provide reviewed automation contracts that work without a Samsarix service, while remaining explicit about GitHub, package-registry, and caller-repository dependencies.
Repository identity: `Deathcharge/samsarix-workflows`.

Current disposition: the initial Python/npm productization and Samsarix coordinate update are merged on `master`. The next release candidate adds locked uv CI, matrix concurrency budgets, and a polyglot composition example; release, distribution, and adoption remain separate gates.

## Stabilize the productized default

- Keep the default branch buildable from a clean checkout and preserve exact-head CI evidence.
- Keep Samsarix LLC branding, package identity, license metadata, and compatibility aliases internally consistent.
- Preserve legacy history and use immutable release refs for rollback.
- Review priority: pass hosted Python, uv, Node, and repository checks; resolve private visibility/Actions access; clarify BSL workflow-use language; create an immutable release; adopt it in real consumers.

## Release candidate

- Adopt it in one repository through an immutable revision.
- Document permissions, rollback, failure isolation, and ownership.
- Measure maintenance saved before expanding portfolio-wide.

Current hardening backlog:

- There is no immutable release reference; examples use `@master` only as an evaluation ref.
- Private visibility and repository Actions access can block independent callers.
- No production consumer, adoption evidence, or compatibility history has been recorded yet.
- BSL production terms use an ill-fitting “API calls or equivalent usage” threshold.
- Trusted command inputs remain deliberately powerful and must never be populated from untrusted event data.

## Competitive delivery sequence

1. **Locked modern Python:** ship the uv contract with exact tool installation, lockfile enforcement, caching, fixture coverage, and a real caller journey.
2. **Predictable runner use:** expose bounded matrix parallelism alongside version count and job timeouts; distinguish concurrency from the maximum default runner-minute budget.
3. **Polyglot repositories:** prove Node and Python contracts compose as separate, independently retryable jobs without an opaque auto-detection layer.
4. **Release and distribution:** establish immutable tags, release notes, required checks, and a GitHub visibility/Actions-access policy that matches the intended audience.
5. **Evidence-led expansion:** evaluate pnpm, artifacts/test reports, and non-Ubuntu runners only after caller demand or a Samsarix-owned consumer demonstrates the need.

## Completion evidence

A milestone is complete only when its exact commit, commands and results, artifact digest, consumer or deployment, and rollback path are recorded in a pull request or release record. README claims must not exceed that evidence.
