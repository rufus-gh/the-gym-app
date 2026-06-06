import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'The Gym App',
  slug: 'the-gym-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'gymapp',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.rufus.thegymapp',
    buildNumber: '1',
  },
  android: {
    package: 'com.rufus.thegymapp',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#000000',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-notifications', { icon: './assets/images/icon.png', color: '#FF3B30' }],
    ['expo-sqlite', { useSQLCipher: false }],
    ['expo-task-manager'],
    ['expo-background-fetch'],
    ['react-native-mmkv'],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'your-eas-project-id',
    },
  },
});
