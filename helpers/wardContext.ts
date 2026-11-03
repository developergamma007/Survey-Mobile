import * as Linking from 'expo-linking';

/** Ward name baked in at APK build time (one ward per build/link). */
export function getWardNameFromEnv(): string {
    return String(process.env.EXPO_PUBLIC_WARD_NAME || '').trim();
}

export function normalizeWardQueryParam(raw: string | null | undefined): string {
    let value = String(raw ?? '').trim();
    for (let i = 0; i < 3; i += 1) {
        try {
            const decoded = decodeURIComponent(value);
            if (decoded === value) break;
            value = decoded.trim();
        } catch {
            break;
        }
    }
    return value.replace(/\s+/g, ' ').trim();
}

export function parseWardFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    try {
        const parsed = Linking.parse(url);
        const raw = parsed.queryParams?.ward;
        if (Array.isArray(raw)) return normalizeWardQueryParam(String(raw[0] || ''));
        return normalizeWardQueryParam(String(raw || ''));
    } catch {
        return '';
    }
}

export function findWardByLinkedName<T extends { ward_name_en: string; assembly_no?: number | null }>(
    wards: T[],
    linkedName: string
): T | undefined {
    const target = normalizeWardQueryParam(linkedName).toLowerCase();
    if (!target) return undefined;
    return wards.find((ward) => ward.ward_name_en.trim().replace(/\s+/g, ' ').toLowerCase() === target);
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
