import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateRepository, validateWorkflowText } from "../scripts/validate-workflows.mjs";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const minimalWorkflow = `
name: Example
on:
  workflow_call:
    inputs:
      versions:
        type: string
        default: '["3.14"]'
      max-parallel:
        type: number
        default: 1
      timeout-minutes:
        type: number
        default: 10
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: \${{ inputs.timeout-minutes }}
    strategy:
      max-parallel: \${{ inputs.max-parallel }}
      matrix:
        version: \${{ fromJSON(inputs.versions) }}
    steps:
      - run: echo ok
`;

function errorsFor(source, options = { reusable: true }) {
  return validateWorkflowText(source, "bad.yml", options);
}

function assertRejected(source, fragment, options) {
  assert(
    errorsFor(source, options).some((error) => error.includes(fragment)),
    `expected an error containing ${JSON.stringify(fragment)}`,
  );
}

test("the shared fixture satisfies every reusable workflow rule", () => {
  assert.deepEqual(errorsFor(minimalWorkflow), []);
});

test("the checked-in workflows and examples satisfy the repository contract", () => {
  const result = validateRepository();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.examples, [
    "examples/node-caller.yml",
    "examples/polyglot-caller.yml",
    "examples/python-caller.yml",
    "examples/uv-caller.yml",
  ]);
  assert.deepEqual(result.filenames, ["node-ci.yml", "python-ci.yml", "uv-ci.yml", "validate.yml"]);
});

test("repository validation discovers new examples and diagnoses missing required examples", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "samsarix-validator-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  fs.mkdirSync(path.join(root, "examples"));

  for (const filename of ["node-ci.yml", "python-ci.yml", "uv-ci.yml", "validate.yml"]) {
    fs.writeFileSync(path.join(root, ".github", "workflows", filename), minimalWorkflow);
  }
  for (const filename of ["node-caller.yml", "polyglot-caller.yml", "python-caller.yml", "uv-caller.yml"]) {
    fs.writeFileSync(path.join(root, "examples", filename), minimalWorkflow);
  }
  fs.writeFileSync(
    path.join(root, "examples", "additional.yml"),
    minimalWorkflow.replace("echo ok", "echo ${{ github.head_ref }}"),
  );

  const discovered = validateRepository(root);
  assert(discovered.examples.includes("examples/additional.yml"));
  assert(discovered.errors.some((error) => error.startsWith("examples/additional.yml:")));

  fs.rmSync(path.join(root, "examples", "uv-caller.yml"));
  assert(
    validateRepository(root).errors.includes(
      "examples/uv-caller.yml: required caller example is missing",
    ),
  );
});

test("a reusable workflow must expose workflow_call", () => {
  assertRejected(
    minimalWorkflow.replace("workflow_call:", "push:"),
    "must declare `on.workflow_call`",
  );
});

test("reusable workflows cannot declare caller secrets", () => {
  const source = minimalWorkflow.replace(
    "    inputs:",
    "    secrets:\n      release-token:\n        required: false\n    inputs:",
  );
  assertRejected(source, "cannot declare secrets");
});

test("external actions must use full commit SHAs", () => {
  const source = minimalWorkflow.replace(
    "- run: echo ok",
    "- uses: actions/checkout@v6\n        with:\n          persist-credentials: false",
  );
  assertRejected(source, "full commit SHA");
});

test("external reusable workflow jobs must use full commit SHAs", () => {
  const source = `
name: Caller
on:
  pull_request:
permissions:
  contents: read
jobs:
  ci:
    uses: example/workflows/.github/workflows/ci.yml@main
`;
  assertRejected(source, "must pin reusable workflow", { reusable: false });
});

test("checkout detection is case-insensitive", () => {
  const source = minimalWorkflow.replace(
    "- run: echo ok",
    `- uses: Actions/Checkout@${SHA}`,
  );
  assertRejected(source, "persist-credentials to false");
});

test("step-level local actions are rejected", () => {
  assertRejected(minimalWorkflow.replace("- run: echo ok", "- uses: ./.github/actions/test"), "local action");
});

test("job permissions cannot widen the read-only token", () => {
  for (const declaration of [
    "permissions: write-all",
    "permissions:\n      contents: write",
    "permissions:\n      issues: read",
  ]) {
    const source = minimalWorkflow.replace(
      "    runs-on: ubuntu-latest",
      `    ${declaration.replaceAll("\n", "\n    ")}\n    runs-on: ubuntu-latest`,
    );
    assertRejected(source, "requests permissions beyond");
  }
});

test("jobs cannot receive secrets or select protected environments", () => {
  for (const declaration of [
    "secrets: inherit",
    `secrets:\n      release-token: \${{ secrets.RELEASE_TOKEN }}`,
    "environment: production",
  ]) {
    const source = minimalWorkflow.replace(
      "    runs-on: ubuntu-latest",
      `    ${declaration.replaceAll("\n", "\n    ")}\n    runs-on: ubuntu-latest`,
    );
    assert(
      errorsFor(source).some(
        (error) => error.includes("cannot receive or inherit secrets") || error.includes("cannot select an environment"),
      ),
    );
  }
});

test("secret and workflow-token expressions are rejected in every value", () => {
  for (const expression of [
    "${{ secrets.RELEASE_TOKEN }}",
    "${{ github.token }}",
    "${{ github['token'] }}",
  ]) {
    const source = minimalWorkflow.replace(
      "      - run: echo ok",
      `      - env:\n          VALUE: ${expression}\n        run: echo ok`,
    );
    assertRejected(source, "references a secret or workflow token");
  }
});

test("secret prose outside an expression does not create a false positive", () => {
  const source = minimalWorkflow.replace(
    "name: Example",
    'name: "${{ inputs.name }}; never pass secrets here"',
  );
  assert.deepEqual(errorsFor(source), []);
});

test("shell scripts cannot directly interpolate any GitHub expression", () => {
  for (const expression of [
    "${{ inputs.command }}",
    "${{ inputs['command'] }}",
    "${{ github.event.issue.title }}",
    "${{ github['event'].issue.title }}",
    "${{ github.head_ref }}",
    "${{ github.ref_name }}",
    "${{ format('{0}', github.event.pull_request.title) }}",
    "${{ (github.event.issue.title) }}",
  ]) {
    assertRejected(minimalWorkflow.replace("echo ok", `echo ${expression}`), "directly into a shell script");
  }
});

test("failure masking and disabled steps are rejected", () => {
  const cases = [
    ["    runs-on: ubuntu-latest", "    continue-on-error: false\n    runs-on: ubuntu-latest", "cannot continue on error"],
    ["      - run: echo ok", "      - continue-on-error: false\n        run: echo ok", "cannot continue on error"],
    ["echo ok", "echo ok || true", "fail-open shell suppression"],
    ["echo ok", "set +e; echo ok", "fail-open shell suppression"],
    ["      - run: echo ok", "      - if: false\n        run: echo ok", "unconditionally disabled"],
    ["      - run: echo ok", "      - if: ${{ false }}\n        run: echo ok", "unconditionally disabled"],
  ];
  for (const [before, after, fragment] of cases) {
    assertRejected(minimalWorkflow.replace(before, after), fragment);
  }
});

test("reusable workflows require bounded numeric defaults and exact wiring", () => {
  const cases = [
    ["default: 1\n      timeout-minutes", "default: 0\n      timeout-minutes", "default between 1 and 2"],
    ["default: 10\npermissions", "default: 21\npermissions", "default between 1 and 20"],
    ["timeout-minutes: ${{ inputs.timeout-minutes }}", "timeout-minutes: 10", "wire timeout-minutes"],
    ["max-parallel: ${{ inputs.max-parallel }}", "max-parallel: 2", "wire max-parallel"],
    ["default: '[\"3.14\"]'", "default: '[\"3.12\", \"3.13\", \"3.14\"]'", "cannot exceed 2 jobs"],
    ["version: ${{ fromJSON(inputs.versions) }}", "version: [3.14]", "must use a JSON workflow input"],
  ];
  for (const [before, after, fragment] of cases) {
    assertRejected(minimalWorkflow.replace(before, after), fragment);
  }
});
