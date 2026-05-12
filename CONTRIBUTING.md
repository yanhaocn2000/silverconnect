# Contributing to SilverConnect Global

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional but recommended)
- Git

### Development Setup

```bash
# Clone repository
git clone https://github.com/yanhaocn2000/silverconnect.git
cd silverconnect-global

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev

# Visit http://localhost:3000
```

## Development Workflow

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature
```

### Code Style

We use ESLint and Prettier for code formatting.

```bash
# Lint code
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Format code
npx prettier --write .
```

### Writing Tests

#### Unit Tests
Place unit tests in `__tests__/` directory:

```typescript
// __tests__/services/my.service.test.ts
describe('MyService', () => {
  it('should do something', () => {
    const result = MyService.doSomething();
    expect(result).toBe(expected);
  });
});
```

#### E2E Tests
Place E2E tests in `e2e/` directory:

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('user can do something', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page).toHaveURL('/success');
});
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# All tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Specific test file
npm test -- __tests__/services/auth.service.test.ts
```

## Commit Guidelines

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build, CI/CD, or dependency updates

### Examples
```
feat(auth): add OAuth sign-in
fix(booking): resolve timezone issue
docs(readme): update installation steps
test(payment): add payment gateway tests
```

## Pull Request Process

1. **Update your branch** with the latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all tests locally**:
   ```bash
   npm test
   npm run test:e2e
   npm run lint
   npm run type-check
   ```

3. **Push your branch**:
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request** on GitHub with:
   - Descriptive title
   - Clear description of changes
   - Link related issues
   - Screenshots for UI changes
   - Test coverage information

5. **Address review comments** and update PR

6. **Merge** once approved and CI passes

## API Development

### Creating New Services

```typescript
// api/services/my-service.ts
export class MyService {
  static async doSomething(payload: MyPayload) {
    // Implementation
    return result;
  }
}
```

### Creating API Routes

```typescript
// api/routes/my-route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await MyService.doSomething();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Testing API Endpoints

```typescript
describe('POST /api/bookings', () => {
  it('should create booking', async () => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBookingData),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
  });
});
```

## Database Migrations

### Creating a Migration

```typescript
// scripts/migrations/001-add-users-table.ts
export async function up() {
  // Write migration code
}

export async function down() {
  // Write rollback code
}
```

### Running Migrations

```bash
npm run db:migrate
```

## Documentation

- Update README.md for user-facing changes
- Update docs/CI_CD.md for CI/CD changes
- Add JSDoc comments to complex functions
- Keep CHANGELOG.md updated

## Performance Considerations

- Keep bundle size under 300KB (gzipped)
- Optimize images (use WebP format)
- Use code splitting for routes
- Implement lazy loading for components
- Cache API responses appropriately

## Accessibility

- Use semantic HTML
- Include alt text for images
- Ensure keyboard navigation
- Use proper ARIA labels
- Test with screen readers
- Maintain 4.5:1 contrast ratio

## Reporting Issues

Use GitHub Issues with:
- Clear, descriptive title
- Detailed steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment information

## Questions?

- Check [Documentation](./CI_CD.md)
- Search existing issues
- Ask in GitHub Discussions

Thank you for contributing! 🙏
