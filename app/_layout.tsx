import "../global.css";
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkAuth();
    }, [segments]);

    useEffect(() => {
        if (isAuthenticated === null) return;

        const inAuthGroup = segments[0] === '(tabs)';

        if (isAuthenticated && !inAuthGroup) {
            router.replace('/(tabs)/home');
        } else if (!isAuthenticated && segments[0] !== 'login') {
            // Need to handle redirection to login if not authenticated and not already on login
            router.replace('/login');
        }
    }, [isAuthenticated, segments]);

    const checkAuth = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            setIsAuthenticated(!!token);
        } catch (e) {
            setIsAuthenticated(false);
        }
    };

    if (isAuthenticated === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
}
