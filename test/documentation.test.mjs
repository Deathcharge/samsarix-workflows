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
      assert.deepEqual(ecosystems.sort(), ["github-actions", "npm", "pip"]);
    }
  }
});

test("copyable caller examples are valid YAML with the expected workflow targets", () => {
  const examples = new Map([
    ["examples/python-caller.yml", "/.github/workflows/python-ci.yml@master"],
    ["examples/node-caller.yml", "/.github/workflows/node-ci.yml@master"],
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
