/**
 * App Configuration
 *
 * API_URL is read from the environment variable EXPO_PUBLIC_API_URL.
 * 
 * Environment files:
 *   .env             → Development (default)
 *   .env.production  → Production
 *
 * To switch environments, Expo automatically picks up .env files.
 * For production builds, rename .env.production to .env or set
 * the variable in your CI/CD pipeline.
 *
 * NOTE: All Expo public env vars must be prefixed with EXPO_PUBLIC_
 */

const ENV = {
    development: {
        API_URL: 'http://192.168.1.70:8000',
    },
    production: {
        API_URL: 'https://your-production-server.com',
    },
};

const getEnvConfig = () => {
    if (__DEV__) {
        return ENV.development;
    }
    return ENV.production;
};

// Use the env variable if set, otherwise fall back to the environment config
export const API_URL = process.env.EXPO_PUBLIC_API_URL || getEnvConfig().API_URL;
