import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stratastorage.demo',
  appName: 'Strata Storage Demo',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};

export default config;
