import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseDocument } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");

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
    const document = parseDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), {
      strict: true,
      uniqueKeys: true,
    });
    assert.deepEqual(document.errors, [], filename);

    if (filename === ".github/dependabot.yml") {
      const ecosystems = document.toJS().updates.map((update) => update["package-ecosystem"]);
      assert.deepEqual(ecosystems.sort(), ["github-actions", "npm", "pip", "uv"]);
    }
  }
});

test("copyable caller examples are valid YAML with the expected workflow targets", () => {
  const examples = new Map([
    ["examples/python-caller.yml", "/.github/workflows/python-ci.yml@master"],
    ["examples/node-caller.yml", "/.github/workflows/node-ci.yml@master"],
    ["examples/uv-caller.yml", "/.github/workflows/uv-ci.yml@master"],
  ]);

  for (const [filename, expectedTarget] of examples) {
    const document = parseDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), {
      strict: true,
      uniqueKeys: true,
    });
    assert.deepEqual(document.errors, [], filename);
    const workflow = document.toJS();
    assert.equal(workflow.permissions.contents, "read", filename);
    assert.equal(workflow.jobs.ci.uses.endsWith(expectedTarget), true, filename);
  }
});

test("the polyglot example composes both ecosystem contracts", () => {
  const filename = "examples/polyglot-caller.yml";
  const document = parseDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), {
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], filename);
  const workflow = document.toJS();
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.jobs.backend.uses.endsWith("/.github/workflows/uv-ci.yml@master"), true);
  assert.equal(workflow.jobs.frontend.uses.endsWith("/.github/workflows/node-ci.yml@master"), true);
});

test("every product workflow exposes and wires the default concurrency budget", () => {
  for (const filename of ["node-ci.yml", "python-ci.yml", "uv-ci.yml"]) {
    const document = parseDocument(
      fs.readFileSync(path.join(ROOT, ".github", "workflows", filename), "utf8"),
      { strict: true, uniqueKeys: true },
    );
    assert.deepEqual(document.errors, [], filename);
    const workflow = document.toJS();
    assert.equal(workflow.on.workflow_call.inputs["max-parallel"].type, "number", filename);
    assert.equal(workflow.on.workflow_call.inputs["max-parallel"].default, 2, filename);
    assert.equal(workflow.jobs.ci.strategy["max-parallel"], "${{ inputs.max-parallel }}", filename);
  }
});

test("the uv contract pins its setup action and fails closed on stale locks", () => {
  const filename = ".github/workflows/uv-ci.yml";
  const document = parseDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), {
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], filename);
  const workflow = document.toJS();
  const inputs = workflow.on.workflow_call.inputs;
  assert.equal(inputs["uv-version"].default, "0.12.0");
  assert.equal(inputs["sync-command"].default, "uv sync --locked");
  assert.equal(inputs["test-command"].default, "uv run --locked pytest");
  assert.equal(
    workflow.jobs.ci.steps[1].uses,
    "astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9",
  );
  assert.equal(fs.existsSync(path.join(ROOT, "test", "fixtures", "uv", "uv.lock")), true);
});
