import * as Linking from 'expo-linking';

/** Ward name baked in at APK build time (one ward per build/link). */
export function getWardNameFromEnv(): string {
    return String(process.env.EXPO_PUBLIC_WARD_NAME || '').trim();
}

export function parseWardFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    try {
        const parsed = Linking.parse(url);
        const raw = parsed.queryParams?.ward;
        if (Array.isArray(raw)) return decodeURIComponent(String(raw[0] || '')).trim();
        return decodeURIComponent(String(raw || '')).trim();
    } catch {
        return '';
    }
}

export async function resolveInitialWardName(): Promise<string> {
    const fromEnv = getWardNameFromEnv();
    if (fromEnv) return fromEnv;
    try {
        const initial = await Linking.getInitialURL();
        const fromUrl = parseWardFromUrl(initial);
        if (fromUrl) return fromUrl;
    } catch {
        /* ignore */
    }
    return '';
}
