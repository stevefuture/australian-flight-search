# Install on iOS (iPhone/iPad)

This app works as a Progressive Web App (PWA) on iOS devices. Follow these steps to install it on your home screen like a native app.

## Installation Steps

### 1. Open in Safari
**Important:** You must use Safari browser on iOS. Other browsers like Chrome don't support PWA installation on iOS.

1. Open Safari on your iPhone or iPad
2. Navigate to your app URL (e.g., `http://your-server-ip:3000`)

### 2. Add to Home Screen

1. Tap the **Share** button (the square with an arrow pointing up) at the bottom of Safari
2. Scroll down and tap **"Add to Home Screen"**
3. You'll see the app icon and name
4. Tap **"Add"** in the top right corner

### 3. Use the App

- Find the app icon on your home screen
- Tap to open - it will launch like a native app
- No browser bars - runs in standalone mode
- Works offline for previously visited pages

## Features When Installed

✅ **Home Screen Icon** - Just like a regular app  
✅ **Standalone Mode** - No Safari UI, full screen  
✅ **Offline Support** - Cache essential files  
✅ **Native Feel** - Smooth iOS experience  
✅ **Safe Area Support** - Respects iPhone notch/home indicator  

## Generate Custom Icons (Optional)

If you want to customize the app icon:

1. Open `http://your-server-ip:3000/generate-icons.html` in a browser
2. Right-click each canvas and save the images
3. Replace `/public/icon-192.png` and `/public/icon-512.png` on the server
4. Uninstall and reinstall the PWA to see new icons

## Troubleshooting

### Can't find "Add to Home Screen"?
- Make sure you're using Safari (not Chrome or other browsers)
- Update iOS to the latest version
- Try restarting Safari

### App icon not showing?
- Clear Safari cache
- Make sure icon files exist in `/public/` folder
- Check that manifest.json is accessible

### App not working offline?
- Visit the app while online first
- Service worker needs to cache files on first visit
- Check browser console for service worker errors

## Technical Details

**PWA Features Implemented:**
- Web App Manifest (`manifest.json`)
- Service Worker for offline caching
- iOS-specific meta tags
- Safe area insets for notch support
- Touch-optimized UI (44px minimum tap targets)
- Standalone display mode

**Cache Strategy:**
- Network-first for API calls
- Cache fallback for offline access
- Auto-cleanup of old cache versions

## Requirements

- iOS 11.3 or later (for PWA support)
- Safari browser
- Internet connection for first visit

## Notes

- Flight searches require internet connection (API calls aren't cached)
- UI and previously viewed flights work offline
- Cached flight data expires after 10 minutes
- App updates automatically when online
