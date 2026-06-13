import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function Index() {
  const { isAdminAuthenticated, isAuthLoading } = useAdminAuth();

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return <Redirect href={isAdminAuthenticated ? '/(tabs)/profile' : '/(tabs)/home'} />;
}
