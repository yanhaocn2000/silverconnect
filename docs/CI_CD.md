# 🚀 CI/CD & Testing Documentation

## Overview

SilverConnect Global uses a comprehensive CI/CD pipeline with automated testing, code quality checks, and multi-environment deployments.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Repository                      │
└────────┬────────────────────────────────────────┬───────┘
         │                                        │
    ┌────▼──────┐                          ┌──────▼───┐
    │ Push/PR   │                          │ Schedule │
    └────┬──────┘                          └──────┬───┘
         │                                        │
    ┌────▼─────────────────────────────────────────▼─────┐
    │        GitHub Actions Workflows                     │
    ├──────────────────────────────────────────────────┤
    │ • CI (Lint, Type, Unit, Integration, Build)     │
    │ • CD (Deploy, Docker, Migrations)               │
    │ • E2E (Playwright, Critical Flows)              │
    │ • Performance (Lighthouse, Bundle, Load, Memory) │
    └────┬──────────────────────────────────────────┬──┘
         │                                          │
    ┌────▼──────┐                            ┌─────▼──────┐
    │  Vercel   │                            │ Docker     │
    │ Production │                            │ Registry   │
    └───────────┘                            └────────────┘
```

## CI Pipeline

### Triggered On
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop`

### Jobs

#### 1. 📝 Lint & Type Check
- ESLint code quality checks
- TypeScript type checking
- No auto-fix in CI (for visibility)

**Status Badge**: ✅ Required to pass

#### 2. 🧬 Unit Tests
- Jest test runner
- React Testing Library for components
- Coverage threshold: 70%
- Runs on: `__tests__/**/*.test.ts`

**Status Badge**: ✅ Required to pass

#### 3. 🔗 Integration Tests
- API endpoint testing
- Database connectivity
- Service mocking
- PostgreSQL test database

**Status Badge**: ✅ Required to pass

#### 4. 🏗️ Build
- Next.js build verification
- Artifact upload for later use
- Size optimization

**Status Badge**: ✅ Required to pass

#### 5. 🔐 Security Scan
- Trivy vulnerability scanning
- npm audit for dependencies
- SARIF report upload

**Status Badge**: ⚠️ Informational

#### 6. 📊 Code Quality
- SonarCloud analysis
- Code duplication detection
- Maintainability index

**Status Badge**: ⚠️ Informational

---

## CD Pipeline

### Triggered On
- ✅ Merge to `main` branch
- ✅ CI workflow completion

### Jobs

#### 1. 🌐 Deploy to Vercel (Production)
- **Trigger**: Main branch push
- **URL**: https://silverconnect-global.vercel.app
- **Environment**: Production
- **Auto-restart**: Yes

#### 2. 🔄 Deploy to Staging
- **Trigger**: Develop branch push
- **URL**: https://staging-silverconnect-global.vercel.app
- **Environment**: Staging
- **Preview**: Enabled

#### 3. 🐳 Docker Build & Push
- **Registry**: GitHub Container Registry (ghcr.io)
- **Image**: `ghcr.io/yanhaocn2000/silverconnect:latest`
- **Tags**: Latest + git SHA

#### 4. 🗄️ Database Migration
- **Trigger**: After successful Vercel deployment
- **Command**: `npm run migrate:prod`
- **Rollback**: Manual

#### 5. 🔥 Smoke Tests
- **Trigger**: After Vercel deployment
- **Tests**: Critical user paths
- **Environment**: Production

#### 6. 📢 Slack Notification
- **Trigger**: After deployment
- **Info**: Status, branch, commit, author
- **Links**: Deployment, workflow run

---

## E2E Testing Pipeline

### Triggered On
- ✅ Push to any branch
- ✅ Daily schedule (2 AM UTC)

### Tests

#### 1. 🎭 Playwright E2E Tests
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: iPhone 12, Pixel 5
- **Retries**: 2 on failure
- **Reports**: HTML, JSON, JUnit

**Critical Flows Tested:**
- ✅ Homepage to booking
- ✅ Payment processing
- ✅ Authentication flows
- ✅ Multi-country pricing

#### 2. 🔴 Critical User Flows
- **Focus**: Core business logic
- **Timeout**: 30 minutes
- **Failure**: Blocks deployment

**Flows:**
- Sign up → Browse services → Book → Pay
- Sign in → View bookings → Cancel
- Multi-country service selection

#### 3. ⚡ Performance Testing
- **Tool**: Playwright performance metrics
- **Metrics**: FCP, LCP, CLS
- **Threshold**: <3 seconds

#### 4. 👁️ Visual Regression
- **Tool**: Playwright screenshots
- **Baseline**: Stored in repo
- **Detection**: Pixel-by-pixel comparison

---

## Performance Pipeline

### Triggered On
- ✅ Push to `main`
- ✅ Weekly schedule (Sunday 3 AM UTC)

### Tests

#### 1. 💡 Lighthouse Audit
- **URL**: Production site
- **Runs**: 3 consecutive
- **Metrics**:
  - Performance: 90%+
  - Accessibility: 90%+
  - Best Practices: 85%+
  - SEO: 90%+

#### 2. 📦 Bundle Analysis
- **Tool**: next-bundle-analyzer
- **Output**: Interactive report
- **Alert**: On size increase >50KB

#### 3. 🔥 Load Testing
- **Tool**: k6
- **Stages**: Ramp-up to 200 users
- **Duration**: 16 minutes total
- **Threshold**: p(99) < 1.5s

#### 4. 💾 Memory Leak Detection
- **Tool**: Node profiler
- **Duration**: Extended test run
- **Alert**: On memory increase >100MB

---

## Testing Best Practices

### Unit Tests
```typescript
// Test file location: __tests__/services/auth.service.test.ts
describe('AuthService', () => {
  it('should sign up a new user', async () => {
    // Arrange
    const email = 'test@example.com';
    
    // Act
    const result = await AuthService.signUp(email, 'password');
    
    // Assert
    expect(result.user.email).toBe(email);
  });
});
```

### Integration Tests
```typescript
// Test file location: __tests__/integration/bookings.integration.test.ts
describe('Bookings API', () => {
  it('should create and retrieve booking', async () => {
    // Setup test database
    // Create booking via API
    // Assert database state
  });
});
```

### E2E Tests
```typescript
// Test file location: e2e/booking-flow.spec.ts
test('should complete full booking flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Browse Services');
  // ... continue user flow
  await expect(page).toHaveURL('/confirmation');
});
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yanhaocn2000/silverconnect.git
cd silverconnect-global

# Install dependencies
npm install

# Setup pre-commit hooks
npx husky install

# Create .env.local from template
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Running Tests Locally

```bash
# Unit tests
npm run test:unit

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E UI mode
npm run test:e2e:ui

# E2E debug mode
npm run test:e2e:debug

# Critical flows only
npm run test:e2e:critical

# Performance tests
npm run test:performance

# All tests
npm test
```

### Running with Docker

```bash
# Start services (PostgreSQL, Redis, App)
npm run docker:up

# View logs
npm run docker:logs

# Run tests in Docker
docker-compose exec app npm test

# Stop services
npm run docker:down
```

---

## GitHub Secrets Required

For CI/CD to work, add these secrets to GitHub:

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `SONAR_TOKEN` | SonarCloud token |
| `DATABASE_URL` | Production database URL |

---

## Monitoring & Alerts

### Health Checks
- Container health: Every 30 seconds
- API endpoints: Every 5 minutes
- Database: Every 10 minutes

### Slack Notifications
- Deployment success/failure
- Test failure alerts
- Performance degradation
- Security vulnerabilities

### Logs & Monitoring
- Vercel Analytics: https://vercel.com/analytics
- GitHub Actions: GitHub repository Actions tab
- Sentry (if configured): Error tracking

---

## Troubleshooting

### CI Failed: ESLint errors
```bash
npm run lint:fix
git add .
git commit -m "fix: lint errors"
```

### CI Failed: Type errors
```bash
npm run type-check
# Fix TypeScript errors
```

### E2E Test Failed
```bash
npm run test:e2e:debug
# Debug mode with UI
```

### Docker Issues
```bash
docker-compose down -v
docker-compose up --build
```

---

## Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/feature-name`
3. Make changes
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/feature-name`
7. Create Pull Request

---

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright Docs](https://playwright.dev/)
- [Jest Docs](https://jestjs.io/)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
