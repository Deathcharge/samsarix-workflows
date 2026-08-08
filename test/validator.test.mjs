import assert from "node:assert/strict";
import test from "node:test";

import { validateRepository, validateWorkflowText } from "../scripts/validate-workflows.mjs";

const minimalWorkflow = `
name: Example
on:
  workflow_call:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo ok
`;

test("the checked-in workflows satisfy the repository contract", () => {
  const result = validateRepository();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.filenames, ["node-ci.yml", "python-ci.yml", "uv-ci.yml", "validate.yml"]);
});

test("reusable workflow matrices must bound parallel jobs", () => {
  const errors = validateWorkflowText(minimalWorkflow, "bad.yml", { reusable: true });
  assert(errors.some((error) => error.includes("strategy.max-parallel")));
});

test("a reusable workflow must expose workflow_call", () => {
  const source = minimalWorkflow.replace("workflow_call:", "push:");
  const errors = validateWorkflowText(source, "bad.yml", { reusable: true });
  assert(errors.some((error) => error.includes("must declare `on.workflow_call`")));
});

test("external actions must use full commit SHAs", () => {
  const source = minimalWorkflow.replace(
    "- run: echo ok",
    "- uses: actions/checkout@v6\n        with:\n          persist-credentials: false",
  );
  const errors = validateWorkflowText(source, "bad.yml", { reusable: true });
  assert(errors.some((error) => error.includes("full commit SHA")));
});

test("external reusable workflow jobs must use full commit SHAs", () => {
  const source = minimalWorkflow.replace(
    "runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - run: echo ok",
    "uses: example/workflows/.github/workflows/ci.yml@main",
  );
  const errors = validateWorkflowText(source, "bad.yml", { reusable: true });
  assert(errors.some((error) => error.includes("must pin reusable workflow")));
});

test("shell scripts must not directly interpolate inputs or event payloads", () => {
  const source = minimalWorkflow.replace("echo ok", "echo ${{ inputs.command }}");
  const errors = validateWorkflowText(source, "bad.yml", { reusable: true });
  assert(errors.some((error) => error.includes("directly into a shell script")));
});

test("bracket-notation event and input interpolation is also rejected", () => {
  for (const expression of ["${{ inputs['command'] }}", "${{ github['event'].issue.title }}"]) {
    const source = minimalWorkflow.replace("echo ok", `echo ${expression}`);
    const errors = validateWorkflowText(source, "bad.yml", { reusable: true });
    assert(errors.some((error) => error.includes("directly into a shell script")));
  }
});
