# Contributing to FisioFlow Pro

Thank you for your interest in contributing to FisioFlow Pro!

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 9 or later
- Expo CLI
- Git

### Installation

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/fisioflow.git
   cd fisioflow
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Start the development server:
   ```bash
   pnpm start
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent fixes for production

### Creating a Pull Request

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```

4. Create a pull request on GitHub

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```
feat(patients): add patient search functionality
```

## Code Quality

### Linting

Run the linter before committing:
```bash
pnpm lint
```

### Type Checking

Run TypeScript type checking:
```bash
pnpm typecheck
```

### Testing

Run tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Run tests with coverage:
```bash
pnpm test:coverage
```

## CI/CD

All pull requests must pass the following checks:

- ESLint
- TypeScript type checking
- Unit tests

## EAS Builds

### Development Build
```bash
eas build --profile development --platform ios
```

### Preview Build
```bash
eas build --profile preview --platform ios
```

### Production Build
```bash
eas build --profile production --platform ios
```

### Submit to App Store
```bash
eas submit --platform ios
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Write descriptive variable and function names
- Add comments for complex logic
- Write unit tests for new features

## Security

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Report security issues privately

## Questions?

Feel free to open an issue if you have questions!
