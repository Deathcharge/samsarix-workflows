import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");
const REUSABLE_WORKFLOWS = new Set(["node-ci.yml", "python-ci.yml", "uv-ci.yml"]);
const CALLER_EXAMPLES = [
  "examples/node-caller.yml",
  "examples/polyglot-caller.yml",
  "examples/python-caller.yml",
  "examples/uv-caller.yml",
];
const SHA_PIN = /^[^\s/@]+\/[^\s@]+(?:\/[^\s@]+)?@[0-9a-f]{40}$/;
const DIRECT_RUN_EXPRESSION = /\$\{\{/u;
const SECRET_OR_TOKEN_EXPRESSION =
  /\$\{\{[\s\S]*?(?:\bsecrets\b|\bgithub\s*(?:\.\s*token\b|\[\s*['"]token['"]\s*\]))/iu;
const FAIL_OPEN_RUN = /(?:\|\|\s*(?:true\b|:)|(?:^|[;\n])\s*set\s+\+e(?=\s|;|$))/u;
const ALWAYS_FALSE_EXPRESSION = /^\s*\$\{\{\s*false\s*\}\}\s*$/iu;
const INPUT_EXPRESSION = (name) => `\${{ inputs.${name} }}`;
const FROM_JSON_INPUT = /^\$\{\{\s*fromJSON\(inputs\.([a-zA-Z0-9-]+)\)\s*\}\}$/u;

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

function visitValues(value, visit, currentPath = "workflow") {
  if (typeof value === "string") {
    visit(value, currentPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitValues(item, visit, `${currentPath}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    visitValues(child, visit, `${currentPath}.${key}`);
  }
}

function isSafeJobPermissions(value) {
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  return entries.every(
    ([permission, access]) => permission === "contents" && ["read", "none"].includes(access),
  );
}

function validateBoundedNumberInput(inputs, name, maximum, errors) {
  const input = inputs?.[name];
  if (!isObject(input) || input.type !== "number") {
    errors.push(`reusable workflows must expose numeric \`${name}\``);
    return;
  }
  if (!Number.isInteger(input.default) || input.default < 1 || input.default > maximum) {
    errors.push(`reusable input \`${name}\` must default between 1 and ${maximum}`);
  }
}

function validateReusableBudget(triggers, job, jobName, errors) {
  const call = triggers.workflow_call;
  const inputs = isObject(call) && isObject(call.inputs) ? call.inputs : {};
  validateBoundedNumberInput(inputs, "max-parallel", 2, errors);
  validateBoundedNumberInput(inputs, "timeout-minutes", 20, errors);

  if (job["timeout-minutes"] !== INPUT_EXPRESSION("timeout-minutes")) {
    errors.push(`job ${jobName} must wire timeout-minutes to the bounded workflow input`);
  }
  if (!isObject(job.strategy) || job.strategy["max-parallel"] !== INPUT_EXPRESSION("max-parallel")) {
    errors.push(`job ${jobName} must wire max-parallel to the bounded workflow input`);
    return;
  }

  const matrix = job.strategy.matrix;
  if (!isObject(matrix) || Object.keys(matrix).length === 0) {
    errors.push(`job ${jobName} must define a non-empty matrix`);
    return;
  }

  let defaultJobCount = 1;
  for (const [dimension, value] of Object.entries(matrix)) {
    const match = typeof value === "string" ? FROM_JSON_INPUT.exec(value) : null;
    if (!match) {
      errors.push(`job ${jobName} matrix dimension ${dimension} must use a JSON workflow input`);
      continue;
    }
    const input = inputs[match[1]];
    let defaults;
    try {
      defaults = isObject(input) && typeof input.default === "string" ? JSON.parse(input.default) : null;
    } catch {
      defaults = null;
    }
    if (!Array.isArray(defaults) || defaults.length < 1) {
      errors.push(`matrix input \`${match[1]}\` must default to a non-empty JSON array`);
      continue;
    }
    defaultJobCount *= defaults.length;
  }
  if (defaultJobCount > 2) {
    errors.push(`job ${jobName} default matrix cannot exceed 2 jobs`);
  }
}

function sourceDeclaresReusableWorkflow(source) {
  const document = parseDocument(source, { strict: true, uniqueKeys: true });
  if (document.errors.length > 0) return false;
  const workflow = document.toJS();
  return isObject(workflow) && isObject(workflow.on) && "workflow_call" in workflow.on;
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
    if (isObject(triggers.workflow_call) && "secrets" in triggers.workflow_call) {
      errors.push("reusable workflows cannot declare secrets");
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
    if ("permissions" in job && !isSafeJobPermissions(job.permissions)) {
      errors.push(`job ${jobName} requests permissions beyond \`contents: read\``);
    }
    if ("secrets" in job) errors.push(`job ${jobName} cannot receive or inherit secrets`);
    if ("environment" in job) errors.push(`job ${jobName} cannot select an environment`);
    if ("continue-on-error" in job) {
      errors.push(`job ${jobName} cannot continue on error`);
    }
    if (typeof job.uses === "string" && !job.uses.startsWith("./") && !SHA_PIN.test(job.uses)) {
      errors.push(`job ${jobName} must pin reusable workflow \`${job.uses}\` to a full commit SHA`);
    }
    if (!("uses" in job) && !("timeout-minutes" in job)) {
      errors.push(`job ${jobName} must set a timeout`);
    }
    if (reusable && !("uses" in job)) {
      if (!isObject(job.strategy) || !("max-parallel" in job.strategy)) {
        errors.push(`job ${jobName} must bound matrix concurrency with strategy.max-parallel`);
      } else {
        validateReusableBudget(triggers, job, jobName, errors);
      }
    }
  }

  visitSteps(workflow, (step, jobName, index) => {
    const label = `job ${jobName}, step ${index + 1}`;
    if (typeof step.uses === "string") {
      if (step.uses.startsWith("./")) {
        errors.push(`${label} uses a local action; local action steps are not supported`);
      } else {
        if (!SHA_PIN.test(step.uses)) {
          errors.push(`${label} must pin action \`${step.uses}\` to a full commit SHA`);
        }
        const coordinate = step.uses.split("@", 1)[0].toLowerCase();
        if (coordinate === "actions/checkout") {
          if (!isObject(step.with) || step.with["persist-credentials"] !== false) {
            errors.push(`${label} must set checkout persist-credentials to false`);
          }
        }
      }
    }

    if ("continue-on-error" in step) errors.push(`${label} cannot continue on error`);
    if (step.if === false || step.if === "false" || ALWAYS_FALSE_EXPRESSION.test(step.if)) {
      errors.push(`${label} cannot be unconditionally disabled`);
    }
    if (typeof step.run === "string" && DIRECT_RUN_EXPRESSION.test(step.run)) {
      errors.push(`${label} interpolates a GitHub expression directly into a shell script`);
    }
    if (typeof step.run === "string" && FAIL_OPEN_RUN.test(step.run)) {
      errors.push(`${label} contains fail-open shell suppression`);
    }
  });

  visitValues(workflow, (value, valuePath) => {
    if (SECRET_OR_TOKEN_EXPRESSION.test(value)) {
      errors.push(`${valuePath} references a secret or workflow token`);
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
        reusable: REUSABLE_WORKFLOWS.has(filename) || sourceDeclaresReusableWorkflow(source),
      }),
    );
  }

  for (const filename of CALLER_EXAMPLES) {
    const source = fs.readFileSync(path.join(root, filename), "utf8");
    errors.push(...validateWorkflowText(source, filename));
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
    console.log(
      `Validated ${filenames.length} workflow files and ${CALLER_EXAMPLES.length} caller examples: ${filenames.join(", ")}`,
    );
  }
}
