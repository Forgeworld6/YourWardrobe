import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourwardrobe.app',
  appName: 'YourWardrobe',
  webDir: 'dist',
  server: {
    // Load the live GitHub Pages app so ordinary web updates do not require a new APK.
    url: 'https://forgeworld6.github.io/YourWardrobe/',
    cleartext: false,
  },
};

export default config;
