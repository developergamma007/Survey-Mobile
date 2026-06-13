import * as Location from 'expo-location';

/** Best-effort location; returns null on emulator/no GPS without throwing. */
export async function resolveCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
            return null;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return null;
        }

        try {
            return await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch {
            return await Location.getLastKnownPositionAsync();
        }
    } catch {
        return null;
    }
}
