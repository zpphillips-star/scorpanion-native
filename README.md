# Scorpanion Native

ESPN-style live scores, standings, and game detail sheets — built with **Expo** (React Native) and powered by the [Scorpanion](https://scorpanion.vercel.app) API.

## What this is

A mobile app for tracking live sports scores across MLB, NFL, NBA, NHL, MLS, and WNBA. Features include:

- Live scores with auto-polling (2 s when games are in progress, 30 s otherwise)
- Sport filter tabs
- Game detail bottom sheet with line score, top performers, and pitching (MLB)
- Team detail bottom sheet with recent results, upcoming schedule, and team stats

---

## Run locally

```bash
npm install
npx expo start
```

Scan the QR code in Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

### Environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=https://scorpanion.vercel.app
```

The app defaults to `https://scorpanion.vercel.app` if the variable is not set.

---

## Build for App Store (iOS)

```bash
# One-time EAS login
eas login

# Production build (uploads to App Store Connect)
eas build --platform ios --profile production
```

---

## Build for Google Play (Android)

```bash
# Production AAB build
eas build --platform android --profile production

# Preview APK (for direct install / testing)
eas build --platform android --profile preview
```

---

## Submit to stores

```bash
# After a successful production build:
eas submit --platform ios
eas submit --platform android
```

---

## Before you can submit — checklist

| Item | Where to fill in |
|------|-----------------|
| Apple Developer account enrolled | [developer.apple.com](https://developer.apple.com) |
| App Store Connect App ID (`ascAppId`) | `eas.json` → `submit.production.ios.ascAppId` |
| Apple Team ID (`appleTeamId`) | `eas.json` → `submit.production.ios.appleTeamId` |
| Apple ID email (`appleId`) | `eas.json` → `submit.production.ios.appleId` |
| Google Play service account JSON | Download from Google Play Console → place at `./google-play-key.json` |
| App icons & splash screen | See `assets/README.md` |

---

## Project structure

```
app/           Expo Router screens (index, schedule, standings, teams)
components/    GameCard, GameDetailSheet, TeamDetailSheet
lib/           api.ts (fetch helpers), types.ts
assets/        Images and icon placeholders
eas.json       EAS Build / Submit configuration
app.json       Expo app config
```

---

## Tech stack

- [Expo](https://expo.dev) / React Native
- [Expo Router](https://expo.github.io/router) — file-based navigation
- [NativeWind](https://www.nativewind.dev) — Tailwind CSS for React Native
- [EAS Build](https://docs.expo.dev/build/introduction/) — cloud builds for iOS & Android

