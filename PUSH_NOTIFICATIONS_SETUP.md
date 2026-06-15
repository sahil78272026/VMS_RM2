# RM2 Gate — Push Notification Architecture & Setup Guide

This document serves as a complete historical record and tutorial on how we implemented end-to-end Push Notifications using Expo, FastAPI, and Firebase Cloud Messaging (FCM).

---

## 1. Database & Backend Configuration

### Saving the Token
Push notifications require knowing exactly which device belongs to which user. We updated the SQLite database schema (`backend/app/models/__init__.py`) to include an `expo_push_token` column on the `User` table. 

We then updated the `AuthService.login` endpoint so that whenever a resident successfully logs in, the backend saves their unique Expo token directly to their profile.

### Sending the Payload
We built the push logic inside `backend/app/services/notification_service.py` (`_send_push`). Instead of writing complex native FCM/APNs logic in Python, we route everything through Expo's intelligent proxy. 
The backend simply makes an HTTP POST request to `https://exp.host/--/api/v2/push/send` containing the resident's token, a title, a body, and a deep link payload (`rm2vms://resident?tab=dashboard`).

---

## 2. React Native (Mobile) Implementation

### Fetching the Token Securely
In `mobile/src/context/AuthContext.tsx`, we integrated `expo-notifications` and `expo-device`. 

*Crucially*, because Expo Go dropped support for remote push notifications in SDK 53, we implemented a **Dynamic Import Safety Check**:
```typescript
if (Device.isDevice && Constants.appOwnership !== 'expo') {
  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    expo_push_token = tokenData.data;
  }
}
```
This safely bypasses token generation when developing in Expo Go (preventing red error screens) but activates perfectly in Production or Development Builds.

### Foreground Display Handler
By default, Android swallows push notifications if the app is currently open. We overrode this behavior in `mobile/App.tsx` so that guards and residents always see alerts:
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## 3. The Firebase Android Configuration (The Final Boss)

Android OS requires all remote push notifications to go through Google's Firebase Cloud Messaging (FCM) network.

**Step 1: The Client Credentials**
1. Created a project in the Firebase Console.
2. Downloaded the `google-services.json` file.
3. Placed it in the `mobile/` directory and referenced it in `app.json`:
   ```json
   "android": {
     "package": "com.anonymous.mobile",
     "googleServicesFile": "./google-services.json"
   }
   ```
*(This file tells the Android OS how to listen to Firebase).*

**Step 2: The Server Credentials**
1. Generated a Service Account JSON Key from Firebase (Project Settings -> Service Accounts -> Generate new private key).
2. Uploaded this JSON file to the Expo Developer Dashboard (Credentials -> FCM V1 Service Account).
*(This file gives Expo the admin permission to send messages to Google on our behalf).*

---

## 4. Compiling the Native Development Client

Because `google-services.json` is a native Android configuration file, it cannot be updated over Wi-Fi via `npx expo start`. 

We used **EAS Build** to compile a custom Development Client in the cloud:
```bash
npx eas-cli build --profile development --platform android
```
This physically baked the Firebase credentials into the Java/Kotlin core of the `.apk`. Once installed on the phone, the React Native JavaScript code successfully initialized the FCM connection, grabbed the token, and the end-to-end pipeline was complete!
