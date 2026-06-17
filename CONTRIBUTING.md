# Contributing to Helix Workflows

Thank you for your interest in improving the Helix Workflows! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/helix-workflows.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages
7. Push to your fork
8. Submit a pull request

## Workflow Development Guidelines

### Adding a New Workflow

1. Create a new file in `.github/workflows/` with a descriptive name
2. Use the following template:

```yaml
name: Workflow Name

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  job-name:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Step description
      run: |
        # Your commands here
```

3. Document the workflow in README.md
4. Add examples of how to use it
5. Test in a separate repository before submitting

### Workflow Best Practices

- **Use specific action versions:** Always pin to specific versions, not `@main`
- **Add descriptive names:** Use clear, descriptive names for steps
- **Include error handling:** Use `continue-on-error: true` for non-critical steps
- **Cache dependencies:** Use caching to speed up builds
- **Document requirements:** Clearly document any secrets or prerequisites
- **Test thoroughly:** Test in multiple repository types before submitting
- **Keep it DRY:** Reuse existing steps and actions
- **Follow conventions:** Match the style of existing workflows

### Testing Your Workflow

1. Create a test repository in your account
2. Add the workflow to `.github/workflows/`
3. Trigger the workflow with a push or pull request
4. Verify it runs correctly
5. Check logs for any errors or warnings

## Code Style

- Use 2-space indentation in YAML
- Use descriptive variable names
- Add comments for complex logic
- Keep lines under 120 characters
- Use consistent naming conventions

## Documentation

When adding or modifying workflows:

1. Update README.md with:
   - Workflow name and description
   - Features list
   - Trigger events
   - Required secrets
   - Usage example

2. Add troubleshooting section if applicable

3. Include configuration examples

## Commit Messages

Use clear, descriptive commit messages:

```
Add Python test workflow with coverage reporting

- Multi-version testing (3.8, 3.9, 3.10, 3.11)
- Flake8 linting and MyPy type checking
- Codecov integration
- Dependency caching
```

## Pull Request Process

1. Ensure your PR title is descriptive
2. Include a clear description of changes
3. Reference any related issues
4. Include before/after examples if applicable
5. Ensure all tests pass
6. Request review from maintainers

## Reporting Issues

When reporting issues:

1. Use a clear, descriptive title
2. Describe the problem in detail
3. Include steps to reproduce
4. Provide example workflow files
5. Include error messages or logs
6. Specify your GitHub Actions environment

## Questions?

- Check existing issues and discussions
- Review the README.md documentation
- Open a discussion for questions
- Contact: support@helixcollective.dev

---

**Thank you for contributing to Helix Workflows!**
