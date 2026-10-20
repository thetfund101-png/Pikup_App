import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Hail',
  slug: 'hail',
  scheme: 'hail',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Hail uses your location to match you with nearby rides and share your position with passengers.',
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
  ],
  ios: {
    bundleIdentifier: 'com.example.hail',
    supportsTablet: true,
    infoPlist: { UIBackgroundModes: ['location'] },
  },
  android: {
    package: 'com.example.hail',
    // react-native-maps uses Google Maps on Android.
    config: { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY } },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  web: { bundler: 'metro', output: 'single' },
  experiments: { typedRoutes: false },
};

export default config;
