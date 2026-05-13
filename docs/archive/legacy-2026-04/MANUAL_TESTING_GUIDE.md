# 🎯 SilverConnect Global - Manual Testing Guide for Users

## Quick Start for End Users

Welcome! Your SilverConnect Global application is now ready for testing. Follow this guide to explore all features.

---

## 🌐 Accessing the Application

### URL
**http://localhost:3000**

### What You'll See
- A beautiful homepage with service listings
- Country selector (Australia, China, Canada)
- Sign in/Sign up options
- Featured services with pricing
- Support and Emergency links in the header

---

## 👥 User Roles & Testing Paths

### Role 1: Customer (Regular User)

#### Path 1A: Browse Services Without Login
1. Open http://localhost:3000
2. Select a country (Australia, China, or Canada)
3. Scroll down to see available services
4. View service details (name, description, duration, pricing)
5. Click "Book Now" on any service

#### Path 1B: Complete Booking Flow
1. Click "Book Now" on a service
2. **Expected**: Booking modal appears
3. Fill in:
   - Preferred date
   - Preferred time
   - Special requests
4. Click "Confirm Booking"
5. **Expected**: Success message + email confirmation prompt

#### Path 1C: Create Customer Account
1. Click "Sign Up" button (top right)
2. **Expected**: Sign Up modal appears
3. Fill in:
   - Email: `test.customer@example.com`
   - Password: `TestPass123!`
   - Full Name: `Test Customer`
   - User Type: Select "Customer"
   - Country: Select your country
4. Click "Create Account"
5. **Expected**: Redirected to homepage as logged-in user

#### Path 1D: View Support & Emergency
1. Click "24/7 Support" link in header
2. **Expected**: Support page loads with:
   - AI Chat assistant option
   - Email support contact
   - Phone support contact
   - FAQ section
3. Click "Emergency" to see emergency support page
4. **Expected**: Emergency page with urgent options

---

### Role 2: Service Provider

#### Path 2A: Create Provider Account
1. Click "Sign Up" button
2. Fill in form:
   - Email: `test.provider@example.com`
   - Password: `TestPass123!`
   - Full Name: `Test Provider`
   - User Type: Select "Service Provider"
   - Country: Australia
3. Click "Create Account"
4. **Expected**: Account created, ready to set up services

#### Path 2B: Access Provider Dashboard
1. Login with provider account
2. Click username dropdown (top right)
3. Select "Provider Dashboard"
4. **Expected**: Provider dashboard loads with tabs:
   - Overview (profile)
   - Services (manage service offerings)
   - Availability (set working hours)
   - Earnings (track payments)

#### Path 2C: Register Services
1. In Provider Dashboard → Services tab
2. See list of available services (Cleaning, Cooking, Gardening, etc.)
3. Check boxes next to services you want to offer
4. For each service, enter:
   - Custom price (if different from default)
   - Availability info
5. Click "Save Services"
6. **Expected**: Services saved, now visible to customers

#### Path 2D: Set Availability
1. Go to Provider Dashboard → Availability tab
2. Set:
   - Available days (Mon-Sun)
   - Hours of operation (e.g., 9 AM - 5 PM)
   - Special availability notes
3. Click "Save Schedule"
4. **Expected**: Availability updated

---

## 🧪 Feature Testing Checklist

### Feature 1: Service Browsing ✓
- [ ] Homepage loads
- [ ] Country selector works
- [ ] Services display with images
- [ ] Service cards show pricing
- [ ] "Book Now" buttons are clickable
- [ ] Clicking service shows details

### Feature 2: Authentication ✓
- [ ] Sign Up form opens
- [ ] Form validation works
- [ ] Account creation succeeds
- [ ] Sign In works with correct credentials
- [ ] Sign In fails with wrong credentials
- [ ] User menu shows logged-in username
- [ ] Sign Out works

### Feature 3: Booking System ✓
- [ ] Booking modal opens
- [ ] Date picker works
- [ ] Time picker works
- [ ] Booking submission succeeds
- [ ] Success message appears
- [ ] Booking is saved to database

### Feature 4: Provider Dashboard ✓
- [ ] Provider can access dashboard
- [ ] Can view profile section
- [ ] Can manage services
- [ ] Can set availability
- [ ] Can view earnings
- [ ] Changes are saved

### Feature 5: Multi-Language ✓
- [ ] English translations work
- [ ] Chinese translations work
- [ ] Language switch works in relevant components
- [ ] All pages support both languages

### Feature 6: Support System ✓
- [ ] Support page loads
- [ ] Emergency page loads
- [ ] AI chat opens
- [ ] Support contact options visible
- [ ] FAQ section loads

### Feature 7: Responsiveness ✓
- [ ] Desktop view looks good
- [ ] Mobile view adapts properly
- [ ] Tablet view responsive
- [ ] Navigation works on all sizes
- [ ] Forms mobile-friendly

---

## 💳 Payment Testing (When Database is Set Up)

### Stripe Test Credentials

Use these test card numbers:

| Card Type | Card Number | CVC | Date |
|-----------|-------------|-----|------|
| Visa (Success) | 4242 4242 4242 4242 | Any | Any future date |
| Visa (Decline) | 4000 0000 0000 0002 | Any | Any future date |
| Amex | 3782 822463 10005 | Any | Any future date |

---

## 🌍 Country-Specific Testing

### Australia (AUD)
- Currency: Australian Dollar ($)
- Services: All available
- Pricing: Default setup

### China (CNY)
- Currency: Chinese Yuan (¥)
- Services: All available
- Pricing: Converted to CNY

### Canada (CAD)
- Currency: Canadian Dollar ($)
- Services: All available
- Pricing: Converted to CAD

**Test All Countries**: Try creating accounts and booking services in each country.

---

## 🔍 Functional Testing Scenarios

### Scenario 1: Customer Books Service

**Steps:**
1. Visit homepage
2. Select country
3. Click "Book Now" on "Standard Home Cleaning"
4. Choose date and time
5. Enter booking details
6. Click "Confirm"

**Expected Result:**
- Booking confirmation modal
- Email sent (in dev mode: check console)
- Booking appears in customer history

**Possible Issues to Check:**
- [ ] Modal opens properly
- [ ] Date/time selectors work
- [ ] Submit button is enabled
- [ ] No JavaScript errors in console

---

### Scenario 2: Provider Registers & Manages Services

**Steps:**
1. Sign up as provider
2. Go to Provider Dashboard
3. Select services to offer
4. Set custom prices
5. Set availability
6. Save all changes

**Expected Result:**
- Services visible to customers
- Profile complete
- Availability schedule saved

**Possible Issues to Check:**
- [ ] Dashboard loads after login
- [ ] Service checkboxes work
- [ ] Price inputs validate
- [ ] Save button functions
- [ ] Changes persist on refresh

---

### Scenario 3: Multi-Language Support

**Steps:**
1. Visit homepage
2. Look for language toggle (if visible)
3. Check English version
4. Switch to Chinese (if available)
5. Verify all text translated

**Expected Result:**
- All UI text translates
- Formatting remains consistent
- Special characters display correctly

---

## 🐛 Debugging & Issue Reporting

### If Something Doesn't Work:

1. **Check Browser Console**
   ```
   Open DevTools: F12 or Cmd+Option+I
   Look for red error messages
   Note any errors in your report
   ```

2. **Check Network Tab**
   ```
   DevTools → Network tab
   Perform action that fails
   Look for failed requests (red)
   Check response status
   ```

3. **Clear Cache & Reload**
   ```
   Ctrl+Shift+Delete (Chrome/Firefox)
   or Cmd+Shift+Delete (Mac)
   Clear all data
   Reload page: Ctrl+R or Cmd+R
   ```

4. **Report Format**
   ```
   Issue: [Brief description]
   Steps to reproduce:
   1. [Step 1]
   2. [Step 2]
   Expected: [What should happen]
   Actual: [What happened instead]
   Browser: [Chrome/Firefox/Safari/Edge]
   OS: [Windows/Mac/Linux]
   Console errors: [Any errors shown]
   ```

---

## 📱 Device Testing

### Desktop (Recommended for testing)
- Browser: Chrome, Firefox, Safari, or Edge
- Resolution: 1920x1080 or higher
- Full feature access

### Tablet
- Dimensions: 768px - 1024px wide
- Test landscape and portrait
- Verify responsive layout

### Mobile
- Dimensions: 375px - 480px wide
- Test on actual device if possible
- Check touch interactions

---

## 🎨 UI/UX Testing Checklist

- [ ] Colors are consistent with brand
- [ ] Buttons have hover states
- [ ] Forms are easy to use
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Navigation is intuitive
- [ ] Typography is readable
- [ ] Spacing is consistent
- [ ] Images load properly
- [ ] Icons are recognizable

---

## ⚡ Performance Testing

### Page Load Times (should be < 3 seconds)
1. Open DevTools → Network tab
2. Reload page (Ctrl+R)
3. Check "Finish" time
4. Note any slow resources

### Interactive Performance
- Click buttons: Should respond instantly
- Type in forms: Should be smooth
- Scroll: Should be smooth
- Modals: Should open/close quickly

---

## 🔐 Security Testing (Basic)

- [ ] Never see raw API keys in console
- [ ] Passwords not logged anywhere
- [ ] HTTPS in production (will be configured)
- [ ] CORS properly configured
- [ ] No authentication tokens in URLs
- [ ] Forms use POST not GET for sensitive data

---

## 📊 Test Summary Template

```
Testing Session Report
======================
Date: [Date]
Tester: [Your Name]
Environment: [localhost:3000]
Browser: [Browser name/version]
Duration: [X minutes]

Features Tested:
✓ Feature 1: [PASS/FAIL]
✓ Feature 2: [PASS/FAIL]
✓ Feature 3: [PASS/FAIL]

Issues Found:
1. [Issue description]
   Status: [Open/Fixed/Duplicate]
   
2. [Issue description]
   Status: [Open/Fixed/Duplicate]

Overall Result: [PASS/FAIL]
Comments: [Additional notes]
```

---

## 🚀 Ready for Testing!

Your application is now ready. Here's what to do:

1. **Start with Homepage**
   - Visit http://localhost:3000
   - Explore the interface

2. **Try Customer Flow**
   - Create a customer account
   - Browse and book a service

3. **Try Provider Flow**
   - Create a provider account
   - Register services
   - Set availability

4. **Test Support Features**
   - Visit support page
   - Check emergency page
   - Try AI chat

5. **Report Findings**
   - Use template above
   - Document any issues
   - Note what works well

---

## 💬 Questions?

If you have questions during testing:
1. Check the support page at `/support`
2. Use the AI chat assistant
3. Check console for error messages
4. Contact the development team

---

## ✨ Enjoy Testing!

Thank you for helping test SilverConnect Global. Your feedback is valuable for improving the application!

---

**Last Updated**: April 19, 2026  
**Status**: Ready for Testing  
**Version**: 0.1.0
