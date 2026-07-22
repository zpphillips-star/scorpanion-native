# App Icons & Splash Screen

Before submitting to the App Store or Google Play, replace the placeholder images in `assets/images/` with final production assets.

## Required files

| File | Size | Notes |
|------|------|-------|
| `assets/images/icon.png` | 1024×1024 px | App icon — dark background (`#09090b`), Scorpanion logo centered |
| `assets/images/splash-icon.png` | 2048×2048 px | Splash screen image — dark background (`#09090b`), Scorpanion logo centered |
| `assets/images/android-icon-foreground.png` | 1024×1024 px | Adaptive icon foreground layer (Android) |
| `assets/images/android-icon-background.png` | 1024×1024 px | Adaptive icon background (`#09090b`) |
| `assets/images/android-icon-monochrome.png` | 1024×1024 px | Monochrome icon for themed Android launchers |
| `assets/images/favicon.png` | 48×48 px | Web favicon |

## Design guidelines

- **Background color**: `#09090b` (zinc-950) — matches the app's dark theme
- **Logo**: Use the Scorpanion wordmark or icon in white/light on the dark background
- **Safe zone**: Keep the logo within the center 50% of the canvas for adaptive icon cropping

## Tools

- [Expo's icon guide](https://docs.expo.dev/develop/user-interface/app-icons/)
- [EAS Build docs](https://docs.expo.dev/build/introduction/)
- [Figma / Sketch / Photoshop] — export at the sizes above as PNG-24 with no transparency on icon/splash backgrounds
