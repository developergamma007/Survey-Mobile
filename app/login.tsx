import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import PulseSyncLoginScreen from '../components/PulseSyncLoginScreen';

export default function Login() {
  const { refreshAdminAuth } = useAdminAuth();

  const handleLoggedIn = async () => {
    await refreshAdminAuth();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PulseSyncLoginScreen onLoggedIn={handleLoggedIn} />
    </SafeAreaView>
  );
}
