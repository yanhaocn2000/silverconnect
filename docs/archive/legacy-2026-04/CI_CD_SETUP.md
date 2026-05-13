# 🌏 SilverConnect Global - CI/CD & Testing Setup Guide

Complete CI/CD pipeline, testing infrastructure, and multi-service architecture for your global senior care platform.

## 📊 What's Included

### ✅ **CI/CD Workflows (4 pipelines)**
- **CI Pipeline**: Lint, type-check, unit tests, integration tests, build, security scan, code quality
- **CD Pipeline**: Vercel deployment, Docker build, database migrations, smoke tests, Slack notifications  
- **E2E Pipeline**: Playwright tests, critical flows, visual regression, performance monitoring
- **Performance Pipeline**: Lighthouse audits, bundle analysis, k6 load testing, memory leak detection

### ✅ **Testing Framework**
- **Jest** with React Testing Library (unit & integration tests)
- **Playwright** for end-to-end testing (Chromium, Firefox, WebKit, Mobile)
- **k6** for load testing
- **Lighthouse CI** for performance audits
- Coverage tracking with Codecov

### ✅ **Backend Services (6 microservices)**
- 🔐 **Auth Service** - User authentication & authorization (Supabase)
- 💳 **Payment Service** - Stripe integration with multi-currency support
- 📧 **Email Service** - Transactional emails (nodemailer)
- 📝 **Booking Service** - Service scheduling & availability management
- 🌍 **Geo Service** - Country-specific pricing, currency conversion, tax calculation
- 📢 **Notification Service** - Multi-channel notifications (email, SMS, push, in-app)

### ✅ **API Routes & Middleware**
- `/api/bookings` - CRUD operations for bookings
- `/api/payments/*` - Payment intent management
- `/api/geo/*` - Geo data & pricing calculations
- Rate limiting middleware
- CORS middleware
- Authentication middleware

### ✅ **Docker & Containerization**
- Dockerfile with multi-stage build
- docker-compose.yml with 7 services:
  - PostgreSQL database
  - Redis cache
  - Mailhog (email testing)
  - Next.js app
  - Adminer (database UI)
  - Redis Commander
  - App container

### ✅ **Development Tools**
- Husky pre-commit hooks
- ESLint + Prettier
- TypeScript strict mode
- Jest configuration
- Playwright configuration
- SonarCloud integration
- GitHub Actions workflows

### ✅ **Documentation**
- CI/CD guide: `docs/CI_CD.md`
- Contributing guide: `CONTRIBUTING.md`
- Quick start guide: `QUICKSTART.md`
- API documentation

---

## 🚀 Getting Started

### Step 1: Clone & Install
```bash
git clone https://github.com/yanhaocn2000/silverconnect.git
cd silverconnect-global
npm install
```

### Step 2: Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your credentials:
# - Supabase URL & keys
# - Stripe keys
# - Email configuration
```

### Step 3: Start Development
```bash
# Option A: Direct start
npm run dev

# Option B: With Docker
npm run docker:up
```

### Step 4: Run Tests
```bash
# Unit tests
npm run test:unit

# E2E tests  
npm run test:e2e

# All tests
npm test
```

Visit **http://localhost:3000** 🎉

---

## 📋 Project Structure

```
silverconnect-global/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # CI pipeline
│   │   ├── cd.yml                 # CD pipeline
│   │   ├── e2e.yml                # E2E tests
│   │   └── performance.yml        # Performance tests
│   └── ISSUE_TEMPLATE/
├── api/
│   ├── services/
│   │   ├── auth.service.ts        # Authentication
│   │   ├── payment.service.ts     # Payment processing
│   │   ├── email.service.ts       # Email notifications
│   │   ├── booking.service.ts     # Booking management
│   │   ├── geo.service.ts         # Geo & pricing
│   │   └── notification.service.ts# Notifications
│   ├── routes/
│   │   ├── bookings.ts            # Booking endpoints
│   │   ├── payments.ts            # Payment endpoints
│   │   └── geo.ts                 # Geo endpoints
│   └── middleware/
│       └── index.ts               # Rate limit, CORS, auth
├── __tests__/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   └── geo.service.test.ts
│   └── setup.ts
├── e2e/
│   ├── booking-flow.spec.ts       # Main booking flow
│   └── critical-flows.spec.ts     # Critical user journeys
├── k6/
│   └── load-test.js               # k6 load testing script
├── scripts/
│   ├── migrate.js                 # Database migrations
│   ├── seed-catalog.ts            # Service catalog + price seeding (`npm run db:seed`)
│   ├── seed-providers.ts          # Demo provider seeding (`npm run db:seed:providers`)
│   ├── memory-leak-test.js        # Memory leak detection
│   ├── quickstart.js              # Quick start helper
│   └── generate-test-report.sh    # Report generation
├── Dockerfile                     # Production Docker image
├── docker-compose.yml             # Local dev environment
├── jest.config.js                 # Jest configuration
├── playwright.config.ts           # Playwright configuration
├── lighthouserc.json              # Lighthouse configuration
├── sonar-project.properties       # SonarCloud configuration
├── codecov.yml                    # Codecov configuration
├── .env.example                   # Environment template
├── QUICKSTART.md                  # Quick start guide
├── CONTRIBUTING.md                # Contributing guide
└── docs/
    └── CI_CD.md                   # Detailed CI/CD documentation
```

---

## 🔄 CI/CD Pipeline Overview

### Trigger Events
- **PR opened/updated**: Runs CI checks
- **Merge to main**: Runs CI, CD, and deploys to production
- **Merge to develop**: Runs CI and deploys to staging
- **Daily at 2 AM UTC**: Runs E2E tests
- **Weekly Sunday**: Runs performance tests

### Pipeline Stages

```
Code Push → Lint & Type → Unit Tests → Integration Tests → Build
                ↓              ↓              ↓               ↓
          (Run in CI)   (Run in CI)   (Run in CI)      (Run in CI)
                                                        
                                    → Security Scan → Code Quality
                                          ↓                ↓
                                      (Report)        (Report)
                                      
→ Deploy to Vercel → Docker Build → DB Migration → Smoke Tests → Notify
     (Production)    (Registry)       (if prod)      (if prod)   (Slack)
```

---

## 🧪 Testing Strategy

### Unit Tests
```bash
npm run test:unit
```
- **Location**: `__tests__/**/*.test.ts`
- **Coverage**: 70% minimum
- **Tools**: Jest, React Testing Library
- **Examples**: Auth, Geo services

### Integration Tests
```bash
npm run test:integration
```
- **Location**: `__tests__/**/*.integration.test.ts`
- **Coverage**: API endpoints, database interactions
- **Database**: PostgreSQL test database
- **Tools**: Supertest, Jest

### E2E Tests
```bash
npm run test:e2e
```
- **Location**: `e2e/**/*.spec.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: iPhone 12, Pixel 5
- **Tools**: Playwright
- **Examples**: Booking flow, authentication, payment

### Performance Tests
```bash
npm run test:performance
```
- **Lighthouse**: Performance, accessibility, SEO audits
- **Bundle**: Size analysis
- **Load**: k6 testing
- **Memory**: Leak detection

---

## 🔌 API Services

### Auth Service
```typescript
AuthService.signUp(email, password)
AuthService.signIn(email, password)
AuthService.getCurrentUser()
AuthService.resetPassword(email)
AuthService.updatePassword(newPassword)
```

### Payment Service
```typescript
PaymentService.createPaymentIntent({amount, currency, customerEmail})
PaymentService.getPaymentIntent(intentId)
PaymentService.confirmPaymentIntent(intentId)
PaymentService.createRefund(paymentIntentId, amount)
```

### Booking Service
```typescript
BookingService.createBooking(payload)
BookingService.getBooking(bookingId)
BookingService.getUserBookings(userId)
BookingService.updateBookingStatus(bookingId, status)
BookingService.cancelBooking(bookingId, reason)
BookingService.getAvailableSlots(serviceId, date)
```

### Geo Service
```typescript
GeoService.getCountryData(countryCode)
GeoService.calculatePriceWithTax(basePrice, countryCode)
GeoService.formatCurrency(amount, countryCode)
GeoService.convertCurrency(amount, fromCurrency, toCurrency)
GeoService.getExchangeRates(fromCurrency, toCurrency)
```

### Email Service
```typescript
EmailService.send({to, subject, html})
EmailService.sendBookingConfirmation(email, bookingDetails)
EmailService.sendPasswordReset(email, resetLink)
EmailService.sendWelcome(email, name)
```

### Notification Service
```typescript
NotificationService.createNotification(payload)
NotificationService.getUserNotifications(userId)
NotificationService.markAsRead(notificationId)
NotificationService.sendBulkNotifications(userIds, payload)
```

---

## 🐳 Docker Setup

### Quick Start
```bash
npm run docker:up
```

### Services Included
| Service | Port | URL |
|---------|------|-----|
| App | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | postgres://postgres:postgres@localhost |
| Redis | 6379 | redis://localhost:6379 |
| Mailhog | 8025 | http://localhost:8025 |
| Adminer | 8080 | http://localhost:8080 |
| Redis Commander | 8081 | http://localhost:8081 |

### Custom Commands
```bash
npm run docker:logs        # View logs
npm run docker:down        # Stop services
docker-compose ps          # Show status
```

---

## 📊 Key Metrics & Thresholds

| Metric | Threshold | Tool |
|--------|-----------|------|
| Code Coverage | 70%+ | Jest/Codecov |
| Performance Score | 90%+ | Lighthouse |
| Accessibility | 90%+ | Lighthouse |
| Bundle Size | <300KB | Bundle Analyzer |
| Load Test p99 | <1.5s | k6 |
| Error Rate | <0.1% | k6 |
| Uptime | 99.9% | Vercel |

---

## 🚀 Deployment

### Automatic Deployments
- **Production**: Merge to `main` → Vercel deployment
- **Staging**: Merge to `develop` → Staging deployment
- **Docker**: Images pushed to GitHub Container Registry

### Manual Deployments
```bash
# Deploy to Vercel
npx vercel --prod

# Push Docker image
docker push ghcr.io/yanhaocn2000/silverconnect:latest

# Run migrations
npm run db:migrate
```

---

## 📝 Environment Variables

See `.env.example` for all variables. Key ones:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# Email
EMAIL_USER=
EMAIL_PASSWORD=

# Deployment
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

---

## 🔒 GitHub Secrets

Configure these in repository settings → Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SLACK_WEBHOOK_URL`
- `SONAR_TOKEN`
- `DATABASE_URL`

---

## 📚 Documentation

- **[CI/CD Deep Dive](docs/CI_CD.md)** - Detailed workflow documentation
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Quick Start](QUICKSTART.md)** - 5-minute setup
- **[API Services](api/services/)** - Service documentation
- **[Test Examples](__tests__/)** - Test patterns

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm start                  # Start production server

# Linting & Type Check
npm run lint               # Check code quality
npm run lint:fix           # Auto-fix lint errors
npm run type-check         # TypeScript check

# Testing
npm test                   # Run all tests
npm run test:watch        # Watch mode
npm run test:unit         # Unit tests only
npm run test:e2e          # E2E tests
npm run test:e2e:ui       # E2E UI mode
npm run test:coverage     # Coverage report

# Docker
npm run docker:up         # Start services
npm run docker:down       # Stop services
npm run docker:logs       # View logs

# Database
npm run db:migrate        # Run migrations
npm run db:seed          # Seed database

# Analysis
npm run analyze:bundle   # Bundle analysis
```

---

## 🎯 Next Steps

1. ✅ **Setup**: Follow Quick Start above
2. ✅ **Read**: Check [docs/CI_CD.md](docs/CI_CD.md)
3. ✅ **Test**: Run `npm test && npm run test:e2e`
4. ✅ **Develop**: Start building features
5. ✅ **Deploy**: Push to GitHub and watch CI/CD work!

---

## 📞 Support

- 📖 Read documentation in `docs/`
- 🐛 Report bugs using GitHub Issues
- 💬 Check [CONTRIBUTING.md](CONTRIBUTING.md) for help
- 📧 Contact maintainers

---

## 📜 License

MIT

---

**Happy coding! 🚀**
