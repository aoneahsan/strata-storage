# Contributing to Strata Storage

First off, thank you for considering contributing to Strata Storage! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code:

- **Be respectful** - Disagreements happen, but stay professional
- **Be welcoming** - We strive to be a community that welcomes all
- **Be considerate** - Your work affects others
- **Be patient** - Not everyone has the same experience level

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

1. **Clear title and description**
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if applicable)
6. **Environment details**:
   - Strata Storage version
   - Platform (Web/iOS/Android)
   - Browser/OS version
   - Framework (React/Vue/Angular)

**Example bug report:**
```markdown
### Bug: Storage.get() returns undefined on iOS after app restart

**Steps to reproduce:**
1. Set a value: `await storage.set('key', 'value')`
2. Force quit the app
3. Reopen and get: `await storage.get('key')`

**Expected:** Should return 'value'
**Actual:** Returns undefined

**Environment:**
- Strata Storage: 2.1.0
- Platform: iOS 16.4
- Capacitor: 5.0.0
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

1. **Use case** - Why is this needed?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - What else did you think about?
4. **Additional context** - Mockups, examples, etc.

### Your First Code Contribution

Unsure where to begin? Look for these labels:

- `good first issue` - Simple issues for beginners
- `help wanted` - Issues needing assistance
- `documentation` - Documentation improvements

## Development Setup

### Prerequisites

- Node.js 24.13.0+ and Yarn (this is a Yarn-only project — no npm/pnpm for local work)
- Git
- iOS development: Xcode 14+
- Android development: Android Studio (Android minSdk 23)

### Local Development

1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/strata-storage.git
cd strata-storage
```

2. **Install dependencies**
```bash
yarn install
```

3. **Run the quality gates**
```bash
yarn typecheck
yarn build
yarn lint
```

> This project has **no automated test runner** (a deliberate decision).
> Quality is enforced by `yarn typecheck` + `yarn build` + `yarn lint` — these
> are the checks your change must pass.

### Verifying Your Changes

1. **Quality gates** - all three must pass
```bash
yarn typecheck
yarn build
yarn lint
```

2. **Demo app** - exercise your change in a real application
```bash
cd example-apps/demo-app
yarn install
yarn start
```

## Development Process

### Project Structure

```
src/
├── core/           # Core classes (Strata, BaseAdapter, etc.)
├── adapters/       # Storage adapter implementations
│   ├── web/       # Browser adapters
│   └── capacitor/ # Native adapters
├── features/       # Advanced features (encryption, compression, etc.)
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

### Adding a New Storage Adapter

1. Create adapter file in appropriate directory
2. Extend `BaseAdapter` class
3. Implement required methods
4. Verify with `yarn typecheck` + `yarn build` + `yarn lint`
5. Update documentation

**Example:**
```typescript
// src/adapters/web/MyAdapter.ts
import { BaseAdapter } from '@/core/BaseAdapter';

export class MyAdapter extends BaseAdapter {
  readonly name = 'myStorage' as const;
  readonly capabilities = {
    persistent: true,
    synchronous: false,
    // ... other capabilities
  };

  async initialize(): Promise<void> {
    // Setup code
  }

  async get<T>(key: string): Promise<StorageValue<T> | null> {
    // Implementation
  }

  // ... other required methods
}
```

### Adding a New Feature

1. Create feature directory in `src/features/`
2. Implement feature class/functions
3. Integrate with main Strata class if needed
4. Add configuration options
5. Run the quality gates (`yarn typecheck` + `yarn build` + `yarn lint`)
6. Document the feature

## Style Guidelines

### TypeScript Style

We use ESLint and Prettier for consistent code style:

```typescript
// ✅ Good
export class StorageAdapter {
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async getValue<T>(key: string): Promise<T | null> {
    // Implementation
  }
}

// ❌ Bad
export class storage_adapter {
  config;
  
  constructor(config) {
    this.config = config
  }
  
  async get_value(key) {
    // Implementation
  }
}
```

### Documentation Style

- Use JSDoc for all public APIs
- Include examples in documentation
- Keep comments concise and valuable

```typescript
/**
 * Get a value from storage
 * 
 * @param key - The storage key
 * @param options - Retrieval options
 * @returns The stored value or null
 * 
 * @example
 * ```typescript
 * const user = await storage.get('user', { decrypt: true });
 * ```
 */
async get<T>(key: string, options?: GetOptions): Promise<T | null> {
  // Implementation
}
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Test additions/fixes
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other changes

### Examples
```bash
# Feature
feat(adapters): add Redis adapter support

# Bug fix
fix(encryption): resolve key derivation issue on iOS

# Documentation
docs(readme): add migration guide section

# Performance
perf(indexeddb): optimize bulk operations
```

## Pull Request Process

### Before Submitting

1. **Update from main**
```bash
git pull upstream main
git rebase upstream/main
```

2. **Run all checks** (these are the quality gates — there is no test runner)
```bash
yarn typecheck
yarn build
yarn lint
```

3. **Update documentation** if needed

4. **Verify your change** in the demo app for affected platforms

### PR Guidelines

1. **Title** - Use conventional commit format
2. **Description** - Explain what and why
3. **Related issues** - Link with "Fixes #123"
4. **Screenshots** - For UI changes
5. **Breaking changes** - Clearly marked

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Quality Gates
- [ ] `yarn typecheck` passes
- [ ] `yarn build` passes
- [ ] `yarn lint` passes
- [ ] Verified on Web
- [ ] Verified on iOS (if applicable)
- [ ] Verified on Android (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated checks** - Must pass all CI checks
2. **Code review** - At least one maintainer approval
3. **Testing** - Verified on affected platforms
4. **Documentation** - Updated if needed
5. **Merge** - Squash and merge to main

## Recognition

Contributors are recognized in:
- [Contributors list](https://github.com/aoneahsan/strata-storage/graphs/contributors)
- Release notes
- README.md (significant contributions)

## Getting Help

- **Discord**: [Join our community](https://discord.gg/strata-storage) (if available)
- **Discussions**: [GitHub Discussions](https://github.com/aoneahsan/strata-storage/discussions)
- **Issues**: [GitHub Issues](https://github.com/aoneahsan/strata-storage/issues)

## Financial Contributions

While not required, financial support helps maintain the project:
- **GitHub Sponsors**: [@aoneahsan](https://github.com/sponsors/aoneahsan)
- **Open Collective**: (if set up)

---

**Thank you for contributing to Strata Storage!** 🚀

Your contributions make this project better for everyone.