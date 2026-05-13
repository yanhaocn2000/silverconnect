# 🧪 Test Data Setup Guide

## Quick Start - Create Test Accounts

This guide helps you create test customer and service provider accounts for end-to-end testing in Kew East, VIC 3102.

### Prerequisites

1. **Supabase Project Running** - Make sure your Supabase instance is accessible
2. **Environment Variables** - Add these to `.env.local`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **ts-node Installed** (for running TypeScript scripts):
   ```bash
   npm install --save-dev ts-node
   ```

### Step 1: Create Test Accounts

Run the seeding script:

```bash
npm run db:seed:test
```

**What this creates:**

#### 👤 Test Customer
- **Email:** `testcustomer@silverconnect.local`
- **Password:** `TestCustomer123!`
- **Location:** Kew East, VIC 3102
- **Address:** 42 Mountain View Lane, Kew East VIC 3102

#### 👨‍💼 Test Service Provider
- **Email:** `testprovider@silverconnect.local`
- **Password:** `TestProvider123!`
- **Location:** Kew East, VIC 3102
- **Address:** 15 Local Street, Kew East VIC 3102
- **Verified:** Yes ✓
- **Rating:** 4.8/5 (25 reviews)
- **Services:** 3 specialties (Cleaning, Cooking, Gardening)
- **Availability:** Mon-Sat 9am-5pm (Sat 10am-2pm)

### Step 2: Sign In & Test

1. **Open the app:** http://localhost:3000

2. **Sign in as customer:**
   - Email: `testcustomer@silverconnect.local`
   - Password: `TestCustomer123!`

3. **Test the workflow:**
   - ✅ Browse services (should show Kew East, VIC 3102)
   - ✅ Find the test provider in search results
   - ✅ Book a service
   - ✅ Make a payment (use Stripe test card: `4242 4242 4242 4242`)
   - ✅ Message the provider
   - ✅ Complete booking flow

### Step 3: Test as Provider (Optional)

Sign in as the test provider to:
- Accept/decline bookings
- Provide feedback to customers
- Set custom pricing

```
Email: testprovider@silverconnect.local
Password: TestProvider123!
```

---

## 🗺️ Location Detection - Kew East 3102

The app automatically detects Kew East with these coordinates:
- **Latitude:** -37.8294
- **Longitude:** 145.0929
- **Postcode:** 3102
- **State:** VIC (Victoria)

When you visit the homepage, you should see:
```
📍 Service Location: Kew East, VIC 🇦🇺
   Postcode: 3102
```

---

## 🗑️ Cleanup - Reset Test Data

To remove test accounts (destructive):

```bash
# Manual deletion via Supabase dashboard:
# 1. Go to Authentication > Users
# 2. Find testcustomer@silverconnect.local and testprovider@silverconnect.local
# 3. Delete both users
```

Or use Supabase CLI:
```bash
supabase db push  # Re-run migrations to reset database
```

---

## 🐛 Troubleshooting

### Error: "SUPABASE_SERVICE_KEY environment variable is required"
- Make sure `SUPABASE_SERVICE_KEY` is set in `.env.local`
- Use your **Service Role Key**, not the anon key
- Get it from: Supabase Dashboard > Settings > API > Service Role Key

### Error: "Error creating customer auth: User already exists"
- The test accounts already exist
- Delete them from Supabase Dashboard > Authentication > Users
- Then run the script again

### Geolocation not working
- Must be on localhost or HTTPS
- Browser will ask for permission first time
- Deny permission to see fallback (defaults to Melbourne)
- Try again or refresh to grant permission

### Services not showing for the test provider
- Ensure the services table has at least 3 services inserted
- Check provider_availability table has entries for Mon-Sat
- Verify service_providers.is_verified = true

---

## 📝 Test Scenarios

Once you have test accounts, try these flows:

### Scenario 1: Complete Booking Flow
1. Sign in as customer
2. Search for cleaning services
3. Find test provider
4. Click "Book Now"
5. Select date/time (pick tomorrow at 2pm)
6. Review booking details
7. Process payment with test card
8. Confirm booking received

### Scenario 2: Provider Accepts Booking
1. Sign in as provider (new browser tab or window)
2. Go to dashboard
3. See incoming booking request
4. Accept the booking
5. Message customer with confirmation

### Scenario 3: Customer-Provider Messaging
1. As customer, go to booking details
2. Click "Message Provider"
3. Ask a question about the service
4. Switch to provider tab
5. Reply to customer
6. Verify message appears in customer tab

### Scenario 4: Booking Completion & Feedback
1. After service (change booking date to today in Supabase)
2. As customer, leave feedback/rating
3. As provider, leave counter-feedback
4. Both see ratings update

---

## 🚀 Next Steps

After testing end-to-end:

1. ✅ Run integration tests: `npm run test:integration`
2. ✅ Run E2E tests: `npm run test:e2e:uat`
3. ✅ Run performance tests: `npm run test:performance`
4. ✅ Deploy to staging for UAT
5. ✅ Production deployment

Happy testing! 🎉
