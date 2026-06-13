import "../global.css";
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { layoutStyles } from '../constants/layout';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AdminAuthProvider>
        <View style={layoutStyles.root}>
          <Stack screenOptions={{ contentStyle: layoutStyles.root }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
        </View>
      </AdminAuthProvider>
    </SafeAreaProvider>
  );
}
