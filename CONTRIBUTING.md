# Contributing to PWS

Thank you for your interest in contributing to PWS! This document provides guidelines and steps for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

- Check existing [issues](https://github.com/Great-Grace/PWS/issues) first
- Use the **Bug Report** template
- Include: steps to reproduce, expected vs actual behavior, device/OS info

### Suggesting Features

- Use the **Feature Request** template
- Explain the use case and expected benefit
- For ML model improvements, include references to relevant research

### ML Model Contributions

The ML engine (`shared/domain/formulas.ts`) is the heart of PWS. When contributing to the ML layer:

1. **Mathematical rigor**: Any change to UTCI computation, feature engineering, or perceptron logic must cite relevant literature
2. **Cross-platform parity**: Changes to `formulas.ts` must be reflected in Swift and Kotlin
3. **Test coverage**: All ML changes require unit tests with known input/output pairs
4. **Backward compatibility**: Weight format changes must include migration logic

### Platform-Specific Contributions

- **iOS**: Follow Apple's Human Interface Guidelines
- **Android**: Follow Material Design 3 guidelines
- **Shared**: TypeScript changes must pass all platform test suites

## Development Setup

### Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS development)
- Android Studio + JDK 21 (for Android development)
- Supabase CLI (for backend changes)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Great-Grace/PWS.git
cd PWS/app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase credentials

# Run tests
npm test                    # TypeScript shared domain
npm run native:ios:verify   # iOS build + tests
npm run native:android:verify  # Android build + tests
```

### Project Structure

```
shared/domain/        # Shared ML engine (TypeScript reference implementation)
apps/ios-native/      # iOS app (Swift/SwiftUI)
apps/android-native/  # Android app (Kotlin/Jetpack Compose)
supabase/             # Backend (Auth, Postgres, Edge Functions)
docs/                 # Documentation and business plans
```

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer `const` over `let`
- Use explicit return types for public functions
- Document mathematical formulas with literature references

### Swift

- Follow Swift API Design Guidelines
- Use SwiftUI for all new UI code
- Prefer value types (structs) over reference types
- Use `@Observable` for state management

### Kotlin

- Follow Kotlin Coding Conventions
- Use Jetpack Compose for all new UI code
- Prefer data classes for immutable state
- Use coroutines for async operations

### Git Conventions

- **Commit messages**: `type(scope): description`
  - `feat(ml): add wind chill feature vector`
  - `fix(ios): correct UTCI polynomial coefficient`
  - `docs(readme): update ML engine section`
- **Branch naming**: `feature/description`, `fix/description`, `docs/description`

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `master`
3. **Make your changes** following coding standards
4. **Add/update tests** for all changes
5. **Run all test suites** (TypeScript + iOS + Android)
6. **Update documentation** if needed
7. **Submit PR** with a clear description

### PR Checklist

- [ ] Tests pass on all platforms
- [ ] ML changes have literature references
- [ ] Cross-platform parity maintained
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No hardcoded secrets or credentials

## Issue Guidelines

### Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `ml-engine`: Changes to the ML/thermal comfort engine
- `ios`: iOS-specific issues
- `android`: Android-specific issues
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers

### Priority

- **P0**: Security vulnerabilities, data loss
- **P1**: Core functionality broken, ML accuracy issues
- **P2**: Feature requests, minor bugs
- **P3**: Documentation, cosmetic issues

## Questions?

- Open a [Discussion](https://github.com/Great-Grace/PWS/discussions) for general questions
- Open an [Issue](https://github.com/Great-Grace/PWS/issues) for bugs and feature requests

Thank you for contributing to PWS! 🌤️
