import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");
const REUSABLE_WORKFLOWS = new Set(["node-ci.yml", "python-ci.yml", "uv-ci.yml"]);
const SHA_PIN = /^[^\s/@]+\/[^\s@]+(?:\/[^\s@]+)?@[0-9a-f]{40}$/;
const DIRECT_UNTRUSTED_RUN_EXPRESSION =
  /\$\{\{\s*(?:inputs(?:\.|\[)|github(?:\.event|\[['"]event['"]\]))/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function visitSteps(workflow, visit) {
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    if (!isObject(job) || !Array.isArray(job.steps)) continue;
    for (const [index, step] of job.steps.entries()) {
      if (isObject(step)) visit(step, jobName, index);
    }
  }
}

export function validateWorkflowText(source, filename, { reusable = false } = {}) {
  const errors = [];
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });

  for (const error of document.errors) errors.push(`YAML: ${error.message}`);
  if (document.errors.length > 0) return errors;

  const workflow = document.toJS();
  if (!isObject(workflow)) return ["workflow root must be a mapping"];

  const triggers = workflow.on;
  if (!isObject(triggers)) {
    errors.push("`on` must be a trigger mapping");
  } else if (reusable) {
    if (!("workflow_call" in triggers)) {
      errors.push("reusable workflows must declare `on.workflow_call`");
    }
    const unexpected = Object.keys(triggers).filter((key) => key !== "workflow_call");
    if (unexpected.length > 0) {
      errors.push(`reusable workflows cannot self-trigger: ${unexpected.join(", ")}`);
    }
  }

  if (!isObject(workflow.permissions) || workflow.permissions.contents !== "read") {
    errors.push("top-level permissions must explicitly grant only `contents: read`");
  } else if (Object.keys(workflow.permissions).some((key) => key !== "contents")) {
    errors.push("workflow requests permissions beyond `contents: read`");
  }

  if (!isObject(workflow.jobs) || Object.keys(workflow.jobs).length === 0) {
    errors.push("workflow must define at least one job");
  }

  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    if (!isObject(job)) continue;
    if (typeof job.uses === "string" && !job.uses.startsWith("./") && !SHA_PIN.test(job.uses)) {
      errors.push(`job ${jobName} must pin reusable workflow \`${job.uses}\` to a full commit SHA`);
    }
    if (!("uses" in job) && !("timeout-minutes" in job)) {
      errors.push(`job ${jobName} must set a timeout`);
    }
    if (reusable && !("uses" in job)) {
      if (!isObject(job.strategy) || !("max-parallel" in job.strategy)) {
        errors.push(`job ${jobName} must bound matrix concurrency with strategy.max-parallel`);
      }
    }
  }

  visitSteps(workflow, (step, jobName, index) => {
    const label = `job ${jobName}, step ${index + 1}`;
    if (typeof step.uses === "string" && !step.uses.startsWith("./")) {
      if (!SHA_PIN.test(step.uses)) {
        errors.push(`${label} must pin action \`${step.uses}\` to a full commit SHA`);
      }
      if (step.uses.startsWith("actions/checkout@")) {
        if (!isObject(step.with) || step.with["persist-credentials"] !== false) {
          errors.push(`${label} must set checkout persist-credentials to false`);
        }
      }
    }

    if (typeof step.run === "string" && DIRECT_UNTRUSTED_RUN_EXPRESSION.test(step.run)) {
      errors.push(`${label} interpolates event data or inputs directly into a shell script`);
    }
  });

  return errors.map((error) => `${filename}: ${error}`);
}

export function validateRepository(root = ROOT) {
  const directory = path.join(root, ".github", "workflows");
  const filenames = fs
    .readdirSync(directory)
    .filter((filename) => /\.ya?ml$/u.test(filename))
    .sort();
  const errors = [];

  for (const filename of filenames) {
    const source = fs.readFileSync(path.join(directory, filename), "utf8");
    errors.push(
      ...validateWorkflowText(source, filename, {
        reusable: REUSABLE_WORKFLOWS.has(filename),
      }),
    );
  }

  for (const expected of REUSABLE_WORKFLOWS) {
    if (!filenames.includes(expected)) errors.push(`${expected}: required workflow is missing`);
  }

  return { errors, filenames };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, filenames } = validateRepository();
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Validated ${filenames.length} workflow files: ${filenames.join(", ")}`);
  }
}
