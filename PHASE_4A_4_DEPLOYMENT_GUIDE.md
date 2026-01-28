# Phase 4A.4: Mobile Apps - Deployment Guide (iOS & Android)

**Deployment Status**: ✅ READY FOR PRODUCTION

---

## 📱 iOS Deployment Guide

### Prerequisites
- Mac with Xcode 14+ installed
- Apple Developer Account ($99/year)
- iOS 12+ SDK
- Generated certificates and provisioning profiles

### Step-by-Step Deployment

#### 1. Generate iOS Build
```bash
cd mobile
npm run build
npm install @capacitor/ios
npx cap add ios
npm run cap:sync
```

#### 2. Open in Xcode
```bash
npm run cap:open:ios
```

#### 3. Configure in Xcode
1. Select project → Targets → "App"
2. General:
   - Bundle Identifier: `com.kirana.store`
   - Team: Select your Apple team
   - Version: 1.0.0
   - Build: 1

3. Signing & Capabilities:
   - Team: Select your Apple team
   - Automatically manage signing: ✅
   - Capabilities:
     - Push Notifications: ON
     - Location Services: ON
     - Camera: ON
     - Photo Library: ON

4. Build Settings:
   - Deployment Target: 12.0+
   - Valid Architectures: arm64

#### 4. Build for App Store
1. Menu: Product → Archive
2. Wait for build to complete
3. Distribute App
4. Choose: Direct Upload to App Store

#### 5. App Store Connect

1. **Sign in** to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

2. **Create App**:
   - Click "Apps"
   - Click "+" → "New App"
   - Platform: iOS
   - Name: Kirana Store
   - Bundle ID: com.kirana.store
   - SKU: KIRANA-001
   - User Access: Full Access

3. **Fill Information**:
   - App Name: Kirana Store
   - Subtitle: Your neighborhood store, delivered
   - Description: Shop fresh groceries, delivered to your door in minutes
   - Keywords: grocery, store, delivery, shopping
   - Support URL: https://kirana.com/support
   - Privacy Policy URL: https://kirana.com/privacy

4. **Set Pricing**:
   - Pricing Tier: Free (In-App Purchases optional)
   - Territory: India + other target markets

5. **Upload Screenshots**:
   - 5.5" Display: iPhone 13/14 screenshot (1080×1920)
   - 6.5" Display: iPhone 13/14 Pro Max screenshot (1242×2688)
   - Minimum 2 screenshots per size

6. **Set App Review Information**:
   - Contact Email: your-email@kirana.com
   - Demo Account (optional)
   - Test Notes: "Test with account: test@kirana.com / Password123"

7. **Age Rating**:
   - Complete questionnaire
   - Select appropriate rating

8. **Submit for Review**:
   - Fill all required fields
   - Review compliance
   - Click "Submit for Review"

**Typical Review Time**: 1-5 days

### iOS Build Troubleshooting

**Issue**: Pod installation fails
```bash
cd ios/App
rm Podfile.lock
pod install
```

**Issue**: Code signing fails
```bash
# In Xcode
Window → Organizer → Delete Derived Data
Then try archive again
```

**Issue**: Memory warnings
```bash
# In Xcode Build Settings
- Optimization Level: -Os
- Whole Module Optimization: ON
```

---

## 🤖 Android Deployment Guide

### Prerequisites
- Android Studio 2022.1+
- Java 11+
- Google Play Developer Account ($25 one-time)
- Generated signing keystore

### Step-by-Step Deployment

#### 1. Generate Android Build
```bash
cd mobile
npm run build
npm install @capacitor/android
npx cap add android
npm run cap:sync
```

#### 2. Generate Signing Keystore
```bash
keytool -genkey -v -keystore kirana-store.keystore \
  -alias kirana \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keypass your-password \
  -storepass your-password
```

Save this keystore file safely!

#### 3. Configure Signing in Android Studio
1. Open `mobile/android` in Android Studio
2. File → Project Structure
3. Signing Configs:
   - Create config with keystore details
   - Alias: kirana
   - Keystore password: [your-password]
   - Key password: [your-password]

4. Build Types → Release:
   - Signing Config: Select configured keystore

#### 4. Build Release APK/AAB
```bash
cd android
./gradlew bundleRelease
```
Output: `app/release/app-release.aab`

#### 5. Upload to Play Store

1. **Sign in** to [play.google.com/console](https://play.google.com/console)

2. **Create App**:
   - Click "Create app"
   - App name: Kirana Store
   - Default language: English
   - Type: App
   - Category: Shopping
   - Target audience: Everyone 3+

3. **App Listing**:
   - Short description: (50 chars max)
   - Full description: (4000 chars max)
   - Icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshot: 4-8 screenshots (min 320x426 px)

4. **Upload Build**:
   - Go to "Release" → "Production"
   - Click "Create new release"
   - Upload AAB file (`app-release.aab`)
   - Add release notes

5. **Pricing & Distribution**:
   - Price: Free (default)
   - Countries: Select target countries
   - Recommended: India first

6. **Content Rating**:
   - Complete questionnaire
   - Auto-calculated rating

7. **Privacy Policy**:
   - Provide privacy policy URL
   - Ensure HTTPS link

8. **Review Compliance**:
   - Check all requirements
   - Accept terms

9. **Submit for Review**:
   - Click "Send for review"
   - Will appear in production in 2-4 hours (usually)

**Typical Review Time**: 2-4 hours (vs iOS's 1-5 days)

### Android Build Troubleshooting

**Issue**: Gradle build fails
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

**Issue**: Signing fails
```bash
# Check keystore path and passwords
keytool -list -v -keystore kirana-store.keystore
```

**Issue**: Play Store upload fails
```bash
# Ensure:
# 1. Version code is higher than previous
# 2. Build is signed with correct keystore
# 3. AAB is valid: jar tf app-release.aab
```

---

## 📊 App Store Optimization (ASO)

### Store Listing

**App Name** (50 characters):
```
Kirana Store - Fresh Groceries Delivered
```

**Subtitle** (30 characters):
```
Fresh, Fast, Reliable Delivery
```

**Description** (4000 characters for Android, 170 for iOS):
```
Shop fresh groceries from your neighborhood Kirana store!

✨ Features:
🏪 1000+ fresh products
🚚 Fast delivery (30 minutes)
💳 Easy payment options
🎮 Loyalty rewards & cashback
📍 Real-time tracking
⭐ Best prices guaranteed

Why Kirana Store?
✅ Fresh produce daily
✅ Support local stores
✅ Same-day delivery
✅ Best prices in market
✅ Quality guaranteed

Download now and get ₹100 off on first order!
```

**Keywords** (relevant for search):
```
groceries, grocery store, delivery, online shopping, 
supermarket, fresh products, dairy, vegetables, 
fruits, organic, food delivery, quick delivery
```

---

## 🚀 Beta Testing

### TestFlight (iOS)
```bash
# Via Xcode
- Archive → Distribute App
- Select TestFlight
- Add testers
- Share link with beta testers
```

### Google Play Beta (Android)
```
- Console → Release → Testing → Internal testing
- Upload APK
- Add tester Google accounts
- Share link with beta testers
```

---

## 📈 Post-Launch Monitoring

### Setup Crash Reporting
```bash
npm install @sentry/capacitor
```

Configure in `main.tsx`:
```typescript
import * as Sentry from "@sentry/capacitor";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [...Sentry.Capacitor.getDefaultIntegrations()],
  tracesSampleRate: 0.5,
});
```

### Setup Analytics
```bash
npm install firebase
```

Configure in `main.tsx`:
```typescript
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseApp = initializeApp({
  apiKey: "...",
  projectId: "...",
  // ... other config
});

const analytics = getAnalytics(firebaseApp);
```

### Monitor Metrics
1. **Crash Rate**: Should be <0.1%
2. **ANR Rate**: Should be <0.05%
3. **Session Length**: Target 5-8 minutes
4. **Conversion**: Target 3-5%
5. **DAU**: Track growth trajectory

---

## 🔄 Update Distribution

### Update Notification
Push notification when new version available:
```javascript
// In App.tsx
const checkForUpdates = async () => {
  const latestVersion = await apiClient.getLatestVersion();
  if (latestVersion > currentVersion) {
    showUpdateAlert();
  }
};
```

### Phased Rollout
- Week 1: 25% of users
- Week 2: 50% of users
- Week 3: 75% of users
- Week 4: 100% of users

---

## 📋 Deployment Checklist

### Pre-Launch
- [ ] All tests passing (npm test)
- [ ] No console errors or warnings
- [ ] Performance metrics met
- [ ] Security audit passed
- [ ] Privacy policy ready
- [ ] Support email configured
- [ ] App icon (1024x1024)
- [ ] Screenshots prepared (5 min)
- [ ] Description written
- [ ] Pricing set
- [ ] Target countries selected

### iOS
- [ ] Apple Developer Account active
- [ ] Certificates generated
- [ ] Provisioning profiles set
- [ ] Build running on test devices
- [ ] TestFlight beta sent to testers
- [ ] Feedback collected & fixed
- [ ] App Store submission complete

### Android
- [ ] Google Play Developer Account active
- [ ] Signing keystore generated
- [ ] Release APK/AAB built
- [ ] Internal testing launched
- [ ] Open testing launched (optional)
- [ ] Google Play submission complete

### Post-Launch
- [ ] Monitor crash reports
- [ ] Collect user reviews
- [ ] Respond to feedback
- [ ] Push update if needed
- [ ] Collect analytics
- [ ] Monitor download growth

---

## 💡 Tips for Success

1. **Start with India**: Test market for expansion
2. **Leverage Reviews**: Encourage 5-star reviews
3. **Respond Quickly**: Address user feedback
4. **Regular Updates**: Push updates biweekly
5. **Track Metrics**: Monitor all KPIs
6. **A/B Test**: Test different store listings
7. **Push Notifications**: Engage users regularly
8. **Run Ads**: Invest in user acquisition

---

## 📞 Support Resources

- **Apple Developer**: developer.apple.com
- **Google Play Console**: play.google.com/console
- **Capacitor Docs**: capacitorjs.com
- **Firebase Console**: console.firebase.google.com
- **Sentry Dashboard**: sentry.io

---

**Last Updated**: January 28, 2026
**Version**: 1.0.0 - Ready for Production
