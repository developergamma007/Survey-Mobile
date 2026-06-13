/**
 * App Configuration
 *
 * API_URL is read from EXPO_PUBLIC_API_URL at build time.
 *
 * Local dev (.env):
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:8002        (Android emulator)
 *   EXPO_PUBLIC_API_URL=http://192.168.x.x:8002     (physical device on Wi‑Fi)
 *
 * Production APK:
 *   npm run android:apk
 *   or set EXPO_PUBLIC_API_URL=https://peoplepulse.iswot.in before building
 */

const PRODUCTION_API_URL = "https://peoplepulse.iswot.in";

const ENV = {
  development: {
    API_URL: "http://10.0.2.2:8002",
  },
  production: {
    API_URL: PRODUCTION_API_URL,
  },
};

const getEnvConfig = () => (__DEV__ ? ENV.development : ENV.production);

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || getEnvConfig().API_URL
).replace(/\/$/, "");

export const IS_PRODUCTION_API = API_URL.startsWith("https://");
