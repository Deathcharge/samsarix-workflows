# Helix Workflows

Shared GitHub Actions workflows for the Helix Collective ecosystem. These reusable workflows provide standardized CI/CD pipelines for all repositories.

---

## Overview

This repository contains standardized GitHub Actions workflows that can be referenced from any Helix Collective repository. Using shared workflows ensures consistency, reduces duplication, and simplifies maintenance across the entire ecosystem.

**Status:** Production Ready  
**License:** Business Source License 1.1 (BSL 1.1)

---

## Available Workflows

### 1. Test Python (`test-python.yml`)

Automated testing for Python projects.

**Features:**
- Multi-version testing (Python 3.8, 3.9, 3.10, 3.11)
- Dependency caching for faster builds
- Flake8 linting
- MyPy type checking
- Pytest with coverage reporting
- Codecov integration

**Triggers:**
- Push to main, master, develop branches
- Pull requests to main, master, develop branches

**Usage:**

```yaml
name: Test

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    uses: Deathcharge/helix-workflows/.github/workflows/test-python.yml@main
```

### 2. Test Node.js (`test-node.yml`)

Automated testing for Node.js projects.

**Features:**
- Multi-version testing (Node 16, 18, 20)
- NPM dependency caching
- ESLint linting
- TypeScript type checking
- Jest/Vitest with coverage
- Codecov integration

**Triggers:**
- Push to main, master, develop branches
- Pull requests to main, master, develop branches

**Usage:**

```yaml
name: Test

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    uses: Deathcharge/helix-workflows/.github/workflows/test-node.yml@main
```

### 3. Security Scan (`security.yml`)

Comprehensive security scanning and vulnerability detection.

**Features:**
- Trivy filesystem scanning
- GitHub Security tab integration
- Snyk dependency scanning
- Secret detection with TruffleHog
- OWASP Dependency Check
- Weekly scheduled scans

**Triggers:**
- Push to main, master, develop branches
- Pull requests to main, master, develop branches
- Weekly schedule (Sunday at 00:00 UTC)

**Secrets Required:**
- `SNYK_TOKEN` (optional, for Snyk scanning)

**Usage:**

```yaml
name: Security

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  security:
    uses: Deathcharge/helix-workflows/.github/workflows/security.yml@main
    secrets:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 4. Code Quality (`quality.yml`)

Multi-tool code quality analysis.

**Features:**
- SonarQube/SonarCloud integration
- CodeFactor analysis
- Python: Pylint, Black, isort, Bandit
- JavaScript: ESLint, Prettier, Stylelint
- Cross-language quality checks

**Secrets Required:**
- `SONAR_TOKEN` (optional, for SonarQube)
- `CODEFACTOR_PROJECTTOKEN` (optional, for CodeFactor)

**Usage:**

```yaml
name: Quality

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  quality:
    uses: Deathcharge/helix-workflows/.github/workflows/quality.yml@main
    secrets:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      CODEFACTOR_PROJECTTOKEN: ${{ secrets.CODEFACTOR_PROJECTTOKEN }}
```

### 5. Release (`release.yml`)

Automated release management and publishing.

**Features:**
- Automatic GitHub Release creation
- Release notes from commit history
- Python package publishing to PyPI
- Node.js package publishing to NPM
- GitHub Packages integration
- Git tag triggered

**Secrets Required:**
- `PYPI_TOKEN` (optional, for PyPI publishing)
- `NPM_TOKEN` (optional, for NPM publishing)

**Triggers:**
- Git tag push (format: `v*`)

**Usage:**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    uses: Deathcharge/helix-workflows/.github/workflows/release.yml@main
    secrets:
      PYPI_TOKEN: ${{ secrets.PYPI_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Quick Start

### For Python Projects

1. Create `.github/workflows/ci.yml` in your repository:

```yaml
name: CI

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    uses: Deathcharge/helix-workflows/.github/workflows/test-python.yml@main

  quality:
    uses: Deathcharge/helix-workflows/.github/workflows/quality.yml@main
    secrets: inherit

  security:
    uses: Deathcharge/helix-workflows/.github/workflows/security.yml@main
    secrets: inherit
```

2. Ensure your project has:
   - `tests/` directory with test files
   - `pyproject.toml` or `setup.py`
   - Optional: `pytest.ini` for pytest configuration

### For Node.js Projects

1. Create `.github/workflows/ci.yml` in your repository:

```yaml
name: CI

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    uses: Deathcharge/helix-workflows/.github/workflows/test-node.yml@main

  quality:
    uses: Deathcharge/helix-workflows/.github/workflows/quality.yml@main
    secrets: inherit

  security:
    uses: Deathcharge/helix-workflows/.github/workflows/security.yml@main
    secrets: inherit
```

2. Ensure your project has:
   - `package.json` with test script
   - `tests/` or `__tests__/` directory
   - Optional: `.eslintrc.json`, `.prettierrc.json`

### For Release Management

1. Create `.github/workflows/release.yml` in your repository:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    uses: Deathcharge/helix-workflows/.github/workflows/release.yml@main
    secrets: inherit
```

2. Tag your releases:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Configuration

### Python Project Configuration

**pyproject.toml:**

```toml
[project]
name = "your-project"
version = "1.0.0"

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
    "flake8>=5.0",
    "mypy>=0.990",
    "black>=22.0",
    "isort>=5.0",
]
```

**pytest.ini:**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --cov=src --cov-report=term-missing
```

### Node.js Project Configuration

**package.json:**

```json
{
  "scripts": {
    "test": "jest --coverage",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "build": "tsc"
  },
  "devDependencies": {
    "jest": "^29.0",
    "@types/jest": "^29.0",
    "eslint": "^8.0",
    "prettier": "^3.0",
    "typescript": "^5.0"
  }
}
```

---

## Secrets Management

### Setting Up Secrets

1. Go to your repository Settings → Secrets and variables → Actions
2. Add the following secrets as needed:

| Secret | Purpose | Where to Get |
|--------|---------|-------------|
| `PYPI_TOKEN` | Publish to PyPI | https://pypi.org/account/ |
| `NPM_TOKEN` | Publish to NPM | https://npmjs.com/settings/tokens |
| `SNYK_TOKEN` | Snyk security scanning | https://snyk.io/account/api-token |
| `SONAR_TOKEN` | SonarQube analysis | https://sonarcloud.io/account/security |
| `CODEFACTOR_PROJECTTOKEN` | CodeFactor analysis | https://www.codefactor.io/dashboard |

### Using Organization Secrets

For organization-wide secrets, set them in your GitHub organization settings and reference with `secrets: inherit` in your workflow.

---

## Best Practices

### 1. Always Use Specific Versions

Instead of `@main`, use specific versions:

```yaml
uses: Deathcharge/helix-workflows/.github/workflows/test-python.yml@v1.0.0
```

### 2. Combine Multiple Workflows

```yaml
jobs:
  test:
    uses: Deathcharge/helix-workflows/.github/workflows/test-python.yml@main

  quality:
    uses: Deathcharge/helix-workflows/.github/workflows/quality.yml@main
    needs: test

  security:
    uses: Deathcharge/helix-workflows/.github/workflows/security.yml@main
    needs: test
```

### 3. Require Status Checks

In your repository settings, require the following status checks to pass before merging:
- Test workflow
- Quality workflow
- Security workflow

### 4. Protect Main Branch

Set up branch protection rules:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Dismiss stale pull request approvals

---

## Troubleshooting

### Workflow Not Running

1. Check that the workflow file exists in `.github/workflows/`
2. Verify the syntax is correct (use GitHub's workflow editor)
3. Check that the trigger events match your repository activity
4. Ensure the referenced workflow exists in helix-workflows

### Tests Failing

1. Check that your project structure matches expectations:
   - Python: `tests/` directory with `test_*.py` files
   - Node.js: `tests/` or `__tests__/` directory
2. Verify dependencies are listed in `pyproject.toml` or `package.json`
3. Check that test scripts are defined in `package.json`

### Secrets Not Available

1. Verify secrets are set in repository settings
2. Use `secrets: inherit` to pass organization secrets
3. Check that secret names match exactly
4. Ensure secrets are not being masked in logs

### Coverage Reports Not Uploading

1. Ensure Codecov token is set (usually not needed for public repos)
2. Check that coverage files are generated
3. Verify `codecov-action` is using correct file path

---

## Contributing

To contribute improvements to these workflows:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly in your own repository
5. Submit a pull request

---

## Support

For issues or questions:

- **GitHub Issues:** https://github.com/Deathcharge/helix-workflows/issues
- **Email:** support@helixcollective.dev
- **Discord:** https://discord.gg/helix-collective

---

## License

Business Source License 1.1 (BSL 1.1)

Non-commercial use is free. Commercial use requires a license.  
See LICENSE file for details.

---

## Changelog

### v1.0.0 (June 17, 2024)

**Initial Release:**
- ✅ Python test workflow
- ✅ Node.js test workflow
- ✅ Security scanning workflow
- ✅ Code quality workflow
- ✅ Release management workflow
- ✅ Comprehensive documentation

---

**Maintained By:** Helix Collective  
**Repository:** https://github.com/Deathcharge/helix-workflows  
**Last Updated:** June 17, 2024
