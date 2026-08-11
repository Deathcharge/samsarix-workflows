import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseDocument } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const PINNED_WORKFLOW_SHA = "3a0309cd76820de898f4ff250cfbe01009c8598a";

function parseYaml(filename) {
  const document = parseDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), {
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], filename);
  return document.toJS();
}

test("local Markdown links resolve to checked-in paths", () => {
  const markdownFiles = [
    "README.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/PRODUCTIZATION.md",
  ];
  const missing = [];

  for (const filename of markdownFiles) {
    const source = fs.readFileSync(path.join(ROOT, filename), "utf8");
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
      const resolved = path.resolve(ROOT, path.dirname(filename), decodeURIComponent(target));
      if (!fs.existsSync(resolved)) missing.push(`${filename} -> ${target}`);
    }
  }

  assert.deepEqual(missing, []);
});

test("repository metadata YAML is well formed", () => {
  const metadataFiles = [
    ".github/dependabot.yml",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
  ];

  for (const filename of metadataFiles) {
    const metadata = parseYaml(filename);
    if (filename === ".github/dependabot.yml") {
      const ecosystems = metadata.updates.map((update) => update["package-ecosystem"]);
      assert.deepEqual(ecosystems.sort(), ["github-actions", "npm", "pip", "uv"]);
    }
  }
});

test("copyable callers use the verified immutable workflow commit", () => {
  const examples = new Map([
    ["examples/python-caller.yml", "python-ci.yml"],
    ["examples/node-caller.yml", "node-ci.yml"],
    ["examples/uv-caller.yml", "uv-ci.yml"],
  ]);

  for (const [filename, workflowName] of examples) {
    const workflow = parseYaml(filename);
    assert.equal(workflow.permissions.contents, "read", filename);
    assert.equal(
      workflow.jobs.ci.uses,
      `Deathcharge/samsarix-workflows/.github/workflows/${workflowName}@${PINNED_WORKFLOW_SHA}`,
      filename,
    );
  }
});

test("the polyglot caller composes both contracts at the verified commit", () => {
  const workflow = parseYaml("examples/polyglot-caller.yml");
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(
    workflow.jobs.backend.uses,
    `Deathcharge/samsarix-workflows/.github/workflows/uv-ci.yml@${PINNED_WORKFLOW_SHA}`,
  );
  assert.equal(
    workflow.jobs.frontend.uses,
    `Deathcharge/samsarix-workflows/.github/workflows/node-ci.yml@${PINNED_WORKFLOW_SHA}`,
  );
  assert.equal(workflow.jobs.backend.with["cache-dependency-glob"], "uv.lock");
});

test("documentation contains no mutable default-branch workflow references", () => {
  for (const filename of ["README.md", "examples/node-caller.yml", "examples/python-caller.yml", "examples/uv-caller.yml", "examples/polyglot-caller.yml"]) {
    assert.equal(fs.readFileSync(path.join(ROOT, filename), "utf8").includes("@master"), false, filename);
  }
});

test("every product contract enforces a conservative default runner budget", () => {
  for (const filename of ["node-ci.yml", "python-ci.yml", "uv-ci.yml"]) {
    const workflow = parseYaml(path.join(".github", "workflows", filename));
    const inputs = workflow.on.workflow_call.inputs;
    const job = workflow.jobs.ci;
    assert.equal(inputs["max-parallel"].type, "number", filename);
    assert.equal(inputs["max-parallel"].default, 2, filename);
    assert.equal(inputs["timeout-minutes"].type, "number", filename);
    assert.equal(inputs["timeout-minutes"].default, 20, filename);
    assert.equal(job.strategy["max-parallel"], "${{ inputs.max-parallel }}", filename);
    assert.equal(job["timeout-minutes"], "${{ inputs.timeout-minutes }}", filename);

    let jobs = 1;
    for (const value of Object.values(job.strategy.matrix)) {
      const match = /^\$\{\{\s*fromJSON\(inputs\.([a-zA-Z0-9-]+)\)\s*\}\}$/u.exec(value);
      assert(match, `${filename}: matrix values must be derived from a JSON input`);
      const versions = JSON.parse(inputs[match[1]].default);
      assert(Array.isArray(versions) && versions.length > 0, filename);
      jobs *= versions.length;
    }
    assert(jobs <= 2, `${filename}: defaults create too many jobs`);
    assert(jobs * inputs["timeout-minutes"].default <= 40, `${filename}: default minute cap is too high`);
  }
});

test("trusted product commands use fail-closed environment mediation", () => {
  const requiredDefaults = {
    "node-ci.yml": { "install-command": "npm ci", "test-command": "npm test" },
    "python-ci.yml": {
      "install-command": "python -m pip install -e '.[dev]'",
      "test-command": "python -m pytest",
    },
    "uv-ci.yml": { "sync-command": "uv sync --locked", "test-command": "uv run --locked pytest" },
  };

  for (const [filename, defaults] of Object.entries(requiredDefaults)) {
    const workflow = parseYaml(path.join(".github", "workflows", filename));
    const inputs = workflow.on.workflow_call.inputs;
    for (const [inputName, expected] of Object.entries(defaults)) {
      assert.equal(inputs[inputName].default, expected, `${filename}: ${inputName}`);
      const expression = `\${{ inputs.${inputName} }}`;
      const step = workflow.jobs.ci.steps.find((candidate) => candidate.env?.SAMSARIX_COMMAND === expression);
      assert(step, `${filename}: ${inputName} is not mediated through SAMSARIX_COMMAND`);
      assert.equal(step.run, 'bash -euo pipefail -c "$SAMSARIX_COMMAND"', filename);
      assert.equal("continue-on-error" in step, false, filename);
    }
  }
});

test("the uv contract pins setup-uv and carries a committed lock", () => {
  const workflow = parseYaml(".github/workflows/uv-ci.yml");
  assert.equal(workflow.on.workflow_call.inputs["uv-version"].default, "0.12.0");
  assert.equal(
    workflow.jobs.ci.steps[1].uses,
    "astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9",
  );
  assert.equal(fs.existsSync(path.join(ROOT, "test", "fixtures", "uv", "uv.lock")), true);
});
